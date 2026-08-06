'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, BarChart3, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchAdminStoresStats } from '../lib/api';
import { formatIDR, formatNumber } from '../lib/utils';
import AdminStoreCompare from './AdminStoreCompare';

const PERIODS = [
  { label: '7 hari', value: 7 },
  { label: '30 hari', value: 30 },
  { label: '90 hari', value: 90 },
];

const COLUMNS = [
  { key: 'storeName', label: 'Toko', numeric: false },
  { key: 'owner', label: 'Pemilik', numeric: false },
  { key: 'gmv', label: 'Omzet', numeric: true },
  { key: 'orders', label: 'Order', numeric: true },
  { key: 'avgOrderValue', label: 'AOV', numeric: true },
  { key: 'gmvTrendPct', label: 'Tren Omzet', numeric: true },
  { key: 'adsSpend', label: 'Biaya Iklan', numeric: true },
  { key: 'adsRoas', label: 'ROAS', numeric: true },
  { key: 'productCount', label: 'Produk', numeric: true },
];

function TrendPill({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function sortValue(row, key) {
  if (key === 'storeName') return (row.storeName || '').toLowerCase();
  if (key === 'owner') return (row.owner?.name || '').toLowerCase();
  const m = row.metrics || {};
  const v = m[key];
  return v === null || v === undefined ? -Infinity : v;
}

export default function AdminStoreAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState({ key: 'gmv', dir: 'desc' });
  const [selected, setSelected] = useState([]); // storeId[]
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async (period) => {
    setLoading(true);
    const res = await fetchAdminStoresStats(period);
    if (res.success) {
      setData(res.data);
      setError('');
    } else {
      setError(res.error || 'Gagal memuat statistik toko.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const stores = data?.stores || [];
  const totals = data?.totals || { gmv: 0, orders: 0, adsSpend: 0, products: 0 };

  const sortedStores = useMemo(() => {
    const arr = [...stores];
    arr.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [stores, sort]);

  const toggleSort = (key) => {
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };

  const toggleSelect = (storeId) => {
    setSelected((cur) => (cur.includes(storeId) ? cur.filter((id) => id !== storeId) : [...cur, storeId]));
  };

  if (comparing) {
    return (
      <AdminStoreCompare
        storeIds={selected}
        days={days}
        onBack={() => setComparing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Kontrol periode + ringkasan */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">Statistik Toko</span>
          <span className="text-xs text-slate-500">· periode {days} hari</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDays(p.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  days === p.value ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load(days)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Muat ulang</span>
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Kartu total lintas toko */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Omzet', value: formatIDR(totals.gmv) },
          { label: 'Total Order', value: formatNumber(totals.orders) },
          { label: 'Total Biaya Iklan', value: formatIDR(totals.adsSpend) },
          { label: 'Total Produk', value: formatNumber(totals.products) },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{loading ? '…' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Bar aksi pembanding */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="text-xs text-slate-600">
          {selected.length === 0
            ? 'Centang 2 toko atau lebih untuk membandingkan detailnya.'
            : `${selected.length} toko dipilih`}
        </span>
        <button
          type="button"
          disabled={selected.length < 2}
          onClick={() => setComparing(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Bandingkan ({selected.length})
        </button>
      </div>

      {/* Tabel statistik */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-3 w-8"></th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${col.numeric ? 'text-right' : 'text-left'} cursor-pointer select-none hover:text-slate-900`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.numeric ? 'flex-row-reverse' : ''}`}>
                      {col.label}
                      <ArrowDownUp className={`h-3 w-3 ${sort.key === col.key ? 'text-rose-600' : 'text-slate-300'}`} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center text-slate-500"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" /></td></tr>
              ) : sortedStores.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center text-slate-500">Belum ada toko terdaftar.</td></tr>
              ) : (
                sortedStores.map((s) => {
                  const m = s.metrics || {};
                  return (
                    <tr key={s.storeId} className={`hover:bg-slate-50/70 ${selected.includes(s.storeId) ? 'bg-rose-50/40' : ''}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(s.storeId)}
                          onChange={() => toggleSelect(s.storeId)}
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-slate-900">{s.storeName || 'Shopee Store'}</span>
                        <span className="font-mono text-[10px] text-slate-400">{s.storeId}</span>
                        {!s.isActive && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">nonaktif</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.owner ? (
                          <>
                            <span className="block text-slate-800">{s.owner.name}</span>
                            <span className="text-[10px] text-slate-400">{s.owner.email}</span>
                          </>
                        ) : <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatIDR(m.gmv || 0)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(m.orders || 0)}</td>
                      <td className="px-4 py-3 text-right">{formatIDR(m.avgOrderValue || 0)}</td>
                      <td className="px-4 py-3 text-right"><TrendPill value={m.gmvTrendPct} /></td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatIDR(m.adsSpend || 0)}</td>
                      <td className="px-4 py-3 text-right font-medium">{m.adsRoas === null || m.adsRoas === undefined ? <span className="text-slate-400">—</span> : `${m.adsRoas.toFixed(2)}×`}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(m.productCount || 0)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Tren dibandingkan dengan periode {days} hari sebelumnya. ROAS &amp; CTR dihitung dari total (bukan rata-rata harian). Gudang bersifat global sehingga tidak dipisah per toko.
      </p>
    </div>
  );
}
