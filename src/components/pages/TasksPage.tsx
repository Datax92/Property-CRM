'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell } from '../Shared';
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

  const projects = M.taskProjectStats().filter((p: any) => (!fStatus || p.status === fStatus) && (!fType || p.type === fType));
  // Tasks outside any project still count, under "No project", while no project type is picked.
  const loose = M.looseTaskStats();
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
  const filtered = fStatus !== 'Open' || !!fType;

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
              {[fStatus ? fStatus + ' projects' : 'All projects', fType].filter(Boolean).join(' · ')}
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
            {filtered && (
              <button type="button" className="btn sm" onClick={() => { setFStatus('Open'); setFType(''); }}>
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

/** Tasks: a list of tasks, the projects they belong to, and a summary of both. */
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
  if (tab === 'summary') return <SummaryView openTasks={openTasks} />;

  // ========================================================================
  // TASK LIST
  // ========================================================================
  const q = fText.trim().toLowerCase();
  const rows = M.DATA.tasks
    .filter((t: any) => {
      const st = M.taskStatus(t);
      if (fId && !String(t.id).toLowerCase().includes(fId.trim().toLowerCase())) return false;
      if (q && !String(t.text).toLowerCase().includes(q)) return false;
      if (fProject === '-' ? !!t.projectId : fProject && t.projectId !== fProject) return false;
      if (fStatus && st !== fStatus) return false;
      if (fPriority && (t.priority || 'Low') !== fPriority) return false;
      if (fWho && (t.assignee || '') !== fWho) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const d = String(a.id).localeCompare(String(b.id));
      return newest ? -d : d;
    });
  const visible = rows.slice(0, shown);
  const filtered = !!(fId || fText || fProject || fStatus || fPriority || fWho);

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

      <div className="tlist">
        <table className="ttable" data-export="1">
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
              <th>Subject</th>
              <th>Status</th>
              <th>Project</th>
              <th>Priority</th>
              <th>Assigned to</th>
              <th>Deadline</th>
              <th className="r" data-noexport="1">
                {rows.length ? `${Math.min(shown, rows.length)} of ${rows.length}` : ''}
              </th>
              <th data-noexport="1" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="tnone">
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
                    <td>
                      <button type="button" className={`tname ${st === 'Completed' ? 'done' : ''}`} onClick={() => openEdit('tasks', t.id)} title="Open to edit">
                        {t.text}
                      </button>
                    </td>
                    <td><StatusPill status={st} /></td>
                    <td className="tproj">{t.project || ''}</td>
                    <td><PriorityPill p={t.priority} /></td>
                    <td className="tproj">{t.assignee || ''}</td>
                    <td className={`mono ${st === 'Overdue' ? 'neg' : 'muted'}`}>
                      {t.date ? M.fmtDate(t.date) : ''}
                      {t.date && st !== 'Completed' && st !== 'Cancelled' && <span className={`tdue ${st === 'Overdue' ? 'late' : ''}`}>{M.dueIn(t.date)}</span>}
                    </td>
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
      </div>
    </PageShell>
  );
}
