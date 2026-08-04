'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
      <span>{total} data</span>
      <div className="flex items-center gap-2">
        <button type="button" title="Halaman sebelumnya" aria-label="Halaman sebelumnya" onClick={() => onChange(page - 1)} disabled={page <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>Halaman {page} dari {totalPages}</span>
        <button type="button" title="Halaman berikutnya" aria-label="Halaman berikutnya" onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
