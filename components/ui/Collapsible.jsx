'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// Seksi yang bisa dilipat (native <details> — tanpa JS, aksesibel, ramah keyboard).
// Default tertutup agar halaman pendek; klik header untuk membuka.
//
//   <Collapsible title="Ringkasan Produk (funnel)"><ProductOverviewPanel /></Collapsible>
export default function Collapsible({ title, subtitle, defaultOpen = false, children, className }) {
  return (
    <details open={defaultOpen} className={cn('group', className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] select-none hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {subtitle && <span className="hidden truncate text-xs text-slate-400 sm:inline">{subtitle}</span>}
        <span className="ml-auto text-[11px] font-medium text-slate-400 group-open:hidden">Buka</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
