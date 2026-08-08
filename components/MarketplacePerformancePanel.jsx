'use client';

import { useCallback, useEffect, useState } from 'react';
import { Store, TrendingUp, TrendingDown } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import EmptyState from './EmptyState';
import { fetchMarketplacePerformance } from '../lib/api';
import { formatIDR, formatNumber } from '../lib/utils';
import { useDateRange } from '../context/DateRangeContext';

function typeBadge(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'shopee') return { label: 'Shopee', cls: 'bg-orange-50 text-orange-700 border-orange-200' };
  if (t === 'tiktok') return { label: 'TikTok', cls: 'bg-slate-900 text-white border-slate-900' };
  return { label: type || '—', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

const CHANNELS = [
  { key: 'all', label: 'Semua' },
  { key: 'shopee', label: 'Shopee' },
  { key: 'tiktok', label: 'TikTok' },
];

export default function MarketplacePerformancePanel() {
  const { startDate, endDate } = useDateRange();
  const [rows, setRows] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const res = await fetchMarketplacePerformance({ startDate, endDate });
    setRows(res?.rows || []);
    setTeam(res?.team || null);
    if (!res?.success && res?.message) setMessage(res.message);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const countByChannel = {
    all: rows.length,
    shopee: rows.filter((r) => (r.type || '').toLowerCase() === 'shopee').length,
    tiktok: rows.filter((r) => (r.type || '').toLowerCase() === 'tiktok').length,
  };
  const filtered = channel === 'all' ? rows : rows.filter((r) => (r.type || '').toLowerCase() === channel);

  const totals = filtered.reduce((acc, r) => ({
    orderAmount: acc.orderAmount + (r.orderAmount || 0),
    orderCount: acc.orderCount + (r.orderCount || 0),
    adsTotal: acc.adsTotal + (r.adsTotal || 0),
    profitLoss: acc.profitLoss + (r.profitLoss || 0),
  }), { orderAmount: 0, orderCount: 0, adsTotal: 0, profitLoss: 0 });

  const profitPositive = totals.profitLoss >= 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Performa Marketplace (Gudang)</h2>
          <p className="text-xs text-slate-500">
            Laba/rugi per toko lintas kanal menurut sistem Gudang{team?.name ? ` · ${team.name}` : ''}.
          </p>
        </div>
        <DateRangePicker />
      </div>

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</p>}

      {/* Filter kanal */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChannel(c.key)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${channel === c.key ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {c.label} <span className="text-slate-400">({countByChannel[c.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <section className="surface p-4"><p className="text-xs text-slate-500">Omzet</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatIDR(totals.orderAmount)}</p></section>
        <section className="surface p-4"><p className="text-xs text-slate-500">Pesanan</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(totals.orderCount)}</p></section>
        <section className="surface p-4"><p className="text-xs text-slate-500">Biaya iklan</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatIDR(totals.adsTotal)}</p></section>
        <section className="surface p-4">
          <p className="text-xs text-slate-500">Laba / rugi</p>
          <p className={`mt-1 inline-flex items-center gap-1 text-lg font-semibold ${profitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {profitPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {formatIDR(totals.profitLoss)}
          </p>
        </section>
      </div>

      {/* Tabel per marketplace */}
      <section className="surface overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Marketplace</th>
                <th className="px-4 py-3 font-medium">Kanal</th>
                <th className="px-4 py-3 font-medium">Pemilik</th>
                <th className="px-4 py-3 text-right font-medium">Pesanan</th>
                <th className="px-4 py-3 text-right font-medium">Item</th>
                <th className="px-4 py-3 text-right font-medium">Omzet</th>
                <th className="px-4 py-3 text-right font-medium">Iklan</th>
                <th className="px-4 py-3 text-right font-medium">Est. profit</th>
                <th className="px-5 py-3 text-right font-medium">Laba/Rugi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-sm text-slate-500">Memuat…</td></tr>
              ) : filtered.length ? filtered.map((r) => {
                const badge = typeBadge(r.type);
                const pos = (r.profitLoss || 0) >= 0;
                return (
                  <tr key={`${r.type}-${r.id}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <Store className="h-3.5 w-3.5 text-slate-400" /> {r.name}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span></td>
                    <td className="px-4 py-3 text-slate-600">{r.owner || '—'}{r.ownerAlias ? ` (${r.ownerAlias})` : ''}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(r.orderCount)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(r.itemCount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatIDR(r.orderAmount)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatIDR(r.adsTotal)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatIDR(r.estimatedProfit)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${pos ? 'text-emerald-700' : 'text-rose-700'}`}>{formatIDR(r.profitLoss)}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="9" className="px-5 py-10 text-center"><EmptyState title="Belum ada data" message="Tidak ada performa marketplace pada rentang ini." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
