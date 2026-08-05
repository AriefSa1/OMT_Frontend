'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpDown,
  Download,
  Eye,
  Layers,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import EmptyState from '../../../components/EmptyState';
import Pagination from '../../../components/Pagination';
import StatusBadge from '../../../components/StatusBadge';
import { fetchShopeeProductPerformance, triggerShopeeSync } from '../../../lib/api';
import { useDebouncedValue, useSnapshotRefresh } from '../../../lib/hooks';
import { formatIDR, formatNumber, formatPercent } from '../../../lib/utils';

const PERIOD_OPTIONS = [
  { id: 'real_time', label: 'Real-time (Hari Ini)', icon: Zap, hint: 'Data langsung hari ini sejak 00:00 WIB' },
  { id: 'yesterday', label: 'Kemarin', icon: null, hint: 'Data lengkap 1 hari kemarin' },
  { id: 'past7days', label: '7 Hari Terakhir', icon: null, hint: 'Tren performa 7 hari ke belakang' },
  { id: 'past30days', label: '30 Hari Terakhir', icon: null, hint: 'Akumulasi performa 30 hari' },
];

const ORDER_BY_OPTIONS = [
  { value: 'confirmed_sales.desc', label: 'Penjualan Tertinggi (GMV)' },
  { value: 'confirmed_order.desc', label: 'Pesanan Terbanyak' },
  { value: 'item_views.desc', label: 'Tayangan / Pengunjung Tertinggi' },
  { value: 'conversion_rate.desc', label: 'Tingkat Konversi Tertinggi' },
  { value: 'add_to_cart_rate.desc', label: 'Add to Cart Tertinggi' },
];

const PerformanceRow = memo(function PerformanceRow({ product }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3.5 text-center font-bold">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
          product.rank === 1
            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400'
            : product.rank === 2
              ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-400'
              : product.rank === 3
                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                : 'text-slate-500'
        }`}>
          {product.rank}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100 border border-slate-200">
            {product.image ? (
              <Image src={product.image} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <Package className="m-2.5 h-5 w-5 text-slate-400" />
            )}
          </span>
          <div className="min-w-0">
            <Link href={`/product/${product.itemId}`} className="block max-w-72 truncate font-semibold text-slate-900 hover:text-rose-600 transition-colors">
              {product.name}
            </Link>
            <span className="block max-w-72 truncate text-[11px] text-slate-500 font-mono">SKU: {product.sku || product.itemId}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right font-medium text-slate-700">{formatIDR(product.price)}</td>
      <td className="px-4 py-3.5 text-right font-medium text-slate-800">{formatNumber(product.visitors)}</td>
      <td className="px-4 py-3.5 text-right text-slate-600">{formatNumber(product.views)}</td>
      <td className="px-4 py-3.5 text-right">
        <div className="font-semibold text-slate-800">{formatNumber(product.addToCartUnits)} unit</div>
        <div className="text-[10px] text-slate-500">{formatPercent(product.addToCartRate)}</div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="font-semibold text-slate-900">{formatNumber(product.confirmedOrders)} pesanan</div>
        <div className="text-[10px] text-slate-500">{formatNumber(product.confirmedUnits)} unit</div>
      </td>
      <td className="px-4 py-3.5 text-right font-bold text-rose-700">{formatIDR(product.confirmedSales)}</td>
      <td className="px-4 py-3.5 text-right font-semibold">
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
          product.conversionRate >= 5
            ? 'bg-emerald-50 text-emerald-700 font-bold'
            : product.conversionRate >= 2
              ? 'bg-blue-50 text-blue-700'
              : 'bg-slate-100 text-slate-600'
        }`}>
          {formatPercent(product.conversionRate)}
        </span>
      </td>
    </tr>
  );
});

export default function ShopeeProductPerformancePage() {
  const [period, setPeriod] = useState('real_time');
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('confirmed_sales.desc');
  const [orderType, setOrderType] = useState('confirmed');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const deferredSearch = useDebouncedValue(search);
  const [appliedSearch, setAppliedSearch] = useState('');

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchShopeeProductPerformance({
        period,
        keyword: appliedSearch,
        order_by: orderBy,
        order_type: orderType,
        page_size: pageSize,
        page_num: page,
      });
      setData(result?.success ? result : null);
      setError(result?.success ? '' : result?.message || result?.error || 'Data performa produk belum dapat dimuat.');
    } catch (requestError) {
      setData(null);
      setError(requestError?.message || 'Data performa produk belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [period, appliedSearch, orderBy, orderType, pageSize, page]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    if (deferredSearch === appliedSearch) return;
    setAppliedSearch(deferredSearch);
    setPage(1);
  }, [deferredSearch, appliedSearch]);

  useSnapshotRefresh(loadPerformance);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerShopeeSync();
      if (!result?.success) setError(result?.message || result?.error || 'Sinkronisasi Shopee gagal.');
      await loadPerformance();
    } catch (syncError) {
      setError(syncError?.message || 'Sinkronisasi Shopee gagal.');
    } finally {
      setSyncing(false);
    }
  };

  const exportToCSV = () => {
    if (!data?.products || !data.products.length) return;
    const headers = [
      'Peringkat',
      'ID Produk',
      'Nama Produk',
      'SKU',
      'Harga (IDR)',
      'Pengunjung (UV)',
      'Tayangan (Views)',
      'Add to Cart Unit',
      'Add to Cart Rate (%)',
      'Pesanan Terkonfirmasi',
      'Unit Terjual',
      'Total Penjualan (IDR)',
      'Tingkat Konversi (%)',
    ];

    const rows = data.products.map((p) => [
      p.rank,
      `"${p.itemId}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      p.price,
      p.visitors,
      p.views,
      p.addToCartUnits,
      // Unguarded .toFixed() threw inside the click handler and aborted the export with
      // no message whenever a row lacked a rate — the snapshot path can omit them.
      Number.isFinite(Number(p.addToCartRate)) ? Number(p.addToCartRate).toFixed(2) : '',
      p.confirmedOrders,
      p.confirmedUnits,
      p.confirmedSales,
      Number.isFinite(Number(p.conversionRate)) ? Number(p.conversionRate).toFixed(2) : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shopee_product_performance_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // No zero-filled fallback. When the request fails, `data` is null and these become
  // undefined, which the formatters render as "Belum tersedia" — previously a failed
  // request showed "Rp 0 / 0 pesanan / 0 UV", i.e. a day with no sales.
  const summary = data?.summary;

  const isConnected = data?.dataSource !== 'EMPTY' && (data?.products?.length > 0 || data?.total > 0 || data?.live);
  const sourceLabel = data?.live
    ? 'Live Data Shopee'
    : data?.dataSource === 'SHOPEE_SNAPSHOT'
      ? 'Snapshot Lokal'
      : 'Data Sesi Aktif';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performa Produk (Bisnis Saya)"
        description="Analisis mendalam performa penjualan, pengunjung, dan rasio konversi produk Shopee berdasarkan periode."
        actions={
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Ekspor CSV
              </button>
            )}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70 transition-colors shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sync Data'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            status={isConnected ? 'Segar' : 'Perlu Koneksi'}
          />
          <span className="text-xs font-medium text-slate-600">{isConnected ? sourceLabel : 'Belum Terhubung'}</span>
          {data?.storeName && (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              Toko: {data.storeName}
            </span>
          )}
          <span className="text-xs text-slate-500">
            {PERIOD_OPTIONS.find((p) => p.id === period)?.hint}
          </span>
          {data?.dataSource === 'SHOPEE_SNAPSHOT' && (
            <span className="text-xs font-medium text-amber-700">{data.message}</span>
          )}
          {error && !data?.products?.length && (
            <span className="text-xs font-medium text-rose-700">{error}</span>
          )}
        </div>
      </PageHeader>

      {/* Period Filter Tabs */}
      <section className="surface p-2 sm:p-3">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((item) => {
            const active = period === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setPeriod(item.id); setPage(1); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {Icon && <Icon className={`h-3.5 w-3.5 ${active ? 'text-amber-300' : 'text-amber-500'}`} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* KPI Overview Summary */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="surface p-4 border-l-4 border-l-rose-500 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Penjualan (GMV)</span>
            <div className="rounded-md bg-rose-50 p-2 text-rose-600"><Wallet className="h-4 w-4" /></div>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {loading ? <div className="skeleton h-7 w-32 rounded" /> : formatIDR(summary?.totalSales)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Omset terkonfirmasi periode ini</p>
        </div>

        <div className="surface p-4 border-l-4 border-l-blue-500 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pesanan Terkonfirmasi</span>
            <div className="rounded-md bg-blue-50 p-2 text-blue-600"><Package className="h-4 w-4" /></div>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {loading ? <div className="skeleton h-7 w-20 rounded" /> : `${formatNumber(summary?.totalOrders)} pesanan`}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {loading ? '...' : `${formatNumber(summary?.totalUnits)} unit barang terjual`}
          </p>
        </div>

        <div className="surface p-4 border-l-4 border-l-indigo-500 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pengunjung Produk</span>
            <div className="rounded-md bg-indigo-50 p-2 text-indigo-600"><Users className="h-4 w-4" /></div>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {loading ? <div className="skeleton h-7 w-20 rounded" /> : `${formatNumber(summary?.totalVisitors)} UV`}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {loading ? '...' : `${formatNumber(summary?.totalViews)} kali dilihat`}
          </p>
        </div>

        <div className="surface p-4 border-l-4 border-l-emerald-500 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Rata-rata Rasio Konversi</span>
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {loading ? <div className="skeleton h-7 w-16 rounded" /> : formatPercent(summary?.averageConversionRate)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Pesanan / Pengunjung (UV)</p>
        </div>
      </section>

      {/* Filter & Controls Bar */}
      <section className="surface p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_160px_130px]">
          <label className="relative block">
            <span className="sr-only">Cari nama produk atau SKU</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama produk atau SKU..."
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </label>

          <label>
            <span className="sr-only">Urutkan</span>
            <select
              value={orderBy}
              onChange={(e) => { setOrderBy(e.target.value); setPage(1); }}
              className="ui-select h-10 w-full rounded-md px-3 text-sm text-slate-700"
            >
              {ORDER_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Tipe Pesanan</span>
            <select
              value={orderType}
              onChange={(e) => { setOrderType(e.target.value); setPage(1); }}
              className="ui-select h-10 w-full rounded-md px-3 text-sm text-slate-700"
            >
              <option value="confirmed">Pesanan Terkonfirmasi</option>
              <option value="placed">Pesanan Dibuat</option>
              <option value="paid">Pesanan Dibayar</option>
            </select>
          </label>

          <label>
            <span className="sr-only">Baris per halaman</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="ui-select h-10 w-full rounded-md px-3 text-sm text-slate-700"
            >
              <option value={10}>10 per halaman</option>
              <option value={20}>20 per halaman</option>
              <option value={50}>50 per halaman</option>
            </select>
          </label>
        </div>
      </section>

      {/* Table Section */}
      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Peringkat & Rincian Performa Produk</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Menampilkan {data?.products?.length || 0} dari total {data?.total || 0} produk
            </p>
          </div>
          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
            Periode: {PERIOD_OPTIONS.find((p) => p.id === period)?.label}
          </span>
        </div>

        <div className="table-scroll">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">Rank</th>
                <th className="px-4 py-3.5">Produk</th>
                <th className="px-4 py-3.5 text-right">Harga</th>
                <th className="px-4 py-3.5 text-right">Pengunjung (UV)</th>
                <th className="px-4 py-3.5 text-right">Tayangan</th>
                <th className="px-4 py-3.5 text-right">Add to Cart</th>
                <th className="px-4 py-3.5 text-right">Pesanan</th>
                <th className="px-4 py-3.5 text-right">Total Penjualan (GMV)</th>
                <th className="px-4 py-3.5 text-right">Rasio Konversi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan="9" className="px-5 py-3.5">
                      <div className="skeleton h-9 rounded-md" />
                    </td>
                  </tr>
                ))}

              {!loading && (data?.products || []).map((product) => (
                <PerformanceRow key={`${product.itemId}-${product.rank}`} product={product} />
              ))}

              {!loading && (!data?.products || data.products.length === 0) && (
                <tr>
                  <td colSpan="9" className="p-0">
                    <EmptyState
                      title="Tidak ada data performa produk"
                      message={
                        data?.message ||
                        'Hubungkan sesi Shopee di Pengaturan atau sesuaikan kata kunci filter pencarian.'
                      }
                      action={
                        <Link
                          href="/settings"
                          className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
                        >
                          Buka Pengaturan
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && (
          <Pagination
            pagination={data.pagination}
            onChange={(newPage) => setPage(newPage)}
          />
        )}
      </section>
    </div>
  );
}
