'use client';

import React, { useEffect, useRef, useState } from 'react';

/* A date typed and shown day first — DD/MM/YYYY — whatever language the browser is set to. The
   browser's own date box follows the computer's settings, so on an English (US) computer it reads
   month first and 05/10/2026 meant 10 May, while every register and bank statement reads day
   first. The calendar button still opens the browser's picker. The value is kept as YYYY-MM-DD. */

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD as DD/MM/YYYY, or '' for no date. */
export function dayFirst(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** DD/MM/YYYY (or D-M-YYYY, D.M.YYYY …) as YYYY-MM-DD; '' when empty; null when not a whole, real date. */
export function parseDayFirst(text: string): string | null {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = /^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})$/.exec(t);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(y, mo, 0).getDate()) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Slashes go in as the digits are typed: 20102026 becomes 20/10/2026, and 5/102026 becomes
    5/10/2026. A slash (or - or .) typed by hand after a one-digit day or month is kept. */
function shape(raw: string) {
  const parts = raw.replace(/[^\d/\-. ]/g, '').split(/[/\-. ]/);
  if (parts.length === 1) {
    const d = parts[0].slice(0, 8);
    return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }
  let day = parts[0], month = parts[1], year = parts.slice(2).join('');
  // Digits past two in the day or the month run on into the next part.
  if (day.length > 2) [day, month] = [day.slice(0, 2), day.slice(2) + month];
  if (month.length > 2) [month, year] = [month.slice(0, 2), month.slice(2) + year];
  return parts.length > 2 || year ? `${day}/${month}/${year.slice(0, 4)}` : `${day}/${month}`;
}

export function DateField({
  value,
  onChange,
  max,
  min,
  id,
  className = '',
  label,
  invalid,
  inputRef,
  style,
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  min?: string;
  id?: string;
  className?: string;
  label?: string;
  invalid?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(dayFirst(value));
  const [bad, setBad] = useState(false);
  // The value this field last sent: a different one arriving is a change made from outside.
  const sent = useRef(value);
  const picker = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(dayFirst(value));
      setBad(false);
    }
  }, [value]);

  const emit = (iso: string) => {
    sent.current = iso;
    onChange(iso);
  };

  const type = (raw: string) => {
    const t = shape(raw);
    setText(t);
    const iso = parseDayFirst(t);
    setBad(false);
    // A date still being typed sends nothing yet; a cleared one sends ''.
    if (iso !== null && iso !== value) emit(iso);
    else if (iso === null && t.replace(/\D/g, '').length >= 6 && value) emit('');
  };

  const openPicker = () => {
    const el = picker.current as any;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
      else el.click();
    } catch {
      el.focus();
    }
  };

  return (
    <>
    <span className={`datefld ${className}`} style={style}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        value={text}
        aria-label={label}
        aria-invalid={invalid || bad ? 'true' : undefined}
        title="Day / month / year"
        onChange={(e) => type(e.target.value)}
        onBlur={() => {
          // Left half-typed: say so, rather than quietly keeping the old date.
          const iso = parseDayFirst(text);
          if (iso === null) setBad(true);
          else setText(dayFirst(iso));
        }}
      />
      <button type="button" className="datefld-cal" onClick={openPicker} tabIndex={-1} title="Pick from a calendar" aria-label="Pick from a calendar">
        <svg viewBox="0 0 16 16" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="1.6" />
          <path d="M2 6.5h12M5.5 1.6v2.6M10.5 1.6v2.6" />
        </svg>
      </button>
      <input
        ref={picker}
        className="datefld-native"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : ''}
        max={max}
        min={min}
        onChange={(e) => {
          const iso = e.target.value;
          setText(dayFirst(iso));
          setBad(false);
          emit(iso);
        }}
      />
    </span>
    {bad && <span className="datefld-bad">Type the date as DD/MM/YYYY</span>}
    </>
  );
}
