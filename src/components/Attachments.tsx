'use client';

import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from './Icons';
import { ACCEPT, Attachment, NOT_READY, uploadFile, uploadsReady } from '../lib/uploads';
import { ledgerError } from '../lib/firestore-service';
import * as M from '../lib/re-data';

const Clip = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.2 7.4l-5.5 5.5a3.2 3.2 0 0 1-4.5-4.5l5.9-5.9a2.1 2.1 0 0 1 3 3L6.3 11.3a1 1 0 0 1-1.5-1.5l5.2-5.2" />
  </svg>
);

const kb = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

/** Tiles of the attached files, with a tile to add more. */
export function AttachmentsField({ value, onChange }: { value: Attachment[]; onChange: (next: Attachment[]) => void }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');
  const list = Array.isArray(value) ? value : [];

  const add = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError('');
    let next = list;
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      setBusy((n) => n + 1);
      try {
        next = [...next, await uploadFile(file)];
        onChange(next);
      } catch (err: any) {
        failed.push(String(err && err.message ? err.message : err));
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (failed.length) setError(failed.join(' '));
    if (input.current) input.current.value = '';
  };

  return (
    <div className="att">
      <div className="att-grid">
        {list.map((a, i) => (
          <div key={a.url + i} className="att-item">
            <a href={a.url} target="_blank" rel="noopener noreferrer" title={`Open ${a.name}`}>
              {a.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.thumb} alt={a.name} loading="lazy" />
              ) : (
                <span className="att-doc">{(a.name.split('.').pop() || 'file').slice(0, 4).toUpperCase()}</span>
              )}
            </a>
            <span className="att-name" title={a.name}>
              {a.name}
            </span>
            <span className="att-size">{kb(a.size)}</span>
            <button type="button" className="att-x" aria-label={`Remove ${a.name}`} title="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <button type="button" className="att-add" disabled={!uploadsReady() || busy > 0} onClick={() => input.current && input.current.click()}>
          {busy > 0 ? <span className="att-spin" /> : <Clip size={18} />}
          <span>{busy > 0 ? 'Uploading…' : 'Add file'}</span>
        </button>
      </div>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => add(e.target.files)} />
      {!uploadsReady() && <span className="bad">{NOT_READY}</span>}
      {error && <span className="bad">{error}</span>}
    </div>
  );
}

/** Paperclip in a list row: shows how many files a record has and opens them. */
export function AttachButton({ coll, id }: { coll: string; id: string }) {
  const { openAttachments } = useApp();
  const rec = ((M.DATA as any)[coll] || []).find((x: any) => x.id === id);
  const n = rec && Array.isArray(rec.attachments) ? rec.attachments.length : 0;
  return (
    <button type="button" className={`attbtn ${n ? 'has' : ''}`} title={n ? `${n} attachment${n === 1 ? '' : 's'}` : 'Add attachment'} onClick={() => openAttachments(coll, id)}>
      <Clip />
      {n > 0 && <b>{n}</b>}
    </button>
  );
}

/** Attachments of one saved record. Every change is stored straight away. */
export function AttachmentsModal() {
  const { attach, closeAttachments, refreshData, toast } = useApp();
  if (!attach) return null;

  const rec = ((M.DATA as any)[attach.coll] || []).find((x: any) => x.id === attach.id);
  if (!rec) return null;
  const down = ledgerError();

  return (
    <div className="overlay" onClick={closeAttachments} onKeyDown={(e) => e.key === 'Escape' && closeAttachments()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Attachments" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <h2>Attachments</h2>
            <p>
              {attach.id}
              {rec.name || rec.property || rec.propertyName || rec.vendor || rec.party || rec.employee
                ? ' · ' + (rec.name || rec.property || rec.propertyName || rec.vendor || rec.party || rec.employee)
                : ''}
            </p>
          </div>
          <button type="button" className="x" onClick={closeAttachments} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-b">
          {down ? (
            <div className="note bad">
              <span className="ic">
                <Icon name="warn" />
              </span>
              <div>{down}</div>
            </div>
          ) : (
            <AttachmentsField
              value={rec.attachments || []}
              onChange={(next) => {
                const added = next.length > (rec.attachments || []).length;
                M.setAttachments(attach.coll, attach.id, next);
                refreshData();
                toast(added ? 'Attachment added' : 'Attachment removed');
              }}
            />
          )}
        </div>
        <div className="modal-f">
          <button type="button" className="btn pri" onClick={closeAttachments}>
            Done
          </button>
          <span className="spacer" />
          <span className="vs">Images and PDFs, up to 10 MB each.</span>
        </div>
      </div>
    </div>
  );
}
