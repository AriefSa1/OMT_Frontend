'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatIDR } from '../lib/utils';

/**
 * Grafik tren iklan harian dari `ads.history` (date, spend, sales, roas).
 * Biaya & penjualan pada sumbu rupiah (kiri), ROAS pada sumbu kanan. Dipakai di
 * halaman Iklan (tab bento). Menyusut sendiri; menampilkan pesan bila data kosong.
 */
function AdsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="chart-tooltip rounded-md border border-teal-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{label}</p>
      <div className="space-y-1 text-slate-600">
        <p>Penjualan: <span className="font-semibold text-slate-900">{formatIDR(row.sales)}</span></p>
        <p>Biaya: <span className="font-semibold text-slate-900">{formatIDR(row.spend)}</span></p>
        <p>ROAS: <span className="font-semibold text-slate-900">{row.roas != null ? Number(row.roas).toFixed(2) : '-'}</span></p>
      </div>
    </div>
  );
}

export default function AdsTrendChart({ data = [], title = 'Tren biaya & penjualan iklan', note }) {
  const view = useMemo(() => (Array.isArray(data) ? data.filter((row) => row && row.date) : []), [data]);
  const points = view.length;

  return (
    <section className="surface chart-panel flex h-full flex-col p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {points ? `${points} hari snapshot iklan` : 'Belum ada riwayat iklan tersimpan.'}
            {note ? ` · ${note}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5"><span className="chart-legend-dot bg-teal-700" aria-hidden="true" />Penjualan</span>
          <span className="flex items-center gap-1.5"><span className="chart-legend-dot bg-amber-500" aria-hidden="true" />Biaya</span>
          <span className="flex items-center gap-1.5"><span className="chart-legend-dot bg-teal-400" aria-hidden="true" />ROAS</span>
        </div>
      </div>

      {!points ? (
        <p className="flex flex-1 items-center justify-center py-12 text-center text-sm text-slate-500">
          Jalankan Sync iklan untuk mengisi riwayat tren.
        </p>
      ) : (
        <div className="h-64 w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={view} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#d7e3e0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={26} tick={{ fill: '#6b7c80', fontSize: 10 }} />
              <YAxis yAxisId="rupiah" axisLine={false} tickLine={false} width={54} tick={{ fill: '#6b7c80', fontSize: 10 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <YAxis yAxisId="roas" orientation="right" axisLine={false} tickLine={false} width={30} allowDecimals tick={{ fill: '#0f9d8a', fontSize: 10 }} />
              <Tooltip content={<AdsTooltip />} />
              <Line yAxisId="rupiah" type="monotone" dataKey="sales" name="Penjualan" stroke="#08776d" strokeWidth={2.5} dot={points <= 3 ? { r: 3, fill: '#08776d' } : false} />
              <Line yAxisId="rupiah" type="monotone" dataKey="spend" name="Biaya" stroke="#c28728" strokeWidth={2} strokeDasharray="5 4" dot={points <= 3 ? { r: 3, fill: '#c28728' } : false} />
              <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="#0f9d8a" strokeWidth={2.5} dot={points <= 3 ? { r: 3, fill: '#0f9d8a' } : false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
