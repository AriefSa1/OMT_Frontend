'use client';

import { Calendar } from 'lucide-react';
import { useDateRange, DATE_PRESETS } from '../context/DateRangeContext';

/**
 * Pemilih rentang tanggal bersama. Terhubung ke DateRangeContext, jadi cukup
 * ditaruh sekali per halaman; semua fetch yang membaca `useDateRange().apiParams`
 * ikut berubah otomatis.
 */
export default function DateRangePicker({ className = '' }) {
  const { preset, startDate, endDate, setPreset, setCustomRange } = useDateRange();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Rentang
      </span>
      <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              preset === p.key ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="inline-flex items-center gap-1.5">
          <input
            type="date"
            value={startDate || ''}
            max={endDate || undefined}
            onChange={(e) => setCustomRange(e.target.value, endDate)}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
            aria-label="Tanggal mulai"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="date"
            value={endDate || ''}
            min={startDate || undefined}
            onChange={(e) => setCustomRange(startDate, e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
            aria-label="Tanggal selesai"
          />
        </div>
      )}
    </div>
  );
}
