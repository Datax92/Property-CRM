'use client';

import React, { useEffect, useRef } from 'react';
import { useApp, FORMS_DEF } from '../context/AppContext';
import { Icon } from './Icons';
import * as M from '../lib/re-data';

const dstr = (d: Date | string) => (d instanceof Date ? M.dateInput(d) : d);

export function Modals() {
  const { modal, closeModal, setModalField, submitModal, numbers } = useApp();
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (modal && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [modal?.id]);

  if (!modal) return null;

  const { id, values, errors } = modal;
  const F = FORMS_DEF[id];
  if (!F) return null;

  // Group fields into fieldsets
  const groups: { name: string; fields: any[] }[] = [];
  let currentGroup = { name: '', fields: [] as any[] };

  F.fields.forEach((fd: any) => {
    if (fd.g) {
      if (currentGroup.fields.length) {
        groups.push(currentGroup);
      }
      currentGroup = { name: fd.g, fields: [] };
    } else {
      currentGroup.fields.push(fd);
    }
  });
  if (currentGroup.fields.length) {
    groups.push(currentGroup);
  }

  const calc = F.calc ? F.calc(values) : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      submitModal();
    }
  };

  let isFirstInput = true;

  return (
    <div className="overlay" onClick={closeModal} onKeyDown={handleKeyDown}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={F.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-h">
          <div>
            <h2>{F.title}</h2>
            <p>{F.sub}</p>
          </div>
          <button type="button" className="x" onClick={closeModal} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-b">
          {groups.map((grp, gIdx) => (
            <div key={gIdx} className="fieldset">
              <span className="kicker">{grp.name}</span>
              <div className="formgrid">
                {grp.fields.map((fd) => {
                  const err = errors[fd.k];
                  const val = values[fd.k] == null ? '' : values[fd.k];
                  const inputRef = isFirstInput ? (el: any) => { firstInputRef.current = el; isFirstInput = false; } : undefined;

                  let ctl: React.ReactNode;
                  if (fd.type === 'select') {
                    const rawOpts = fd.opts();
                    const opts = rawOpts.map((o: any) => (Array.isArray(o) ? o : [o, o]));
                    ctl = (
                      <select
                        ref={inputRef}
                        value={val}
                        onChange={(e) => setModalField(fd.k, e.target.value)}
                        aria-invalid={err ? 'true' : undefined}
                      >
                        {opts.map(([v2, l]: [string, string]) => (
                          <option key={v2} value={v2}>
                            {l}
                          </option>
                        ))}
                      </select>
                    );
                  } else {
                    const type =
                      fd.type === 'date' ? 'date' : fd.type === 'money' || fd.type === 'number' ? 'number' : 'text';
                    ctl = (
                      <input
                        ref={inputRef}
                        type={type}
                        value={val}
                        placeholder={fd.ph}
                        max={fd.maxToday ? dstr(M.TODAY) : undefined}
                        min={fd.min != null ? fd.min : fd.type === 'money' ? '0' : undefined}
                        step={fd.type === 'money' ? '1000' : fd.type === 'number' ? '0.25' : undefined}
                        onChange={(e) => setModalField(fd.k, e.target.value)}
                        aria-invalid={err ? 'true' : undefined}
                      />
                    );
                  }

                  return (
                    <div key={fd.k} className={`fld ${fd.full ? 'full' : ''}`}>
                      <label>
                        {fd.l}
                        {fd.req ? ' *' : ''}
                      </label>
                      {ctl}
                      {err ? (
                        <span className="bad">{err}</span>
                      ) : fd.hint ? (
                        <span className="hint">{fd.hint}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {calc && (
            <div className="calcbox">
              {calc.map(([l, v, tot]: [string, number, boolean], idx: number) => (
                <div key={idx} className={`row ${tot ? 'tot' : ''}`}>
                  <span>{l}</span>
                  <b>{M.fmt(v, numbers)}</b>
                </div>
              ))}
            </div>
          )}

          {errors._form && (
            <div className="note bad" style={{ marginTop: '12px' }}>
              <span className="ic">
                <Icon name="warn" />
              </span>
              <div>{errors._form}</div>
            </div>
          )}
        </div>

        <div className="modal-f">
          <span className="vs">Fields marked * are required.</span>
          <span className="spacer" />
          <button type="button" className="btn" onClick={closeModal}>
            Cancel
          </button>
          <button type="button" className="btn pri" onClick={submitModal}>
            <Icon name="ok" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
