'use client';

import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Belum ada data', message, description, hint, icon: Icon = Inbox, action }) {
  // `description` diterima sebagai alias `message` agar seragam dengan pemakaian lain.
  const body = message || description;
  return (
    <div className="surface flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-sm font-semibold text-slate-800">{title}</h2>
      {body && <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{body}</p>}
      {hint && <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
