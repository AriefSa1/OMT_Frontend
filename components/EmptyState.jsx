'use client';

import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Belum ada data', message, action }) {
  return (
    <div className="surface flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <Inbox className="h-7 w-7 text-slate-400" aria-hidden="true" />
      <h2 className="mt-3 text-sm font-semibold text-slate-800">{title}</h2>
      {message && <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
