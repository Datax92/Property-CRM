'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell } from '../Shared';
import { Icon } from '../Icons';
import { ledgersReady, ledgerError } from '../../lib/firestore-service';
import * as M from '../../lib/re-data';

const DAY = 864e5;
const keyOf = (d: any) => M.dateInput(d instanceof Date ? d : M.parseDate(d));
const shift = (key: string, days: number) => M.dateInput(new Date(M.parseDate(key).getTime() + days * DAY));

/** Daily tasks: write a task, tick it when done, edit or delete it. Nothing else. */
export function TasksPage() {
  const { toast, refreshData } = useApp();
  const today = M.dateInput(M.TODAY);
  const [day, setDay] = useState(today);
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const tasks: any[] = M.DATA.tasks;
  const ofDay = tasks.filter((t) => keyOf(t.date) === day);
  // Looking at today also brings forward anything left undone on earlier days.
  const carried = day === today ? tasks.filter((t) => !t.done && keyOf(t.date) < today) : [];
  const todo = [...carried, ...ofDay.filter((t) => !t.done)].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const done = ofDay.filter((t) => t.done);
  const total = todo.length + done.length;

  // Every change is refused while the database is unreachable, so nothing vanishes on reload.
  const run = (fn: () => void) => {
    if (!ledgersReady()) return toast('Your records are still loading — please try again in a moment');
    if (ledgerError()) return toast('Not saved — the database is not reachable');
    try {
      fn();
      refreshData();
    } catch (err: any) {
      toast(String(err && err.message ? err.message : err));
    }
  };

  const add = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return toast('Write the task first');
    run(() => {
      M.addTask({ text, date: day });
      setText('');
    });
  };

  const saveEdit = (id: string) =>
    run(() => {
      M.updateTask(id, { text: editText });
      setEditId(null);
    });

  const label =
    day === today ? 'Today' : day === shift(today, -1) ? 'Yesterday' : day === shift(today, 1) ? 'Tomorrow' : M.fmtDate(M.parseDate(day));

  const row = (t: any) => (
    <li key={t.id} className={`task ${t.done ? 'done' : ''}`}>
      <button
        type="button"
        className="task-check"
        aria-pressed={t.done}
        aria-label={t.done ? 'Mark as not done' : 'Mark as done'}
        onClick={() => run(() => M.updateTask(t.id, { done: !t.done }))}
      >
        {t.done && (
          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.4l3 3 6-6.6" />
          </svg>
        )}
      </button>

      {editId === t.id ? (
        <form
          className="task-edit"
          onSubmit={(e) => {
            e.preventDefault();
            saveEdit(t.id);
          }}
        >
          <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Task" />
          <button type="submit" className="btn pri sm">Save</button>
          <button type="button" className="btn sm" onClick={() => setEditId(null)}>Cancel</button>
        </form>
      ) : (
        <span className="task-text">
          {t.text}
          {keyOf(t.date) !== day && <em className="task-late">from {M.fmtDate(t.date)}</em>}
        </span>
      )}

      {editId !== t.id &&
        (confirmId === t.id ? (
          <span className="task-confirm">
            Delete this task?
            <button type="button" className="btn sm bad" onClick={() => run(() => { M.deleteTask(t.id); setConfirmId(null); })}>
              Yes, delete
            </button>
            <button type="button" className="btn sm" onClick={() => setConfirmId(null)}>No</button>
          </span>
        ) : (
          <span className="task-acts">
            <button type="button" className="iconbtn" title="Edit" aria-label="Edit task" onClick={() => { setEditId(t.id); setEditText(t.text); setConfirmId(null); }}>
              <Icon name="edit" />
            </button>
            <button type="button" className="iconbtn" title="Delete" aria-label="Delete task" onClick={() => { setConfirmId(t.id); setEditId(null); }}>
              <Icon name="trash" />
            </button>
          </span>
        ))}
    </li>
  );

  return (
    <PageShell title="Daily tasks" u="روزانہ کام" p="What needs doing. Tick a task when it is done." tools={false}>
      <div className="tasks">
        <div className="tasks-day">
          <button type="button" className="iconbtn" aria-label="Previous day" onClick={() => setDay(shift(day, -1))}>
            <Icon name="prev" />
          </button>
          <div className="tasks-day-l">
            <b>{label}</b>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Pick a day" />
          </div>
          <button type="button" className="iconbtn" aria-label="Next day" onClick={() => setDay(shift(day, 1))}>
            <Icon name="next" />
          </button>
          {day !== today && (
            <button type="button" className="btn sm" onClick={() => setDay(today)}>
              Today
            </button>
          )}
          <span className="spacer" />
          {total > 0 && (
            <span className="tasks-count">
              {done.length} of {total} done
            </span>
          )}
        </div>

        <form className="tasks-add" onSubmit={add}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write a task for ${label.toLowerCase() === 'today' ? 'today' : label}…`}
            aria-label="New task"
          />
          <button type="submit" className="btn pri">
            <Icon name="plus" /> Add task
          </button>
        </form>

        {total === 0 ? (
          <div className="empty">
            <Icon name="empty" />
            <h3>No tasks for {label.toLowerCase() === 'today' ? 'today' : label}</h3>
            <p>Write one above and press “Add task”.</p>
          </div>
        ) : (
          <>
            <ul className="task-list">{todo.map(row)}</ul>
            {done.length > 0 && (
              <>
                <div className="kicker tasks-sub">Done</div>
                <ul className="task-list">{done.map(row)}</ul>
              </>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
