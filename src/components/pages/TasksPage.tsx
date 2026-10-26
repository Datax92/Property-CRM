'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, DataTable, KpiCard, Tag, TopScroll, useColumnOrder } from '../Shared';
import { DateField } from '../DateField';
import { ChartBarGroups } from '../Charts';
import { PAGE_META } from '../../lib/constants';
import { Icon } from '../Icons';
import { ledgersReady, ledgerError } from '../../lib/firestore-service';
import * as M from '../../lib/re-data';

/** "2 w", "1 M": how long ago, the way the client's task list shows it. */
function ago(d: any) {
  const t = d instanceof Date ? d.getTime() : d ? new Date(d).getTime() : NaN;
  if (isNaN(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + ' m';
  if (s < 86400) return Math.floor(s / 3600) + ' h';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' d';
  if (s < 30 * 86400) return Math.floor(s / (7 * 86400)) + ' w';
  if (s < 365 * 86400) return Math.floor(s / (30 * 86400)) + ' M';
  return Math.floor(s / (365 * 86400)) + ' y';
}

const STATUS_CLASS: Record<string, string> = {
  Open: 'st-open',
  Working: 'st-working',
  'Pending Review': 'st-review',
  Completed: 'st-done',
  Cancelled: 'st-cancel',
  Overdue: 'st-overdue',
};

function StatusPill({ status }: { status: string }) {
  return <span className={`tpill ${STATUS_CLASS[status] || 'st-open'}`}>{status}</span>;
}

function PriorityPill({ p }: { p: string }) {
  return <span className={`tprio pr-${(p || 'Low').toLowerCase()}`}>{p || 'Low'}</span>;
}

const PAGE_SIZES = [20, 100, 500, 2500];

/* Searching tasks by date: a month, a year, or any two dates. A task is in the period when its
   span — from its start date to its deadline — touches it. */
const PERIODS: [string, string][] = [
  ['', 'Any time'],
  ['thisMonth', 'This month'],
  ['lastMonth', 'Last month'],
  ['month', 'Pick a month'],
  ['thisYear', 'This year'],
  ['lastYear', 'Last year'],
  ['year', 'Pick a year'],
  ['custom', 'From – to dates'],
];
function periodRange(kind: string, month: string, year: string, from: string, to: string) {
  const t = M.TODAY;
  const span = (a: Date, b: Date, label: string) => ({ start: a, end: new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59, 59), label });
  if (kind === 'thisMonth') return span(new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0), M.MONTHS[t.getMonth()] + ' ' + t.getFullYear());
  if (kind === 'lastMonth') {
    const a = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    return span(a, new Date(a.getFullYear(), a.getMonth() + 1, 0), M.MONTHS[a.getMonth()] + ' ' + a.getFullYear());
  }
  if (kind === 'month' && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    return span(new Date(y, m - 1, 1), new Date(y, m, 0), M.MONTHS[m - 1] + ' ' + y);
  }
  if (kind === 'thisYear' || kind === 'lastYear' || (kind === 'year' && +year)) {
    const y = kind === 'thisYear' ? t.getFullYear() : kind === 'lastYear' ? t.getFullYear() - 1 : +year;
    return span(new Date(y, 0, 1), new Date(y, 11, 31), String(y));
  }
  if (kind === 'custom' && from && to) return span(M.parseDate(from), M.parseDate(to), M.fmtDate(M.parseDate(from)) + ' – ' + M.fmtDate(M.parseDate(to)));
  return null;
}
const hrs = (n: number) => (n ? `${+n.toFixed(2)} h` : '—');

/** A project's status as its list shows it: how far along while open, else its status. */
function ProjectStatusPill({ p }: { p: any }) {
  if (p.status === 'Completed') return <span className="tpill st-done">Completed</span>;
  if (p.status === 'Cancelled') return <span className="tpill st-cancel">Cancelled</span>;
  if (p.pct > 0) return <span className="tpill st-progress">{Math.round(p.pct)}%</span>;
  return <span className="tpill st-open">Open</span>;
}

/** An average completion like the client's tracker shows it: up to three decimals. */
const pctLabel = (n: number) => `${+n.toFixed(3)}%`;

type Run = (fn: () => void, done?: string) => void;

const PROJECT_SORTS: Record<string, { label: string; key: (p: any) => any }> = {
  created: { label: 'Created On', key: (p) => (p.createdAt instanceof Date ? p.createdAt.getTime() : String(p.id)) },
  name: { label: 'Project Name', key: (p) => String(p.name).toLowerCase() },
  pct: { label: '% Completed', key: (p) => p.pct },
  start: { label: 'Expected Start Date', key: (p) => (p.expectedStart instanceof Date ? p.expectedStart.getTime() : 0) },
};

// ==========================================================================
// PROJECTS — a list of projects, filtered and sorted like the client's tracker
// ==========================================================================
function ProjectsView({ run, openTasks }: { run: Run; openTasks: (id: string) => void }) {
  const { openModal, openEdit } = useApp();
  const [fId, setFId] = useState('');
  const [fName, setFName] = useState('');
  const [fStatus, setFStatus] = useState('Open');
  const [fType, setFType] = useState('');
  const [fPriority, setFPriority] = useState('');
  const [sort, setSort] = useState('created');
  const [asc, setAsc] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);

  const all = M.taskProjectStats();
  const by = PROJECT_SORTS[sort];
  const rows = all
    .filter((p: any) => {
      if (fId && !String(p.id).toLowerCase().includes(fId.trim().toLowerCase())) return false;
      if (fName && !String(p.name).toLowerCase().includes(fName.trim().toLowerCase())) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (fType && p.type !== fType) return false;
      if (fPriority && p.priority !== fPriority) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      // Favourites stay on top; within them, the chosen order.
      if (!!a.liked !== !!b.liked) return a.liked ? -1 : 1;
      const x = by.key(a), y = by.key(b);
      const d = x < y ? -1 : x > y ? 1 : 0;
      return asc ? d : -d;
    });
  const active = [fId, fName, fStatus, fType, fPriority].filter(Boolean).length;
  const clear = () => {
    setFId('');
    setFName('');
    setFStatus('');
    setFType('');
    setFPriority('');
  };
  const allPicked = rows.length > 0 && rows.every((p: any) => picked.includes(p.id));
  const toggle = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  return (
    <PageShell
      title="Projects"
      u="پراجیکٹس"
      p="Groups of tasks and how far each one has got."
      tools={false}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal('taskProject')}>
          <Icon name="plus" /> Add Project
        </button>
      }
    >
      <div className="tfilters">
        <input className="f-id" value={fId} onChange={(e) => setFId(e.target.value)} placeholder="ID" aria-label="Filter by ID" />
        <input className="f-text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Project Name" aria-label="Filter by project name" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Status</option>
          {M.PROJECT_STATUSES.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Filter by project type">
          <option value="">Project Type</option>
          {M.PROJECT_TYPES.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} aria-label="Filter by priority">
          <option value="">Priority</option>
          {M.PROJECT_PRIORITIES.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="spacer" />
        <span className={`tfilter-count ${active ? 'on' : ''}`}>
          <Icon name="filter" /> {active ? `${active} ${active === 1 ? 'filter' : 'filters'}` : 'Filter'}
          {active > 0 && (
            <button type="button" onClick={clear} title="Clear all filters" aria-label="Clear all filters">
              <Icon name="x" />
            </button>
          )}
        </span>
        <span className="tsort">
          <button type="button" onClick={() => setAsc(!asc)} title={asc ? 'Ascending — click for descending' : 'Descending — click for ascending'} aria-label="Change sort direction">
            <Icon name="sort" className={`ic ${asc ? 'flip' : ''}`} />
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            {Object.keys(PROJECT_SORTS).map((k) => (
              <option key={k} value={k}>{PROJECT_SORTS[k].label}</option>
            ))}
          </select>
        </span>
      </div>

      {picked.length > 0 && (
        <div className="tbulk">
          <b>{picked.length} selected</b>
          <button type="button" className="btn sm" onClick={() => run(() => { picked.forEach((id) => M.setTaskProjectStatus(id, 'Completed')); setPicked([]); }, 'Marked as completed')}>
            <Icon name="ok" /> Mark completed
          </button>
          {confirm === 'bulk' ? (
            <span className="task-confirm">
              Delete {picked.length} {picked.length === 1 ? 'project' : 'projects'}? Their tasks are kept.
              <button type="button" className="btn sm bad" onClick={() => run(() => { picked.forEach((id) => M.deleteTaskProject(id)); setPicked([]); setConfirm(null); }, 'Deleted')}>
                Yes, delete
              </button>
              <button type="button" className="btn sm" onClick={() => setConfirm(null)}>No</button>
            </span>
          ) : (
            <button type="button" className="btn sm" onClick={() => setConfirm('bulk')}>
              <Icon name="trash" /> Delete
            </button>
          )}
          <button type="button" className="btn sm gh" onClick={() => setPicked([])}>Unselect</button>
        </div>
      )}

      <div className="tlist">
        <table className="ttable plist">
          <thead>
            <tr>
              <th className="chk">
                <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : rows.map((p: any) => p.id))} aria-label="Select all" />
              </th>
              <th>Project Name</th>
              <th>Status</th>
              <th>Project Type</th>
              <th className="wide">% Completed</th>
              <th>Expected Start Date</th>
              <th className="r meta">{all.length ? `${rows.length} of ${all.length}` : ''}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="tnone">
                  {all.length === 0 ? (
                    <>No projects yet — add one, for example “Personal”, “A&amp;Sons Work” or “Property Business”.</>
                  ) : (
                    <>
                      No project matches these filters.{' '}
                      <button type="button" className="linkbtn" onClick={clear}>Clear filters</button>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((p: any) => (
                <tr key={p.id} className={picked.includes(p.id) ? 'on' : ''}>
                  <td className="chk">
                    <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                  </td>
                  <td>
                    <button type="button" className={`tname ${p.overdue ? '' : 'calm'}`} onClick={() => openTasks(p.id)} title="Show this project's tasks">
                      {p.name}
                    </button>
                  </td>
                  <td><ProjectStatusPill p={p} /></td>
                  <td className="muted">{p.type || ''}</td>
                  <td>
                    <div className="pbar" title={`${p.completed} of ${p.total} tasks completed`}>
                      <div className="tbar"><i style={{ width: `${p.pct}%` }} /></div>
                      <span>{p.total ? `${p.completed}/${p.total}` : '—'}</span>
                    </div>
                  </td>
                  <td className="muted mono">{p.expectedStart ? M.fmtDate(p.expectedStart) : ''}</td>
                  <td className="r meta">
                    {confirm === p.id ? (
                      <span className="task-confirm">
                        Delete project? Its tasks are kept.
                        <button type="button" className="btn sm bad" onClick={() => run(() => { M.deleteTaskProject(p.id); setConfirm(null); }, 'Project deleted')}>
                          Yes, delete
                        </button>
                        <button type="button" className="btn sm" onClick={() => setConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <span className="rowmeta">
                        <span className="rowtools">
                          <button type="button" className="iconbtn" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => openEdit('taskProjects', p.id)}>
                            <Icon name="edit" />
                          </button>
                          <button type="button" className="iconbtn" title="Delete" aria-label={`Delete ${p.name}`} onClick={() => setConfirm(p.id)}>
                            <Icon name="trash" />
                          </button>
                        </span>
                        <span className="ago" title={p.createdAt ? 'Created ' + M.fmtDate(p.createdAt) : ''}>{ago(p.createdAt)}</span>
                        <span className={`pnote ${p.notes ? 'on' : ''}`} title={p.notes || 'No notes'}>
                          <Icon name="comment" /> {p.notes ? 1 : 0}
                        </span>
                        <button
                          type="button"
                          className={`plike ${p.liked ? 'on' : ''}`}
                          aria-pressed={!!p.liked}
                          title={p.liked ? 'Favourite — kept at the top. Click to unpin.' : 'Mark as favourite to keep it at the top'}
                          onClick={() => run(() => M.toggleTaskProjectLike(p.id))}
                        >
                          <Icon name="heart" />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

// ==========================================================================
// SUMMARY — completion, totals and a bar per project
// ==========================================================================
function SummaryView({ openTasks }: { openTasks: (id: string) => void }) {
  const { showTip, hideTip } = useApp();
  const [showFilters, setShowFilters] = useState(false);
  const [fStatus, setFStatus] = useState('Open');
  const [fType, setFType] = useState('');
  const [fWho, setFWho] = useState('');

  // Picking a person counts only their tasks, and leaves out projects with none of theirs.
  const projects = M.taskProjectStats(fWho).filter(
    (p: any) => (!fStatus || p.status === fStatus) && (!fType || p.type === fType) && (!fWho || p.total > 0)
  );
  // Tasks outside any project still count, under "No project", while no project type is picked.
  const loose = M.looseTaskStats(fWho);
  const bars = loose.total && !fType ? [...projects, { id: '', name: 'No project', ...loose, loose: true }] : projects;

  const total = bars.reduce((a: number, p: any) => a + p.total, 0);
  const completed = bars.reduce((a: number, p: any) => a + p.completed, 0);
  const overdue = bars.reduce((a: number, p: any) => a + p.overdue, 0);
  // Averaged over every bar on the chart, so tasks with no project count too.
  const avg = bars.length ? bars.reduce((a: number, p: any) => a + p.pct, 0) / bars.length : 0;
  const avgTone = avg >= 80 ? 'c-done' : avg >= 50 ? 'c-mid' : 'c-avg';

  const max = Math.max(1, ...bars.map((p: any) => p.total));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 50 ? 10 : Math.ceil(max / 50) * 10;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const filtered = fStatus !== 'Open' || !!fType || !!fWho;

  const tip = (e: React.MouseEvent, p: any) =>
    showTip(
      `<b>${p.name}</b><br>Total tasks: ${p.total}<br>Completed: ${p.completed} (${Math.round(p.pct)}%)<br>Overdue: ${p.overdue}<br>Still open: ${p.open}` +
        (p.loose ? '' : '<br><i>Click to see its tasks</i>'),
      e.clientX,
      e.clientY
    );

  return (
    <PageShell title="Project summary" u="خلاصہ" p="Completion, overdue work and tasks per project." tools={false}>
      <div className="panel tsum">
        <div className="panel-h">
          <h3>Project Summary</h3>
          {filtered && (
            <span className="sub">
              {[fStatus ? fStatus + ' projects' : 'All projects', fType, fWho ? 'assigned to ' + fWho : ''].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className="spacer" />
          <button
            type="button"
            className={`iconbtn ${showFilters || filtered ? 'on' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filter the summary"
            aria-label="Filter the summary"
            aria-expanded={showFilters}
          >
            <Icon name="filter" />
          </button>
        </div>
        {showFilters && (
          <div className="tfilters tsum-filters">
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Project status">
              <option value="">All statuses</option>
              {M.PROJECT_STATUSES.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Project type">
              <option value="">All project types</option>
              {M.PROJECT_TYPES.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={fWho} onChange={(e) => setFWho(e.target.value)} aria-label="Assigned to">
              <option value="">Everyone</option>
              {M.taskAssignees().map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {filtered && (
              <button type="button" className="btn sm" onClick={() => { setFStatus('Open'); setFType(''); setFWho(''); }}>
                Reset
              </button>
            )}
          </div>
        )}
        <div className="panel-b">
          <div className="tsum-kpis">
            <div>
              <span>Average Completion</span>
              <b className={avgTone}>{pctLabel(avg)}</b>
            </div>
            <div>
              <span>Total Tasks</span>
              <b className="c-total">{total}</b>
            </div>
            <div>
              <span>Completed Tasks</span>
              <b className="c-done">{completed}</b>
            </div>
            <div>
              <span>Overdue Tasks</span>
              <b className={overdue ? 'c-over' : 'c-done'}>{overdue}</b>
            </div>
            <div>
              <span>Success Ratio</span>
              <b className={total && completed / total >= 0.8 ? 'c-done' : total && completed / total >= 0.5 ? 'c-mid' : 'c-avg'}>
                {total ? `${Math.round((completed / total) * 100)}%` : '—'}
              </b>
            </div>
          </div>

          {bars.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center' }}>
              {filtered ? 'No project matches this filter.' : 'Add projects and tasks to see them here.'}
            </p>
          ) : (
            <>
              <div className="tchart" role="img" aria-label="Tasks per project: total, completed and overdue">
                <div className="tchart-y">
                  {ticks.map((v) => (
                    <span key={v} style={{ bottom: `${(v / top) * 100}%` }}>
                      {v}
                    </span>
                  ))}
                </div>
                <div className="tchart-plot">
                  {ticks.map((v) => (
                    <i key={v} className="tchart-grid" style={{ bottom: `${(v / top) * 100}%` }} />
                  ))}
                  {bars.map((p: any, i: number) => (
                    <button
                      type="button"
                      key={p.id || 'loose'}
                      className={`tchart-col ${p.loose ? 'loose' : ''}`}
                      onMouseMove={(e) => tip(e, p)}
                      onMouseLeave={hideTip}
                      onClick={() => !p.loose && openTasks(p.id)}
                      aria-label={`${p.name}: ${p.total} tasks, ${p.completed} completed, ${p.overdue} overdue`}
                    >
                      {/* The whole bar is the project's tasks; completed and overdue sit inside it. */}
                      <span className="tchart-bar" style={{ height: `${(p.total / top) * 100}%`, animationDelay: `${i * 60}ms` }}>
                        {p.total > 0 && <em className="tchart-val">{p.total}</em>}
                        <span className="tchart-fill">
                          {p.overdue > 0 && <i className="seg-over" style={{ height: `${(p.overdue / p.total) * 100}%`, bottom: `${(p.completed / p.total) * 100}%` }} />}
                          {p.completed > 0 && <i className="seg-done" style={{ height: `${(p.completed / p.total) * 100}%` }} />}
                        </span>
                      </span>
                      <span className="tchart-x" title={p.name}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="tchart-legend">
                <span><i className="seg-over" /> Overdue</span>
                <span><i className="seg-done" /> Completed</span>
                <span><i className="seg-total" /> Still open</span>
                <span className="muted">The number on each bar is its total tasks.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ==========================================================================
// PROJECT PLANS — the future income and cost planned for each project
// ==========================================================================
function PlansView() {
  const { openModal, numbers } = useApp();
  const [pick, setPick] = useState('');
  // The graph month by month, or one group of bars for each project.
  const [chartBy, setChartBy] = useState<'date' | 'project'>('date');
  const meta = PAGE_META['tasks/plans'];
  const money = (n: number) => M.fmt(n, numbers);
  const pct = (n: number) => (isFinite(n) ? `${n.toFixed(1)}%` : '—');

  const stats = M.projectPlanStats();
  const shown = pick ? stats.filter((x: any) => x.id === pick) : stats;
  const sum = (k: string) => shown.reduce((a: number, x: any) => a + (x[k] || 0), 0);
  const entries = M.DATA.projectPlans.filter((x: any) => !pick || (pick === '-' ? !x.projectId : x.projectId === pick));
  const months = M.planMonths(pick && pick !== '-' ? pick : '');
  const preset = (kind: string) => (pick && pick !== '-' ? { projectId: pick, kind } : { kind });
  // Planned income less planned cost: a surplus when above nil, a deficit below it.
  const surplusWord = (n: number) => (n >= 0 ? 'surplus' : 'deficit');
  const byProject = shown.map((x: any) => ({ label: x.project, full: x.project, income: x.income, cost: x.cost, net: x.profit }));
  const chartRows = chartBy === 'date' ? months : byProject;

  const projCols = [
    {
      key: 'project',
      label: 'Project',
      render: (x: any) => (
        <button type="button" className="linkbtn" onClick={() => setPick(x.id)} title="Show only this project">
          <b>{x.project}</b>
        </button>
      ),
    },
    { key: 'status', label: 'Status', render: (x: any) => (x.status ? <Tag text={x.status} /> : '') },
    { key: 'income', label: 'Planned income', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => <span className="pos">{money(x.income)}</span> },
    { key: 'cost', label: 'Planned cost', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => money(x.cost) },
    {
      key: 'profit',
      label: 'Planned surplus / deficit',
      a: 'r' as const,
      sum: true,
      cls: 'mono',
      render: (x: any) => (
        <b className={x.profit >= 0 ? 'pos' : 'neg'} title={`Planned ${surplusWord(x.profit)}`}>
          {money(x.profit)}
        </b>
      ),
    },
    { key: 'margin', label: 'Surplus %', a: 'r' as const, cls: 'mono', render: (x: any) => (x.income ? pct(x.margin) : '—') },
    { key: 'actualIncome', label: 'Actual in', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => money(x.actualIncome) },
    { key: 'actualCost', label: 'Actual out', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => money(x.actualCost) },
    {
      key: 'actualProfit',
      label: 'Actual surplus / deficit',
      a: 'r' as const,
      sum: true,
      cls: 'mono',
      render: (x: any) => (
        <span className={x.actualProfit >= 0 ? 'pos' : 'neg'} title={`Actual ${surplusWord(x.actualProfit)}`}>
          {money(x.actualProfit)}
        </span>
      ),
    },
    {
      key: 'next',
      label: 'Next planned',
      render: (x: any) =>
        x.next ? (
          <span title={x.next.description || x.next.category}>
            {M.fmtDate(x.next.date)} · {x.next.kind === 'Income' ? '+' : '−'}
            {money(x.next.amount)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'add',
      label: '',
      render: (x: any) =>
        x.projectId ? (
          <button type="button" className="btn sm" onClick={() => openModal('plan', { projectId: x.projectId })}>
            <Icon name="plus" size={12} /> Add
          </button>
        ) : null,
    },
  ];

  const entryCols = [
    { key: 'id', label: 'Ref' },
    { key: 'project', label: 'Project', render: (x: any) => (x.projectId ? x.project : <span className="muted">{x.project || '—'} (no project)</span>) },
    { key: 'kind', label: 'Income / cost', render: (x: any) => <span className={`tag ${x.kind === 'Income' ? 'ok' : 'warn'}`}>{x.kind}</span> },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'task', label: 'Task', render: (x: any) => (x.taskId ? <span title={x.task}>{x.taskId}</span> : '—') },
    { key: 'date', label: 'Expected', cls: 'mono', render: (x: any) => (x.date ? M.fmtDate(x.date) : '—') },
    { key: 'amount', label: 'Planned', a: 'r' as const, cls: 'mono', render: (x: any) => <b>{money(x.amount)}</b> },
    { key: 'actual', label: 'Actual so far', a: 'r' as const, cls: 'mono', render: (x: any) => money(x.actual || 0) },
    {
      key: 'left',
      label: 'Still to come',
      a: 'r' as const,
      cls: 'mono',
      render: (x: any) => (x.status === 'Planned' ? money(Math.max(0, x.amount - (x.actual || 0))) : '—'),
    },
    { key: 'status', label: 'Status', render: (x: any) => <Tag text={x.status === 'Done' ? 'Completed' : x.status} /> },
  ];

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      toolProps={{ filters: false, period: false }}
      acts={
        <>
          <button type="button" className="btn" onClick={() => openModal('plan', preset('Income'))}>
            <Icon name="plus" /> Planned income
          </button>
          <button type="button" className="btn pri" onClick={() => openModal('plan', preset('Cost'))}>
            <Icon name="plus" /> Planned cost
          </button>
        </>
      }
    >
      <div className="toolrow" data-noprint="1">
        <select className="fldsel" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Project">
          <option value="">All projects</option>
          {M.DATA.taskProjects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          {stats.some((x: any) => x.id === '-') && <option value="-">No project</option>}
        </select>
        {pick && (
          <button type="button" className="btn sm" onClick={() => setPick('')}>
            <Icon name="x" size={12} /> All projects
          </button>
        )}
      </div>

      <div className="kpis">
        <KpiCard k="Planned income" v={sum('income')} tone="pos" f="expected to come in" />
        <KpiCard k="Planned cost" v={sum('cost')} f="expected to go out" />
        <KpiCard
          k={sum('profit') >= 0 ? 'Planned surplus' : 'Planned deficit'}
          v={sum('profit')}
          tone={sum('profit') >= 0 ? 'pos' : 'neg'}
          cls="lead"
          f={
            sum('income')
              ? `${pct(M.pctOf(sum('profit'), sum('income')))} of planned income`
              : sum('cost')
                ? 'planned cost with no planned income'
                : undefined
          }
        />
        <KpiCard k="Actual in so far" v={sum('actualIncome')} f={`of ${money(sum('income'))} planned`} />
        <KpiCard k="Actual out so far" v={sum('actualCost')} f={`of ${money(sum('cost'))} planned`} />
      </div>

      {stats.length === 0 ? (
        <div className="empty">
          <Icon name="empty" />
          <h3>No project plans yet</h3>
          <p>
            Add the income a project is expected to bring in and the costs it is expected to have, with the month each is due. The
            plan worth and plan cost typed on a project’s tasks count here too.
          </p>
        </div>
      ) : (
        <>
          <DataTable cols={projCols} rows={shown} totals={true} />
          <div className="panel" style={{ margin: '14px 0' }}>
            <div className="panel-h">
              <h3>{chartBy === 'date' ? 'Planned month by month' : 'Planned by project'}</h3>
              <span className="sub">
                {pick ? (stats.find((x: any) => x.id === pick) || { project: '' }).project : 'all projects'} · income against cost, and the
                surplus or deficit
              </span>
              <span className="spacer" />
              <span className="seg" data-noprint="1" role="group" aria-label="Show the graph">
                <button type="button" aria-pressed={chartBy === 'date'} onClick={() => setChartBy('date')}>
                  By date
                </button>
                <button type="button" aria-pressed={chartBy === 'project'} onClick={() => setChartBy('project')}>
                  By project
                </button>
              </span>
            </div>
            <div className="panel-b">
              {chartRows.length ? (
                <ChartBarGroups
                  rows={chartRows}
                  values
                  series={[
                    { key: 'income', label: 'Planned income', c: 'var(--good)' },
                    { key: 'cost', label: 'Planned cost', c: 'var(--s2)' },
                    { key: 'net', label: 'Surplus / deficit', c: 'var(--brand)', hollow: true },
                  ]}
                  label={chartBy === 'date' ? 'Planned income, cost and surplus or deficit by month' : 'Planned income, cost and surplus or deficit by project'}
                  width={1500}
                  low
                />
              ) : (
                <div className="empty" style={{ padding: '20px' }}>
                  No plan line has an expected date yet, so there is nothing to show month by month. Give each line the date it is
                  expected, or see the graph by project.
                </div>
              )}
            </div>
          </div>
          <div className="sech">
            <h2>Plan entries</h2>
            <span className="sub">each line of income or cost planned</span>
          </div>
          {entries.length ? (
            <DataTable cols={entryCols} rows={entries} attach="projectPlans" />
          ) : (
            <div className="empty" style={{ padding: '20px' }}>
              No plan entries {pick ? 'for this project ' : ''}yet — only the plan worth and cost typed on its tasks.
            </div>
          )}
        </>
      )}
      <div className="note calm" style={{ marginTop: '14px' }}>
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          A plan is what is expected, not what has happened: it moves no money and is not in profit &amp; loss or the bank accounts.
          Record the money itself as income or an expense when it comes in or goes out, and note what has come in or gone out so far
          against each plan line. The plan worth and plan cost typed on a project’s tasks count in its planned income and cost.
        </div>
      </div>
    </PageShell>
  );
}

/** Tasks: a list of tasks, the projects they belong to, and a summary of both. */
/** The columns of the task list, each of which can be dragged to another place. */
type TaskCol = { key: string; th: React.ReactNode; thCls?: string; thTitle?: string; td: (t: any, st: string) => React.ReactNode };
const TASK_COLS: TaskCol[] = [
  { key: 'ref', th: 'Task ref', td: (t) => <td key="ref" className="mono muted nowrap">{t.id}</td> },
  { key: 'subject', th: 'Subject', thCls: 'wide', td: () => null },
  { key: 'start', th: 'Start date', td: (t) => <td key="start" className="mono muted nowrap">{t.startDate ? M.fmtDate(t.startDate) : ''}</td> },
  {
    key: 'deadline',
    th: 'Deadline',
    td: (t, st) => (
      <td key="deadline" className={`mono nowrap ${st === 'Overdue' ? 'neg' : 'muted'}`}>
        {t.date ? M.fmtDate(t.date) : ''}
        {t.date && st !== 'Completed' && st !== 'Cancelled' && <span className={`tdue ${st === 'Overdue' ? 'late' : ''}`}>{M.dueIn(t.date)}</span>}
      </td>
    ),
  },
  { key: 'done', th: 'Completed on', td: (t, st) => <td key="done" className="mono nowrap">{st === 'Completed' && t.doneAt ? M.fmtDate(t.doneAt) : ''}</td> },
  {
    key: 'days',
    th: 'Days',
    thCls: 'r',
    thTitle: 'Days from the start date to the day it was completed, or to today while it is still open',
    td: (t, st) => {
      const days = M.taskDays(t);
      return (
        <td
          key="days"
          className={`r mono nowrap ${st === 'Completed' ? '' : 'muted'}`}
          title={days == null ? '' : st === 'Completed' ? `Took ${days} ${days === 1 ? 'day' : 'days'}` : `${days} ${days === 1 ? 'day' : 'days'} so far`}
        >
          {days == null ? '' : M.fmtNum(days)}
        </td>
      );
    },
  },
  { key: 'project', th: 'Project', td: (t) => <td key="project" className="tproj">{t.project || ''}</td> },
  {
    key: 'projectStatus',
    th: 'Project status',
    td: (t) => {
      const proj = t.projectId ? M.DATA.taskProjects.find((p: any) => p.id === t.projectId) : null;
      return (
        <td key="projectStatus">
          {proj ? <span className={`tpill ${proj.status === 'Completed' ? 'st-done' : proj.status === 'Cancelled' ? 'st-cancel' : 'st-open'}`}>{proj.status || 'Open'}</span> : ''}
        </td>
      );
    },
  },
  { key: 'status', th: 'Status', td: (t, st) => <td key="status"><StatusPill status={st} /></td> },
  { key: 'priority', th: 'Priority', td: (t) => <td key="priority"><PriorityPill p={t.priority} /></td> },
  { key: 'assignee', th: 'Assigned to', td: (t) => <td key="assignee" className="tproj">{t.assignee || ''}</td> },
  { key: 'planned', th: 'Planned work', thCls: 'r', td: (t) => <td key="planned" className="r mono">{hrs(t.plannedHours || 0)}</td> },
  { key: 'worth', th: 'Plan worth', thCls: 'r', td: (t) => <td key="worth" className="r mono">{t.planWorth ? M.fmt(t.planWorth, 'full') : '—'}</td> },
  { key: 'cost', th: 'Plan cost', thCls: 'r', td: (t) => <td key="cost" className="r mono">{t.planCost ? M.fmt(t.planCost, 'full') : '—'}</td> },
  { key: 'spent', th: 'Time spent', thCls: 'r', td: (t) => <td key="spent" className="r mono">{hrs(t.timeSpent || 0)}</td> },
  {
    key: 'progress',
    th: 'Task progress',
    thCls: 'wide',
    td: (t) => {
      const prog = M.taskProgress(t);
      return (
        <td key="progress">
          <div className="pbar" title={`${prog}% done`}>
            <div className="tbar"><i style={{ width: `${prog}%` }} /></div>
            <span>{prog}%</span>
          </div>
        </td>
      );
    },
  },
];

export function TasksPage() {
  const { tab, toast, refreshData, openModal, openEdit, goto, exportCsv, exportXls, print } = useApp();

  // Filters live here so "Tasks" from a project row lands on that project's tasks.
  const [fId, setFId] = useState('');
  const [fText, setFText] = useState('');
  const [fProject, setFProject] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPriority, setFPriority] = useState('');
  const [fWho, setFWho] = useState('');
  const [newest, setNewest] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [shown, setShown] = useState(20);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [quick, setQuick] = useState('');
  const [fPeriod, setFPeriod] = useState('');
  const [fMonth, setFMonth] = useState(() => M.dateInput(M.TODAY).slice(0, 7));
  const [fYear, setFYear] = useState(String(M.TODAY.getFullYear()));
  const [fFrom, setFFrom] = useState(() => M.TODAY.getFullYear() + '-01-01');
  const [fTo, setFTo] = useState(() => M.dateInput(M.TODAY));
  // The task list's columns, in the order they have been dragged into.
  const { cols: taskCols, moved, headProps, reset: resetCols } = useColumnOrder('tasks/list', TASK_COLS);

  // Every change is refused while the database is unreachable, so nothing vanishes on reload.
  const run = (fn: () => void, done?: string) => {
    if (!ledgersReady()) return toast('Your records are still loading — please try again in a moment');
    if (ledgerError()) return toast('Not saved — the database is not reachable');
    try {
      fn();
      refreshData();
      if (done) toast(done);
    } catch (err: any) {
      toast(String(err && err.message ? err.message : err));
    }
  };

  // Opening a project's tasks lands on the task list, filtered to that project.
  const openTasks = (projectId: string) => {
    setFProject(projectId);
    setShown(pageSize);
    goto('tasks/list');
  };

  if (tab === 'projects') return <ProjectsView run={run} openTasks={openTasks} />;
  if (tab === 'plans') return <PlansView />;
  if (tab === 'summary') return <SummaryView openTasks={openTasks} />;

  // ========================================================================
  // TASK LIST
  // ========================================================================
  const q = fText.trim().toLowerCase();
  const pr = periodRange(fPeriod, fMonth, fYear, fFrom, fTo);
  const rows = M.DATA.tasks
    .filter((t: any) => {
      const st = M.taskStatus(t);
      if (fId && !String(t.id).toLowerCase().includes(fId.trim().toLowerCase())) return false;
      if (q && !String(t.text).toLowerCase().includes(q)) return false;
      if (fProject === '-' ? !!t.projectId : fProject && t.projectId !== fProject) return false;
      if (fStatus && st !== fStatus) return false;
      if (fPriority && (t.priority || 'Low') !== fPriority) return false;
      if (fWho && (t.assignee || '') !== fWho) return false;
      if (pr && !M.taskInRange(t, pr)) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const d = String(a.id).localeCompare(String(b.id));
      return newest ? -d : d;
    });
  const visible = rows.slice(0, shown);
  const filtered = !!(fId || fText || fProject || fStatus || fPriority || fWho || fPeriod);
  const totals = M.taskTotals(rows);
  const years: number[] = [];
  for (let y = M.TODAY.getFullYear() + 1; y >= M.TODAY.getFullYear() - 5; y--) years.push(y);

  // The next thing to do: overdue work first, then the nearest deadline.
  const pending = M.DATA.tasks
    .filter((t: any) => ['Completed', 'Cancelled'].indexOf(M.taskStatus(t)) < 0 && t.date instanceof Date)
    .sort((a: any, b: any) => a.date - b.date);
  const overdueTasks = pending.filter((t: any) => M.taskStatus(t) === 'Overdue');
  const nextTask = pending.find((t: any) => M.taskStatus(t) !== 'Overdue');
  const whoText = (t: any) => [t.assignee, t.project].filter(Boolean).join(' · ');
  const allPicked = visible.length > 0 && visible.every((t: any) => picked.includes(t.id));

  const clear = () => {
    setFId('');
    setFText('');
    setFProject('');
    setFStatus('');
    setFPriority('');
    setFWho('');
    setFPeriod('');
  };
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const addQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick.trim()) return toast('Write the task first');
    run(() => {
      M.addTask({ text: quick, projectId: fProject && fProject !== '-' ? fProject : '', status: 'Open', priority: 'Low' });
      setQuick('');
    }, 'Task added');
  };

  return (
    <PageShell
      title="Tasks"
      u="کام"
      p="Everything that needs doing, by project, status and priority."
      tools={false}
      acts={
        <button
          type="button"
          className="btn pri"
          onClick={() => openModal('task', fProject && fProject !== '-' ? { projectId: fProject } : undefined)}
        >
          <Icon name="plus" /> Add Task
        </button>
      }
    >
      {overdueTasks.length > 0 && (
        <div className="note bad tnext" data-noprint="1">
          <span className="ic"><Icon name="warn" /></span>
          <div>
            <b>
              {overdueTasks.length} {overdueTasks.length === 1 ? 'task is' : 'tasks are'} past the deadline.
            </b>{' '}
            Oldest:{' '}
            <button type="button" className="linkbtn" onClick={() => openEdit('tasks', overdueTasks[0].id)}>
              {overdueTasks[0].text}
            </button>{' '}
            — due {M.fmtDate(overdueTasks[0].date)}, {M.dueIn(overdueTasks[0].date)}
            {whoText(overdueTasks[0]) ? ` · ${whoText(overdueTasks[0])}` : ''}
            {overdueTasks.length > 1 && (
              <>
                {' '}
                <button type="button" className="linkbtn" onClick={() => setFStatus('Overdue')}>
                  Show all overdue
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {nextTask && (
        <div className="note calm tnext" data-noprint="1">
          <span className="ic"><Icon name="info" /></span>
          <div>
            <b>Next activity:</b>{' '}
            <button type="button" className="linkbtn" onClick={() => openEdit('tasks', nextTask.id)}>
              {nextTask.text}
            </button>{' '}
            — due {M.fmtDate(nextTask.date)} ({M.dueIn(nextTask.date)})
            {whoText(nextTask) ? ` · ${whoText(nextTask)}` : ''}
          </div>
        </div>
      )}

      <form className="tquick" onSubmit={addQuick}>
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Quick add: write a task and press Enter…" aria-label="Quick add a task" />
        <button type="submit" className="btn pri">
          <Icon name="plus" /> Add
        </button>
      </form>

      <div className="tfilters">
        <input className="f-id" value={fId} onChange={(e) => setFId(e.target.value)} placeholder="ID" aria-label="Filter by ID" />
        <input className="f-text" value={fText} onChange={(e) => setFText(e.target.value)} placeholder="Subject" aria-label="Filter by subject" />
        <select value={fProject} onChange={(e) => setFProject(e.target.value)} aria-label="Filter by project">
          <option value="">Project</option>
          {M.DATA.taskProjects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="-">— No project —</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Status</option>
          {[...M.TASK_STATUSES, 'Overdue'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} aria-label="Filter by priority">
          <option value="">Priority</option>
          {M.TASK_PRIORITIES.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={fWho} onChange={(e) => setFWho(e.target.value)} aria-label="Filter by who it is assigned to">
          <option value="">Assigned to</option>
          {M.taskAssignees().map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={fPeriod} onChange={(e) => setFPeriod(e.target.value)} aria-label="Search by date" title="Tasks whose start date to deadline falls in this period">
          {PERIODS.map(([k, l]) => (
            <option key={k} value={k}>{k ? l : 'Date: any time'}</option>
          ))}
        </select>
        {fPeriod === 'month' && <input type="month" value={fMonth} onChange={(e) => setFMonth(e.target.value)} aria-label="Month" />}
        {fPeriod === 'year' && (
          <select value={fYear} onChange={(e) => setFYear(e.target.value)} aria-label="Year">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
        {fPeriod === 'custom' && (
          <>
            <DateField className="sm" value={fFrom} onChange={setFFrom} label="From date" />
            <span className="muted">to</span>
            <DateField className="sm" value={fTo} onChange={setFTo} label="To date" />
          </>
        )}
        <span className="spacer" />
        <button type="button" className="btn sm" onClick={exportCsv} title="Download these tasks as a spreadsheet (CSV)">
          <Icon name="down" /> CSV
        </button>
        <button type="button" className="btn sm" onClick={exportXls} title="Download these tasks for Excel">
          <Icon name="down" /> Excel
        </button>
        <button type="button" className="btn sm" onClick={print} title="Print or save as PDF">
          <Icon name="print" /> PDF
        </button>
        {filtered && (
          <button type="button" className="btn sm" onClick={clear} title="Clear all filters">
            <Icon name="x" /> Clear
          </button>
        )}
        <button type="button" className="btn sm" onClick={() => setNewest(!newest)} title="Change the order">
          Created On {newest ? '↓' : '↑'}
        </button>
      </div>

      <div className="ttotals">
        <div className="tt-main">
          <div>
            <span>Total No. of Tasks</span>
            <b className="c-total">{totals.total}</b>
          </div>
          <div>
            <span>Achieved Tasks</span>
            <b className="c-done">{totals.achieved}</b>
          </div>
          <div>
            <span>Success Ratio</span>
            <b className={totals.ratio >= 80 ? 'c-done' : totals.ratio >= 50 ? 'c-mid' : 'c-avg'}>{totals.total ? `${Math.round(totals.ratio)}%` : '—'}</b>
          </div>
        </div>
        <div className="tt-side">
          <span>{pr ? pr.label : 'All dates'}{totals.overdue ? ` · ${totals.overdue} overdue` : ''}</span>
          <span>Planned {hrs(totals.plannedHours)} · spent {hrs(totals.timeSpent)}</span>
          <span>Plan worth {M.fmt(totals.planWorth, 'full')} · plan cost {M.fmt(totals.planCost, 'full')}</span>
        </div>
      </div>

      {picked.length > 0 && (
        <div className="tbulk">
          <b>{picked.length} selected</b>
          <button type="button" className="btn sm" onClick={() => run(() => { picked.forEach((id) => M.updateTask(id, { done: true })); setPicked([]); }, 'Marked as completed')}>
            <Icon name="ok" /> Mark completed
          </button>
          {confirm === 'bulk' ? (
            <span className="task-confirm">
              Delete {picked.length} {picked.length === 1 ? 'task' : 'tasks'}?
              <button type="button" className="btn sm bad" onClick={() => run(() => { picked.forEach((id) => M.deleteTask(id)); setPicked([]); setConfirm(null); }, 'Deleted')}>
                Yes, delete
              </button>
              <button type="button" className="btn sm" onClick={() => setConfirm(null)}>No</button>
            </span>
          ) : (
            <button type="button" className="btn sm" onClick={() => setConfirm('bulk')}>
              <Icon name="trash" /> Delete
            </button>
          )}
          <button type="button" className="btn sm gh" onClick={() => setPicked([])}>Unselect</button>
        </div>
      )}

      {moved && (
        <div className="tmoved" data-noprint="1">
          <button type="button" className="link" onClick={resetCols} title="Put the columns back in their first order">
            Reset column order
          </button>
        </div>
      )}
      <TopScroll className="tlist">
        <table className="ttable tgrid" data-export="1">
          <thead>
            <tr>
              <th className="chk" data-noexport="1">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? [] : visible.map((t: any) => t.id))}
                  aria-label="Select all"
                />
              </th>
              {taskCols.map((c) => (
                <th key={c.key} {...headProps(c.key, c.thCls)} title={c.thTitle || 'Drag to move this column'}>
                  {c.th}
                </th>
              ))}
              <th className="r" data-noexport="1">
                {rows.length ? `${Math.min(shown, rows.length)} of ${rows.length}` : ''}
              </th>
              <th data-noexport="1" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={19} className="tnone">
                  {filtered ? 'No task matches these filters.' : 'No tasks yet — write one above and press Enter.'}
                </td>
              </tr>
            ) : (
              visible.map((t: any) => {
                const st = M.taskStatus(t);
                return (
                  <tr key={t.id} className={picked.includes(t.id) ? 'on' : ''}>
                    <td className="chk" data-noexport="1">
                      <input type="checkbox" checked={picked.includes(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.text}`} />
                    </td>
                    {taskCols.map((c) =>
                      c.key === 'subject' ? (
                        <td key="subject" className="tsubj">
                          <button type="button" className={`tname ${st === 'Completed' ? 'done' : ''}`} onClick={() => openEdit('tasks', t.id)} title="Open to edit">
                            {t.text}
                          </button>
                        </td>
                      ) : (
                        c.td(t, st)
                      )
                    )}
                    <td className="r muted" data-noexport="1" title={t.createdAt ? 'Created ' + M.fmtDate(t.createdAt) : ''}>{ago(t.createdAt)}</td>
                    <td className="r nowrap" data-noexport="1">
                      {confirm === t.id ? (
                        <span className="task-confirm">
                          Delete?
                          <button type="button" className="btn sm bad" onClick={() => run(() => { M.deleteTask(t.id); setConfirm(null); }, 'Task deleted')}>Yes</button>
                          <button type="button" className="btn sm" onClick={() => setConfirm(null)}>No</button>
                        </span>
                      ) : (
                        <span className="rowtools">
                          {st !== 'Completed' && (
                            <button type="button" className="iconbtn" title="Mark as completed" aria-label="Mark as completed" onClick={() => run(() => M.updateTask(t.id, { done: true }), 'Completed')}>
                              <Icon name="ok" />
                            </button>
                          )}
                          <button type="button" className="iconbtn" title="Edit" aria-label="Edit task" onClick={() => openEdit('tasks', t.id)}>
                            <Icon name="edit" />
                          </button>
                          <button type="button" className="iconbtn" title="Delete" aria-label="Delete task" onClick={() => setConfirm(t.id)}>
                            <Icon name="trash" />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="tfoot">
          <span className="seg" role="group" aria-label="Rows per page">
            {PAGE_SIZES.map((n) => (
              <button key={n} type="button" aria-pressed={pageSize === n} onClick={() => { setPageSize(n); setShown(n); }}>
                {n}
              </button>
            ))}
          </span>
          <span className="spacer" />
          {shown < rows.length && (
            <button type="button" className="btn" onClick={() => setShown(shown + pageSize)}>
              Load More
            </button>
          )}
        </div>
      </TopScroll>
    </PageShell>
  );
}
