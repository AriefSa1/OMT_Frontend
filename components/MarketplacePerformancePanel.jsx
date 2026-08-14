'use client';

import { useCallback, useEffect, useState } from 'react';
import { Briefcase, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import EmptyState from './EmptyState';
import { fetchMarketplacePerformance } from '../lib/api';
import { formatIDR, formatNumber } from '../lib/utils';
import { useDateRange } from '../context/DateRangeContext';

// Warna badge kanal — blok padat mengikuti gaya "Detail Performa Toko".
function platformBadgeClass(type) {
  switch (String(type || '').toLowerCase()) {
    case 'tiktok': return 'bg-slate-900 text-white';
    case 'shopee': return 'bg-orange-500 text-white';
    case 'tokopedia': return 'bg-green-500 text-white';
    case 'lazada': return 'bg-blue-600 text-white';
    default: return 'bg-slate-200 text-slate-700';
  }
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
  const [available, setAvailable] = useState(false);
  const [channel, setChannel] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetchMarketplacePerformance({ startDate, endDate });
      setRows(res?.rows || []);
      setTeam(res?.team || null);
      setAvailable(Boolean(res?.success));
      if (!res?.success && res?.message) setMessage(res.message);
    } catch (err) {
      setRows([]);
      setAvailable(false);
      setMessage(`Gagal memuat performa marketplace: ${err?.message || 'kesalahan tak terduga'}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const countByChannel = {
    all: rows.length,
    shopee: rows.filter((r) => (r.type || '').toLowerCase() === 'shopee').length,
    tiktok: rows.filter((r) => (r.type || '').toLowerCase() === 'tiktok').length,
  };
  const byChannel = channel === 'all' ? rows : rows.filter((r) => (r.type || '').toLowerCase() === channel);
  const filtered = search
    ? byChannel.filter((r) => {
        const q = search.toLowerCase();
        return (r.name || '').toLowerCase().includes(q)
          || (r.owner || '').toLowerCase().includes(q)
          || (r.type || '').toLowerCase().includes(q);
      })
    : byChannel;

  const sumMeasured = (field) => {
    if (!filtered.length || filtered.some((row) => row[field] === null || row[field] === undefined || !Number.isFinite(Number(row[field])))) return null;
    return filtered.reduce((sum, row) => sum + Number(row[field]), 0);
  };
  const totals = {
    orderAmount: sumMeasured('orderAmount'),
    orderCount: sumMeasured('orderCount'),
    adsTotal: sumMeasured('adsTotal'),
    profitLoss: sumMeasured('profitLoss'),
  };

  const profitMeasured = totals.profitLoss !== null;
  const profitPositive = profitMeasured && totals.profitLoss >= 0;

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
            {c.label} <span className="text-slate-400">({available ? countByChannel[c.key] : '—'})</span>
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
          <p className={`mt-1 inline-flex items-center gap-1 text-lg font-semibold ${!profitMeasured ? 'text-slate-700' : profitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {profitMeasured && (profitPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
            {formatIDR(totals.profitLoss)}
          </p>
        </section>
      </div>

      {/* Tabel per marketplace — gaya "Detail Performa Toko" */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">Detail Performa Toko</h3>
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{filtered.length} Toko</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari toko atau pemilik..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              title="Muat ulang data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">Toko</th>
                <th className="px-4 py-4 text-right font-medium">Pesanan</th>
                <th className="px-4 py-4 text-right font-medium">Barang</th>
                <th className="px-4 py-4 text-right font-medium">Omzet</th>
                <th className="px-4 py-4 text-right font-medium">HPP</th>
                <th className="px-4 py-4 text-right font-medium">Pengeluaran</th>
                <th className="px-4 py-4 text-right font-medium">Iklan</th>
                <th className="px-4 py-4 text-right font-medium">Est. profit</th>
                <th className="px-4 py-4 text-right font-medium">Laba Bersih</th>
                <th className="px-6 py-4 text-right font-medium">Retur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 rounded bg-slate-200"></div>
                      <div className="mt-2 h-3 w-20 rounded bg-slate-100"></div>
                    </td>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-4 text-right"><div className="ml-auto h-4 w-16 rounded bg-slate-100"></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length ? (
                filtered.map((r) => {
                  const profitAvailable = r.profitLoss !== null && r.profitLoss !== undefined && Number.isFinite(Number(r.profitLoss));
                  const pos = profitAvailable && Number(r.profitLoss) >= 0;
                  return (
                    <tr key={`${r.type}-${r.id}`} className="group transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${platformBadgeClass(r.type)}`}>
                            {r.type}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900 transition-colors group-hover:text-blue-600">{r.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <Briefcase className="h-3 w-3" /> {r.owner || '—'}{r.ownerAlias ? ` (${r.ownerAlias})` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-600">{formatNumber(r.orderCount)}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-600">{formatNumber(r.itemCount)}</td>
                      <td className="px-4 py-4 text-right font-medium tabular-nums text-slate-900">{formatIDR(r.orderAmount)}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-500">{formatIDR(r.itemAmount)}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-500">{formatIDR(r.spentAmount)}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-600">{formatIDR(r.adsTotal)}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-600">{formatIDR(r.estimatedProfit)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={`font-medium ${!profitAvailable ? 'text-slate-500' : pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {profitAvailable && r.profitLoss > 0 ? '+' : ''}{formatIDR(r.profitLoss)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-rose-500">{formatIDR(r.returnAmount)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
                    <EmptyState title={available ? 'Tidak ada data pada rentang ini' : 'Data belum tersedia'} message={message || 'Tidak ada performa marketplace pada rentang ini.'} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
