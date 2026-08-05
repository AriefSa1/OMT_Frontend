'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#d92d70', '#b4235f', '#8f1d4b', '#344054', '#667085', '#98a2b3'];

export default function CategoryPieChart({
  data = [],
  title = 'Distribusi kategori',
  // The caller knows what the shares were computed over; the chart must not guess it.
  subtitle,
  message,
  // Asal angka: sumber, metrik, cakupan, dan dari mana kategorinya berasal. Ditampilkan
  // sebagai catatan kaki supaya pembaca tidak perlu menebak panel ini menghitung apa.
  provenance = null,
}) {
  const slices = data.filter((entry) => Number.isFinite(Number(entry?.value)));
  // The centre used to print a constant "100%". Show the share the slices actually
  // cover, so a partial breakdown cannot read as a complete one.
  const coveredShare = Math.round(slices.reduce((sum, entry) => sum + Number(entry.value), 0));

  return (
    <section className="surface flex flex-col justify-between p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
      </div>

      {!slices.length ? (
        <p className="my-8 text-center text-sm leading-6 text-slate-500">
          {message || 'Belum ada pangsa kategori yang dapat dihitung dari snapshot katalog.'}
        </p>
      ) : (
        <>
          <div className="relative my-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {slices.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{ border: '1px solid #e4e7ec', borderRadius: 6, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-slate-900">{coveredShare}%</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Tercakup</span>
            </div>
          </div>

          <ul className="mt-2 space-y-2">
            {slices.map((category, index) => (
              <li key={category.name} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color || COLORS[index % COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-slate-600" title={category.name}>{category.name}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-800">{category.value}%</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {provenance && (
        <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
          <div><dt className="inline font-semibold text-slate-600">Sumber: </dt><dd className="inline">{provenance.source}</dd></div>
          <div><dt className="inline font-semibold text-slate-600">Metrik: </dt><dd className="inline">{provenance.metric}</dd></div>
          <div><dt className="inline font-semibold text-slate-600">Cakupan: </dt><dd className="inline">{provenance.scope}</dd></div>
          <div><dt className="inline font-semibold text-slate-600">Kategori: </dt><dd className="inline">{provenance.categoryField}</dd></div>
        </dl>
      )}
    </section>
  );
}
