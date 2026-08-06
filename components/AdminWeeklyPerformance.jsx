'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, TrendingDown } from 'lucide-react';
import { fetchAdminStores, fetchAdminWeeklyPerformance, downloadAdminDecliningCsv } from '../lib/api';
import { formatNumber, formatIDR } from '../lib/utils';

const WEEK_OPTIONS = [4, 8, 12];
const METRICS = [
  { value: 'units', label: 'Unit Terjual' },
  { value: 'sales', label: 'Omzet' },
];

function fmtMetric(value, metric) {
  return metric === 'sales' ? formatIDR(value || 0) : formatNumber(value || 0);
}

export default function AdminWeeklyPerformance() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [metric, setMetric] = useState('units');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [onlyDeclining, setOnlyDeclining] = useState(false);

  // Muat daftar toko sekali untuk dropdown.
  useEffect(() => {
    (async () => {
      const res = await fetchAdminStores();
      if (res.success) {
        const list = res.data?.stores || [];
        setStores(list);
        if (list.length && !storeId) setStoreId(list[0].storeId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const res = await fetchAdminWeeklyPerformance(storeId, weeks, metric);
    if (res.success) {
      setData(res.data);
      setError('');
    } else {
      setError(res.error || 'Gagal memuat performa mingguan.');
      setData(null);
    }
    setLoading(false);
  }, [storeId, weeks, metric]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async () => {
    if (!storeId) return;
    setDownloading(true);
    const res = await downloadAdminDecliningCsv(storeId, weeks, metric);
    if (!res.success) setError(res.error || 'Gagal mengunduh CSV.');
    setDownloading(false);
  };

  const weekLabels = data?.weeks || [];
  const products = data?.products || [];
  const shown = onlyDeclining ? products.filter((p) => p.declining) : products;
  const decliningCount = data?.decliningCount || 0;

  const selectClass = 'h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Kontrol */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Toko</span>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={`${selectClass} min-w-44`}>
              {stores.length === 0 && <option value="">Tidak ada toko</option>}
              {stores.map((s) => (
                <option key={s.storeId} value={s.storeId}>{s.storeName || s.storeId}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Metrik</span>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectClass}>
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Jumlah Minggu</span>
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className={selectClass}>
              {WEEK_OPTIONS.map((w) => <option key={w} value={w}>{w} minggu</option>)}
            </select>
          </label>
          <button type="button" onClick={load} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-600' : 'text-slate-500'}`} /> Muat
          </button>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || decliningCount === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          title={decliningCount === 0 ? 'Tidak ada produk menurun untuk diunduh' : 'Unduh CSV produk menurun'}
        >
          <Download className={`h-4 w-4 ${downloading ? 'animate-pulse' : ''}`} />
          {downloading ? 'Menyiapkan…' : `Unduh CSV Produk Menurun (${decliningCount})`}
        </button>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Ringkasan produk menurun */}
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2 text-amber-800">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-semibold">{decliningCount} produk cenderung menurun</span>
          <span className="text-xs text-amber-700">dari {products.length} produk dengan aktivitas · streak turun ≥ 2 minggu</span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-amber-800">
          <input type="checkbox" checked={onlyDeclining} onChange={(e) => setOnlyDeclining(e.target.checked)} className="h-3.5 w-3.5 rounded border-amber-300 text-rose-600" />
          Hanya tampilkan yang menurun
        </label>
      </div>

      {/* Tabel mingguan */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Produk</th>
                {weekLabels.map((w) => (
                  <th key={w.label} className="px-3 py-3 text-right" title={`${w.start} s/d ${w.end}`}>{w.label}</th>
                ))}
                <th className="px-3 py-3 text-center">Streak</th>
                <th className="px-3 py-3 text-right">Perubahan Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={weekLabels.length + 3} className="px-4 py-10 text-center text-slate-500"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" /></td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={weekLabels.length + 3} className="px-4 py-10 text-center text-slate-500">Tidak ada produk untuk ditampilkan.</td></tr>
              ) : (
                shown.map((p) => (
                  <tr key={p.shopeeItemId} className={`hover:bg-slate-50/70 ${p.declining ? 'bg-rose-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {p.declining && <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                        <span className="font-medium text-slate-800">{p.name}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{p.category}</span>
                    </td>
                    {p.weekly.map((v, i) => {
                      const prev = i > 0 ? p.weekly[i - 1] : null;
                      const down = prev !== null && v < prev;
                      return (
                        <td key={i} className={`px-3 py-3 text-right tabular-nums ${down ? 'text-rose-600 font-medium' : 'text-slate-700'}`}>
                          {fmtMetric(v, metric)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      {p.declineStreak > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{p.declineStreak}×</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium ${p.netChangePct < 0 ? 'text-rose-600' : p.netChangePct > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {p.netChangePct === null || p.netChangePct === undefined ? '—' : `${p.netChangePct >= 0 ? '+' : ''}${p.netChangePct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        "Menurun" = metrik mingguan turun berturut-turut minimal 2 minggu terakhir. Minggu = blok 7 hari dari hari ini ke belakang. CSV hanya memuat produk menurun. Data terisi seiring akumulasi snapshot harian.
      </p>
    </div>
  );
}
