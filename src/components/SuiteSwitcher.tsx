"use client";

import { useEffect } from 'react';
import { preconnect, prefetchDNS } from 'react-dom';

const apps = [
  { id: 'property', label: 'Property CRM', href: 'https://meridian-estates-rms-two.vercel.app/' },
  { id: 'erp', label: 'ERP Trading', href: 'https://erp-cac37.web.app/' },
] as const;

export function SuiteSwitcher({ active }: { active: 'property' | 'erp' }) {
  const destination = apps.find((app) => app.id !== active)!;
  useEffect(() => {
    prefetchDNS(destination.href);
    preconnect(new URL(destination.href).origin);
    const reset = () => document.documentElement.classList.remove('suite-leaving');
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, [destination]);
  return <nav className="suite-switcher" aria-label="Switch software">
    {apps.map((app) => <a key={app.id} href={app.href}
      aria-current={app.id === active ? 'true' : undefined}
      onClick={(event) => {
        if (app.id === active) { event.preventDefault(); return; }
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        document.documentElement.classList.add('suite-leaving');
        // Let the browser navigate immediately; animate while the destination loads.
      }}>{app.label}</a>)}
  </nav>;
}
