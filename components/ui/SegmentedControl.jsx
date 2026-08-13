'use client';

import { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

// Kontrol tersegmentasi seragam untuk semua toggle/tab (filter tipe, tampilan
// kartu/tabel, tab, dsb.). Gaya aktif konsisten di seluruh aplikasi (pil putih +
// bayangan + teks rose), dengan ikon & badge angka opsional.
//
//   <SegmentedControl value={filter} onChange={setFilter} aria-label="Filter tipe">
//     <SegmentedItem value="all" badge={counts.all}>Semua</SegmentedItem>
//     <SegmentedItem value="priority" icon={Flame} badge={counts.priority}>Priority</SegmentedItem>
//   </SegmentedControl>
const Ctx = createContext(null);

export default function SegmentedControl({ value, onChange, className, children, ...props }) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1', className)}
      {...props}
    >
      <Ctx.Provider value={{ value, onChange }}>{children}</Ctx.Provider>
    </div>
  );
}

export function SegmentedItem({ value, icon: Icon, badge, title, children, className }) {
  const ctx = useContext(Ctx) || {};
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      title={title}
      onClick={() => ctx.onChange?.(value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40',
        active ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children != null && <span>{children}</span>}
      {badge != null && (
        <span className={cn('ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums', active ? 'bg-rose-50 text-rose-700' : 'bg-slate-200/70 text-slate-600')}>
          {badge}
        </span>
      )}
    </button>
  );
}
