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

/** Tasks: a list of tasks, the projects they belong to, and a summary of both. */
export function TasksPage() {
  const { tab, toast, refreshData, openModal, openEdit, goto, showTip, hideTip } = useApp();

  // Filters live here so "Tasks" from a project row lands on that project's tasks.
  const [fId, setFId] = useState('');
  const [fText, setFText] = useState('');
  const [fProject, setFProject] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPriority, setFPriority] = useState('');
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

  // ========================================================================
  // PROJECTS
  // ========================================================================
  if (tab === 'projects') {
    const rows = M.taskProjectStats().sort((a: any, b: any) => String(b.id).localeCompare(String(a.id)));
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
        {rows.length === 0 ? (
          <div className="empty">
            <Icon name="empty" />
            <h3>No projects yet</h3>
            <p>Add one, for example “Personal”, “A&amp;Sons Work” or “Property Business”, and put tasks in it.</p>
          </div>
        ) : (
          <div className="tlist">
            <table className="ttable">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Project Type</th>
                  <th className="wide">% Completed</th>
                  <th className="r">Tasks</th>
                  <th className="r">Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <button type="button" className="tname" onClick={() => { setFProject(p.id); setShown(pageSize); goto('tasks/list'); }}>
                        {p.name}
                      </button>
                    </td>
                    <td>
                      {p.total > 0 && p.completed === p.total ? (
                        <span className="tpill st-done">Completed</span>
                      ) : p.completed > 0 ? (
                        <span className="tpill st-open">{Math.round(p.pct)}%</span>
                      ) : (
                        <span className="tpill st-open">Open</span>
                      )}
                    </td>
                    <td className="muted">{p.type || ''}</td>
                    <td>
                      <div className="tbar" title={`${p.completed} of ${p.total} tasks completed`}>
                        <i style={{ width: `${p.pct}%` }} />
                      </div>
                    </td>
                    <td className="r mono">
                      {p.completed} / {p.total}
                    </td>
                    <td className="r muted">{ago(p.createdAt)}</td>
                    <td className="r nowrap">
                      {confirm === p.id ? (
                        <span className="task-confirm">
                          Delete project? Its tasks are kept.
                          <button type="button" className="btn sm bad" onClick={() => run(() => { M.deleteTaskProject(p.id); setConfirm(null); }, 'Project deleted')}>
                            Yes, delete
                          </button>
                          <button type="button" className="btn sm" onClick={() => setConfirm(null)}>No</button>
                        </span>
                      ) : (
                        <>
                          <button type="button" className="iconbtn" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => openEdit('taskProjects', p.id)}>
                            <Icon name="edit" />
                          </button>
                          <button type="button" className="iconbtn" title="Delete" aria-label={`Delete ${p.name}`} onClick={() => setConfirm(p.id)}>
                            <Icon name="trash" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tfoot">
              <span className="spacer" />
              <span className="muted">
                {rows.length} of {rows.length}
              </span>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  if (tab === 'summary') {
    const stats = M.taskProjectStats();
    const all = M.DATA.tasks.filter((t: any) => M.taskStatus(t) !== 'Cancelled');
    const completed = all.filter((t: any) => M.taskStatus(t) === 'Completed').length;
    const overdue = all.filter((t: any) => M.taskStatus(t) === 'Overdue').length;
    const withTasks = stats.filter((p: any) => p.total > 0);
    const avg = withTasks.length ? withTasks.reduce((a: number, p: any) => a + p.pct, 0) / withTasks.length : 0;
    const max = Math.max(1, ...stats.map((p: any) => p.total));
    const step = max <= 10 ? 2 : max <= 50 ? 10 : Math.ceil(max / 50) * 10;
    const top = Math.ceil(max / step) * step;
    const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

    const tip = (e: React.MouseEvent, p: any) =>
      showTip(
        `<b>${p.name}</b><br>Total tasks: ${p.total}<br>Completed: ${p.completed}<br>Still open: ${p.open}<br>Overdue: ${p.overdue}`,
        e.clientX,
        e.clientY
      );

    return (
      <PageShell title="Project summary" u="خلاصہ" p="Completion, overdue work and tasks per project." tools={false}>
        <div className="panel tsum">
          <div className="panel-h">
            <h3>Project Summary</h3>
          </div>
          <div className="panel-b">
            <div className="tsum-kpis">
              <div>
                <span>Average Completion</span>
                <b className="c-avg">{avg.toFixed(1)}%</b>
              </div>
              <div>
                <span>Total Tasks</span>
                <b className="c-total">{all.length}</b>
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

            {stats.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center' }}>
                Add projects and tasks to see them here.
              </p>
            ) : (
              <>
                <div className="tchart" role="img" aria-label="Tasks per project: completed, still open and overdue">
                  <div className="tchart-y">
                    {ticks
                      .slice()
                      .reverse()
                      .map((v) => (
                        <span key={v} style={{ bottom: `${(v / top) * 100}%` }}>
                          {v}
                        </span>
                      ))}
                  </div>
                  <div className="tchart-plot">
                    {ticks.map((v) => (
                      <i key={v} className="tchart-grid" style={{ bottom: `${(v / top) * 100}%` }} />
                    ))}
                    {stats.map((p: any) => (
                      <div key={p.id} className="tchart-col" onMouseMove={(e) => tip(e, p)} onMouseLeave={hideTip}>
                        <div className="tchart-stack" style={{ height: `${(p.total / top) * 100}%` }}>
                          {p.overdue > 0 && <i className="seg-over" style={{ flexGrow: p.overdue }} />}
                          {p.open > 0 && <i className="seg-open" style={{ flexGrow: p.open }} />}
                          {p.completed > 0 && <i className="seg-done" style={{ flexGrow: p.completed }} />}
                        </div>
                        <span className="tchart-x" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tchart-legend">
                  <span><i className="seg-over" /> Overdue</span>
                  <span><i className="seg-done" /> Completed</span>
                  <span><i className="seg-open" /> Still open</span>
                </div>
              </>
            )}
          </div>
        </div>

        {stats.length > 0 && (
          <div className="tlist" style={{ marginTop: 14 }}>
            <table className="ttable">
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="r">Total</th>
                  <th className="r">Completed</th>
                  <th className="r">Still open</th>
                  <th className="r">Overdue</th>
                  <th className="r">% Completed</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((p: any) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td className="r mono">{p.total}</td>
                    <td className="r mono">{p.completed}</td>
                    <td className="r mono">{p.open}</td>
                    <td className={`r mono ${p.overdue ? 'neg' : ''}`}>{p.overdue}</td>
                    <td className="r mono">{p.pct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageShell>
    );
  }

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
      return true;
    })
    .sort((a: any, b: any) => {
      const d = String(a.id).localeCompare(String(b.id));
      return newest ? -d : d;
    });
  const visible = rows.slice(0, shown);
  const filtered = !!(fId || fText || fProject || fStatus || fPriority);
  const allPicked = visible.length > 0 && visible.every((t: any) => picked.includes(t.id));

  const clear = () => {
    setFId('');
    setFText('');
    setFProject('');
    setFStatus('');
    setFPriority('');
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
        <span className="spacer" />
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
        <table className="ttable">
          <thead>
            <tr>
              <th className="chk">
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
              <th>Due</th>
              <th className="r">
                {rows.length ? `${Math.min(shown, rows.length)} of ${rows.length}` : ''}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="tnone">
                  {filtered ? 'No task matches these filters.' : 'No tasks yet — write one above and press Enter.'}
                </td>
              </tr>
            ) : (
              visible.map((t: any) => {
                const st = M.taskStatus(t);
                return (
                  <tr key={t.id} className={picked.includes(t.id) ? 'on' : ''}>
                    <td className="chk">
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
                    <td className={`mono ${st === 'Overdue' ? 'neg' : 'muted'}`}>{t.date ? M.fmtDate(t.date) : ''}</td>
                    <td className="r muted" title={t.createdAt ? 'Created ' + M.fmtDate(t.createdAt) : ''}>{ago(t.createdAt)}</td>
                    <td className="r nowrap">
                      {confirm === t.id ? (
                        <span className="task-confirm">
                          Delete?
                          <button type="button" className="btn sm bad" onClick={() => run(() => { M.deleteTask(t.id); setConfirm(null); }, 'Task deleted')}>Yes</button>
                          <button type="button" className="btn sm" onClick={() => setConfirm(null)}>No</button>
                        </span>
                      ) : (
                        <>
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
                        </>
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
