'use client';

import React, { useMemo, useState } from 'react';
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
import { formatIDR, formatNumber } from '../lib/utils';

// Filter rentang waktu grafik. Data 30 hari sudah diterima dari server, jadi penyaringan
// dilakukan di sisi klien — pergantian filter seketika tanpa memanggil server lagi.
const PERIODS = [
  { id: 'past7days', label: '7 hari', days: 7 },
  { id: 'past30days', label: '30 hari', days: 30 },
  { id: 'past90days', label: '90 hari', days: 90 },
];

function slicePeriod(data, periodId) {
  const period = PERIODS.find((p) => p.id === periodId) || PERIODS[3];
  if (period.id === 'past30days') return data;
  return data.slice(-period.days);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="chart-tooltip rounded-md border border-teal-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{label}</p>
      <div className="space-y-1 text-slate-600">
        {/* null means "not measured on this day" — formatIDR/formatNumber render that as
            "Belum tersedia" rather than as a zero. */}
        <p>GMV: <span className="font-semibold text-slate-900">{formatIDR(row.gmv)}</span></p>
        <p>Biaya iklan: <span className="font-semibold text-slate-900">{formatIDR(row.adSpend)}</span></p>
        <p>Pesanan: <span className="font-semibold text-slate-900">{formatNumber(row.orders)}</span></p>
      </div>
    </div>
  );
}

export default function SalesChart({
  data = [],
  title = 'Tren penjualan',
  note,
  message,
}) {
  const [period, setPeriod] = useState('past7days');
  const view = useMemo(() => slicePeriod(data, period), [data, period]);

  const points = view.length;
  const firstDay = points ? view[0]?.day : null;
  const lastDay = points ? view[points - 1]?.day : null;
  const adPoints = view.filter((row) => row?.adSpend !== null && row?.adSpend !== undefined).length;
  // Titik sedikit (1-2 hari) tak membentuk garis; tampilkan titik agar tetap terbaca.
  const showDots = points <= 3;
  const coverage = points
    ? `${points} hari tersimpan${firstDay && lastDay ? ` · ${firstDay === lastDay ? firstDay : `${firstDay} s.d. ${lastDay}`}` : ''} · biaya iklan terukur pada ${adPoints} hari`
    : null;

  return (
    <section className="surface chart-panel p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {coverage || 'Belum ada histori pesanan yang tersimpan.'}
          </p>
          {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
        </div>
        <div className="flex flex-col items-end gap-2.5">
          {/* Filter rentang waktu */}
          <div className="inline-flex rounded-[5px] border border-slate-300 bg-white p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                disabled={p.days > data.length}
                className={`rounded-[3px] px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  period === p.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-teal-50 hover:text-teal-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!points ? (
        <p className="py-12 text-center text-sm leading-6 text-slate-500">
          {message || 'Belum ada histori pesanan untuk ditampilkan.'}
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {/* Pesanan dipisahkan ke sumbu kanan: satuannya "pesanan" (puluhan), sedangkan
                GMV dan biaya iklan rupiah (ratusan ribu). Satu sumbu bersama akan membuat
                garis pesanan rata di dasar grafik dan tak terbaca. */}
            <ComposedChart data={view} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#d7d3d3" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={26} tick={{ fill: '#6b7c80', fontSize: 10 }} />
              <YAxis
                yAxisId="rupiah"
                axisLine={false}
                tickLine={false}
                width={54}
                tick={{ fill: '#7d7979', fontSize: 10 }}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              />
              <YAxis
                yAxisId="pesanan"
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={34}
                allowDecimals={false}
                tick={{ fill: '#0088b0', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* connectNulls tetap mati: hari tanpa snapshot iklan harus tetap jadi celah,
                  bukan digambar seolah biayanya nol. Garis iklan menyambung penuh setelah
                  riwayat iklan di-backfill (lihat tombol "Lengkapi data iklan"). */}
              <defs>
                <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0088b0" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#0088b0" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <Area yAxisId="rupiah" type="monotone" dataKey="gmv" name="GMV" stroke="#0088b0" fill="url(#sales-area)" strokeWidth={2.6} dot={showDots ? { r: 3, fill: '#0088b0' } : false} />
              <Line yAxisId="rupiah" type="monotone" dataKey="adSpend" name="Biaya iklan" stroke="#d6006c" strokeWidth={1.7} strokeDasharray="5 4" dot={false} />
              <Line yAxisId="pesanan" type="monotone" dataKey="orders" name="Pesanan" stroke="#00799e" strokeWidth={1.8} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
