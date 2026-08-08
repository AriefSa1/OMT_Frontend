'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Users, Eye, ShoppingCart, PackageCheck, Wallet, Percent } from 'lucide-react';
import MetricCard from './MetricCard';
import { fetchProductOverview, fetchProductTrends } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { useDateRange } from '../context/DateRangeContext';
import { formatIDR, formatNumber } from '../lib/utils';

// value: 'number' | 'idr' | 'percent' (rate 0–1)
const CARD_DEFS = [
  { key: 'uv', title: 'Pengunjung', icon: Users, type: 'number', tone: 'slate' },
  { key: 'pv', title: 'Halaman dilihat', icon: Eye, type: 'number', tone: 'slate' },
  { key: 'atc_rate', title: 'Add-to-cart rate', icon: ShoppingCart, type: 'percent', tone: 'amber', tip: 'Persentase pengunjung yang memasukkan produk ke keranjang.' },
  { key: 'placed_orders', title: 'Pesanan dibuat', icon: PackageCheck, type: 'number', tone: 'rose' },
  { key: 'confirmed_gmv', title: 'GMV dikonfirmasi', icon: Wallet, type: 'idr', tone: 'emerald' },
  { key: 'uv_to_confirmed_buyers_rate', title: 'Konversi', icon: Percent, type: 'percent', tone: 'emerald', tip: 'Pengunjung yang menjadi pembeli terkonfirmasi.' },
];

const TREND_METRICS = [
  { key: 'uv', label: 'Pengunjung', type: 'number' },
  { key: 'pv', label: 'Halaman dilihat', type: 'number' },
  { key: 'atc_unit_num', label: 'Add to cart', type: 'number' },
  { key: 'placed_order', label: 'Pesanan dibuat', type: 'number' },
  { key: 'confirmed_order', label: 'Order dikonfirmasi', type: 'number' },
  { key: 'confirmed_gmv', label: 'GMV dikonfirmasi', type: 'idr' },
];

function fmtValue(v, type) {
  if (v === null || v === undefined) return '—';
  if (type === 'idr') return formatIDR(v);
  if (type === 'percent') return `${(Number(v) * 100).toFixed(2)}%`;
  return formatNumber(v);
}

// ratio dari Shopee = delta pecahan vs periode sebelumnya (-1 = −100%).
function toTrend(ratio) {
  if (ratio === null || ratio === undefined || !Number.isFinite(Number(ratio))) return null;
  const r = Number(ratio);
  const direction = r > 0.0001 ? 'up' : r < -0.0001 ? 'down' : 'flat';
  return { direction, changePercent: r * 100, previous: undefined, current: undefined };
}

export default function ProductOverviewPanel() {
  const { selectedStoreId } = useStore();
  const { startDate, endDate } = useDateRange();
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [metricKey, setMetricKey] = useState('uv');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessage('');
      const params = { storeId: selectedStoreId || null, startDate, endDate };
      const [ov, tr] = await Promise.all([
        fetchProductOverview(params),
        fetchProductTrends(params),
      ]);
      if (cancelled) return;
      setOverview(ov?.metrics || null);
      setSeries(tr?.series || {});
      if (!ov?.success && ov?.message) setMessage(ov.message);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedStoreId, startDate, endDate]);

  const activeMetric = TREND_METRICS.find((m) => m.key === metricKey) || TREND_METRICS[0];
  const chartData = useMemo(() => {
    const points = Array.isArray(series?.[metricKey]) ? series[metricKey] : [];
    if (!points.length) return [];
    const first = Number(points[0]?.timestamp) || 0;
    const last = Number(points[points.length - 1]?.timestamp) || 0;
    const intraday = last - first <= 86400; // rentang ≤ 1 hari → label jam
    return points.map((p) => {
      const d = new Date(Number(p.timestamp) * 1000);
      const label = intraday
        ? `${String(d.getHours()).padStart(2, '0')}:00`
        : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { label, value: Number(p.value) || 0 };
    });
  }, [series, metricKey]);

  return (
    <section className="space-y-4">
      {message && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</p>
      )}

      {/* KPI funnel */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {CARD_DEFS.map((def) => {
          const cell = overview?.[def.key];
          const value = loading ? '…' : cell ? fmtValue(cell.value, def.type) : '—';
          return (
            <MetricCard
              key={def.key}
              title={def.title}
              value={value}
              icon={def.icon}
              tone={def.tone}
              tip={def.tip}
              trend={cell ? toTrend(cell.ratio) : null}
            />
          );
        })}
      </div>

      {/* Grafik tren */}
      <section className="surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Tren metrik produk</h2>
          <select
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
            aria-label="Pilih metrik"
          >
            {TREND_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        {!chartData.length ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {loading ? 'Memuat…' : 'Belum ada data tren untuk rentang ini.'}
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d7d84" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0d7d84" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e7ec" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: '#667085', fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={54}
                  tick={{ fill: '#667085', fontSize: 11 }}
                  tickFormatter={(v) => (activeMetric.type === 'idr' ? `${Math.round(Number(v) / 1000)}k` : formatNumber(v))}
                />
                <Tooltip
                  formatter={(v) => [fmtValue(v, activeMetric.type), activeMetric.label]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e4e7ec', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="value" name={activeMetric.label} stroke="#0d7d84" strokeWidth={2} fill="url(#colorOverview)" dot={chartData.length <= 3 ? { r: 3, fill: '#0d7d84' } : false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </section>
  );
}
