'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { fetchAdminStoreCompare } from '../lib/api';
import { formatIDR, formatNumber } from '../lib/utils';

// Palet stabil per posisi toko, dipakai untuk garis grafik dan penanda.
const SERIES_COLORS = ['#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2'];

const METRIC_ROWS = [
  { label: 'Omzet', get: (m) => formatIDR(m?.gmv || 0) },
  { label: 'Order', get: (m) => formatNumber(m?.orders || 0) },
  { label: 'AOV', get: (m) => formatIDR(m?.avgOrderValue || 0) },
  { label: 'Tren omzet', get: (m) => (m?.gmvTrendPct === null || m?.gmvTrendPct === undefined ? '—' : `${m.gmvTrendPct >= 0 ? '+' : ''}${m.gmvTrendPct.toFixed(1)}%`), trend: true },
  { label: 'Order dibatalkan', get: (m) => formatNumber(m?.cancelledOrders || 0) },
  { label: 'Rasio batal', get: (m) => `${(m?.cancelRate || 0).toFixed(1)}%` },
  { label: 'Biaya iklan', get: (m) => formatIDR(m?.adsSpend || 0) },
  { label: 'ROAS', get: (m) => (m?.adsRoas === null || m?.adsRoas === undefined ? '—' : `${m.adsRoas.toFixed(2)}×`) },
  { label: 'Produk terkatalog', get: (m) => formatNumber(m?.productCount || 0) },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-md">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-800">{formatIDR(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function AdminStoreCompare({ storeIds, days, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAdminStoreCompare(storeIds, days);
    if (res.success) {
      setData(res.data);
      setError('');
    } else {
      setError(res.error || 'Gagal memuat data pembanding.');
    }
    setLoading(false);
  }, [storeIds, days]);

  useEffect(() => {
    load();
  }, [load]);

  const stores = data?.stores || [];

  // Gabungkan deret harian semua toko menjadi satu tabel {date, [storeId]: gmv} untuk grafik.
  const chartData = useMemo(() => {
    const byDate = new Map();
    stores.forEach((s) => {
      (s.salesSeries || []).forEach((point) => {
        if (!byDate.has(point.date)) byDate.set(point.date, { date: point.date });
        byDate.get(point.date)[s.storeId] = point.gmv;
      });
    });
    return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [stores]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke daftar
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Pembanding · periode {days} hari</span>
          <button type="button" onClick={load} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-600' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
          <span className="mt-2 block">Memuat pembanding…</span>
        </div>
      ) : (
        <>
          {/* Grafik tren omzet harian */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Tren Omzet Harian</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: '#667085', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#667085', fontSize: 11 }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}rb` : v)} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {stores.map((s, i) => (
                    <Line key={s.storeId} type="monotone" dataKey={s.storeId} name={s.storeName} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabel metrik berdampingan */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Metrik</th>
                    {stores.map((s, i) => (
                      <th key={s.storeId} className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                          <span className="text-slate-900">{s.storeName}</span>
                        </span>
                        <span className="block text-[10px] font-normal text-slate-400">{s.owner?.name || '—'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {METRIC_ROWS.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-600">{row.label}</td>
                      {stores.map((s) => (
                        <td key={s.storeId} className="px-4 py-3 text-right font-semibold text-slate-800">{row.get(s.metrics)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top produk per toko */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((s, i) => (
              <div key={s.storeId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                  <h4 className="text-sm font-semibold text-slate-900">{s.storeName}</h4>
                </div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Top Produk (omzet)</p>
                {s.topProducts?.length ? (
                  <ol className="space-y-1.5">
                    {s.topProducts.map((p, idx) => (
                      <li key={p.shopeeItemId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="text-slate-400">{idx + 1}.</span>
                          <span className="truncate text-slate-700">{p.name}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-slate-800">{formatIDR(p.sales)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada data penjualan produk.</p>
                )}
                {s.categoryMix?.length > 0 && (
                  <>
                    <p className="mb-1.5 mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-400">Kategori Teratas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.categoryMix.slice(0, 4).map((c) => (
                        <span key={c.category} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{c.category}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
