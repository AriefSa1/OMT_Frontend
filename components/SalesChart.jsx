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
  { id: 'real_time', label: 'Real-time', days: 1 },
  { id: 'yesterday', label: 'Kemarin', days: 1, offset: 1 },
  { id: 'past7days', label: 'Minggu Lalu', days: 7 },
  { id: 'past30days', label: 'Bulan Lalu', days: 30 },
];

function slicePeriod(data, periodId) {
  const period = PERIODS.find((p) => p.id === periodId) || PERIODS[3];
  if (period.id === 'past30days') return data;
  if (period.id === 'yesterday') {
    // Kemarin = satu hari sebelum baris terbaru (bila ada).
    return data.length >= 2 ? [data[data.length - 2]] : data.slice(-1);
  }
  return data.slice(-period.days);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-sm">
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
  title = 'Tren penjualan dan biaya iklan',
  note,
  message,
}) {
  const [period, setPeriod] = useState('past30days');
  const view = useMemo(() => slicePeriod(data, period), [data, period]);

  const points = view.length;
  const firstDay = points ? view[0]?.day : null;
  const lastDay = points ? view[points - 1]?.day : null;
  const adPoints = view.filter((row) => row?.adSpend !== null && row?.adSpend !== undefined).length;
  // Titik sedikit (1-2 hari) tak membentuk garis; tampilkan titik agar tetap terbaca.
  const showDots = points <= 3;
  const coverage = points
    ? `${points} hari${firstDay && lastDay ? ` (${firstDay === lastDay ? firstDay : `${firstDay} s.d. ${lastDay}`})` : ''} · biaya iklan terukur pada ${adPoints} dari ${points} hari`
    : null;

  return (
    <section className="surface p-5">
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
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  period === p.id ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-700" aria-hidden="true" />GMV</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />Biaya iklan</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />Pesanan</span>
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
              <defs>
                <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#344054" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#344054" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d92d70" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#d92d70" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e7ec" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={26} tick={{ fill: '#667085', fontSize: 11 }} />
              <YAxis
                yAxisId="rupiah"
                axisLine={false}
                tickLine={false}
                width={54}
                tick={{ fill: '#667085', fontSize: 11 }}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              />
              <YAxis
                yAxisId="pesanan"
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={34}
                allowDecimals={false}
                tick={{ fill: '#059669', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* connectNulls tetap mati: hari tanpa snapshot iklan harus tetap jadi celah,
                  bukan digambar seolah biayanya nol. Garis iklan menyambung penuh setelah
                  riwayat iklan di-backfill (lihat tombol "Lengkapi data iklan"). */}
              <Area yAxisId="rupiah" type="monotone" dataKey="gmv" name="GMV" stroke="#344054" strokeWidth={2} fillOpacity={1} fill="url(#colorGmv)" dot={showDots ? { r: 3, fill: '#344054' } : false} />
              <Area yAxisId="rupiah" type="monotone" dataKey="adSpend" name="Biaya iklan" stroke="#d92d70" strokeWidth={2} fillOpacity={1} fill="url(#colorAd)" dot={showDots ? { r: 3, fill: '#d92d70' } : false} />
              <Line yAxisId="pesanan" type="monotone" dataKey="orders" name="Pesanan" stroke="#059669" strokeWidth={2} dot={showDots ? { r: 3, fill: '#059669' } : false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
