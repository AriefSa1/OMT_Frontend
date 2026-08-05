'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatIDR, formatNumber } from '../lib/utils';

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
  const points = data.length;
  const firstDay = points ? data[0]?.day : null;
  const lastDay = points ? data[points - 1]?.day : null;
  const adPoints = data.filter((row) => row?.adSpend !== null && row?.adSpend !== undefined).length;
  // The window is counted from the rows received. The old copy claimed a fixed
  // "7-day window" regardless of how many days had actually been stored.
  const coverage = points
    ? `${points} hari tersimpan${firstDay && lastDay ? ` (${firstDay} s.d. ${lastDay})` : ''} · biaya iklan terukur pada ${adPoints} dari ${points} hari`
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
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-700" aria-hidden="true" />GMV</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />Biaya iklan</span>
        </div>
      </div>

      {!points ? (
        <p className="py-12 text-center text-sm leading-6 text-slate-500">
          {message || 'Belum ada histori pesanan untuk ditampilkan.'}
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                axisLine={false}
                tickLine={false}
                width={54}
                tick={{ fill: '#667085', fontSize: 11 }}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* connectNulls stays off: a day without an ads snapshot must stay a gap. */}
              <Area type="monotone" dataKey="gmv" name="GMV" stroke="#344054" strokeWidth={2} fillOpacity={1} fill="url(#colorGmv)" />
              <Area type="monotone" dataKey="adSpend" name="Biaya iklan" stroke="#d92d70" strokeWidth={2} fillOpacity={1} fill="url(#colorAd)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
