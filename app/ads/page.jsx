'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpDown, BarChart3, Eye, MousePointerClick, RefreshCw, ShoppingBag, Target, Clock } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import AdsAIOptimizerCard from '../../components/AdsAIOptimizerCard';
import { fetchShopeeAds, triggerFullSync } from '../../lib/api';
import { useSnapshotRefresh, useTrickleProgress } from '../../lib/hooks';
import { formatIDR, formatNumber, formatPercent } from '../../lib/utils';
import { useStore } from '../../context/StoreContext';

// Dimuat dinamis (tanpa SSR) agar recharts tidak membebani first-load halaman iklan,
// mengikuti pola SalesChart di Beranda.
const AdsTrendChart = dynamic(() => import('../../components/AdsTrendChart'), {
  ssr: false,
  loading: () => <div className="skeleton h-full min-h-[320px] rounded-md" />,
});

const PERIOD_OPTIONS = [
  { id: 'real_time', label: 'Hari Ini (Real-Time)', badge: 'Live' },
  { id: 'yesterday', label: 'Kemarin' },
  { id: 'past7days', label: '7 Hari Terakhir' },
  { id: 'past30days', label: '30 Hari Terakhir' },
];

export default function AdsPage() {
  const [ads, setAds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState('real_time');
  const [campaignSort, setCampaignSort] = useState('spend');
  const [campaignDirection, setCampaignDirection] = useState('desc');
  // Filter status kampanye: 'all' | 'ongoing' (Berjalan) | 'paused' (Dijeda = selain berjalan).
  const [campaignStateFilter, setCampaignStateFilter] = useState('all');
  const syncProgress = useTrickleProgress();
  const { selectedStoreId } = useStore();

  const loadAds = useCallback(async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const response = await fetchShopeeAds({
        period: selectedPeriod,
        sort_by: campaignSort,
        direction: campaignDirection,
        store_id: selectedStoreId || undefined,
      });
      setAds(response?.success ? response : null);
    } catch (err) {
      console.warn('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  }, [period, campaignSort, campaignDirection, selectedStoreId]);

  useEffect(() => {
    loadAds(period);
  }, [loadAds, period]);

  useSnapshotRefresh(() => loadAds(period));

  const sync = async () => {
    setSyncing(true);
    syncProgress.start();
    try {
      await triggerFullSync(selectedStoreId);
      await loadAds(period);
    } finally {
      syncProgress.done();
      setSyncing(false);
    }
  };

  const isRealTime = period === 'real_time';

  // "Berjalan" = kampanye ongoing; "Dijeda" = selain ongoing (paused/ended/closed) —
  // sesuai lencana status pada tabel.
  const CAMPAIGN_STATE_FILTERS = [
    { id: 'all', label: 'Semua' },
    { id: 'ongoing', label: 'Berjalan' },
    { id: 'paused', label: 'Dijeda' },
  ];
  const filteredCampaigns = (ads?.topCampaigns || []).filter((c) => {
    if (campaignStateFilter === 'all') return true;
    if (campaignStateFilter === 'ongoing') return c.state === 'ongoing';
    return c.state !== 'ongoing';
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Iklan"
        description="Kinerja kampanye Product Ads dari Shopee Seller Center secara langsung dan snapshot historis."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70 shadow-sm transition"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sync Iklan'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {isRealTime && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-Time Aktif
            </span>
          )}
          <DataSourceNote meta={ads?.meta} />
        </div>
      </PageHeader>

      {syncProgress.active && (
        <ProgressBar value={syncProgress.value} label="Menyinkronkan data iklan…" showValue height={5} />
      )}

      {/* Period Selection Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Periode Iklan</span>
              {loading && <RefreshCw className="h-3 w-3 animate-spin text-rose-500" />}
            </div>
            <p className="text-[11px] text-slate-500">
              {period === 'real_time' && 'Data performa berjalan hari ini (Real-time)'}
              {period === 'yesterday' && 'Data performa penutupan hari kemarin'}
              {period === 'past7days' && 'Akumulasi performa 7 hari terakhir'}
              {period === 'past30days' && 'Akumulasi performa 30 hari terakhir'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_OPTIONS.map((opt) => {
            const isActive = period === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={loading && isActive}
                onClick={() => setPeriod(opt.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/20'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90'
                } ${loading ? 'opacity-90' : ''}`}
              >
                {opt.badge && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fade-in grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard title="Iklan Dilihat" value={formatNumber(ads?.impressions)} icon={Eye} trend={ads?.trend?.impressions} tone="slate" tip="Berapa kali iklan ditayangkan pada periode yang dipilih." />
        <MetricCard title="Jumlah Klik" value={formatNumber(ads?.clicks)} icon={MousePointerClick} trend={ads?.trend?.clicks} tone="slate" tip="Jumlah klik pada iklan." />
        <MetricCard title="Persentase Klik" value={ads?.ctr !== null && ads?.ctr !== undefined ? formatPercent(ads?.ctr) : '-'} icon={MousePointerClick} trend={ads?.trend?.ctr} tone="slate" tip="Persentase klik pada iklan (CTR)." />
        <MetricCard title="Pesanan" value={formatNumber(ads?.orders)} icon={ShoppingBag} trend={ads?.trend?.orders} tone="slate" tip="Jumlah pesanan yang dihasilkan dari iklan." />
        <MetricCard title="Produk Terjual" value={formatNumber(ads?.itemSold)} icon={ShoppingBag} trend={ads?.trend?.itemSold} tone="slate" tip="Jumlah produk yang terjual dari iklan." />
        <MetricCard title="Penjualan dari Iklan" value={formatIDR(ads?.totalSalesGenerated)} icon={BarChart3} trend={ads?.trend?.sales} tone="slate" tip="Total nilai penjualan dari iklan." />
        <MetricCard title="Biaya Iklan" value={formatIDR(ads?.totalSpend)} icon={BarChart3} trend={ads?.trend?.spend} tone="slate" tip="Total biaya yang dihabiskan untuk iklan." />
        <MetricCard title="ROAS" value={ads?.roas === null || ads?.roas === undefined ? '0,00' : `${Number(ads.roas).toFixed(2).replace('.', ',')}`} icon={Target} trend={ads?.trend?.roas} tone="rose" tip="Return on Ad Spend = penjualan dari iklan ÷ biaya iklan." />
      </div>

      {/* Bento: grafik tren iklan menonjol (2 kolom) di samping AI Optimizer (1 kolom). */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdsTrendChart data={ads?.history || []} />
        </div>
        <div className="xl:col-span-1">
          <AdsAIOptimizerCard adsData={ads} />
        </div>
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Kampanye Produk</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {filteredCampaigns.length} Kampanye
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isRealTime ? 'Menampilkan data performa berjalan hari ini secara real-time.' : 'Data performa sesuai periode yang dipilih.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter status kampanye */}
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {CAMPAIGN_STATE_FILTERS.map((opt) => {
                const active = campaignStateFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCampaignStateFilter(opt.id)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <label className="sr-only" htmlFor="campaign-sort">
              Urutkan kampanye
            </label>
            <select
              id="campaign-sort"
              value={campaignSort}
              onChange={(event) => setCampaignSort(event.target.value)}
              className="ui-select h-9 rounded-md px-3 text-xs font-semibold text-slate-700"
            >
              <option value="spend">Biaya</option>
              <option value="sales">Penjualan</option>
              <option value="roas">ROAS</option>
              <option value="ctr">CTR</option>
              <option value="dailyBudget">Anggaran/hari</option>
              <option value="name">Nama</option>
              <option value="state">Status</option>
            </select>
            <button
              type="button"
              title="Balik arah urutan"
              aria-label="Balik arah urutan"
              onClick={() => setCampaignDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowUpDown className="h-4 w-4" />
              {campaignDirection === 'asc' ? 'Naik' : 'Turun'}
            </button>
            <Link href="/actions" className="text-xs font-semibold text-rose-700 hover:text-rose-800">
              Buka Pusat Tindakan
            </Link>
          </div>
        </div>

        {!loading && !filteredCampaigns.length ? (
          <EmptyState
            title="Data kampanye belum tersedia"
            message={
              ads?.topCampaigns?.length
                ? `Tidak ada kampanye berstatus "${CAMPAIGN_STATE_FILTERS.find((o) => o.id === campaignStateFilter)?.label}".`
                : ads?.meta?.message || 'Jalankan Sync iklan setelah sesi Shopee terhubung.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Kampanye</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Anggaran/hari</th>
                  <th className="px-4 py-3 text-right font-medium">Biaya</th>
                  <th className="px-4 py-3 text-right font-medium">Penjualan</th>
                  <th className="px-4 py-3 text-right font-medium">CTR</th>
                  <th className="px-5 py-3 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: 7 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan="7" className="px-5 py-3">
                        <div className="skeleton h-8 rounded-md" />
                      </td>
                    </tr>
                  ))}
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id || campaign.campaignId} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="max-w-72 truncate font-semibold text-slate-800">{campaign.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{campaign.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={campaign.state === 'ongoing' ? 'Segar' : 'Tertunda'} compact />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatIDR(campaign.dailyBudget)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatIDR(campaign.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatIDR(campaign.sales)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatPercent(campaign.ctr)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {campaign.roas === null || campaign.roas === undefined ? 'Belum tersedia' : `${Number(campaign.roas).toFixed(2)}x`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Histori Snapshot Harian</h2>
            <p className="mt-1 text-xs text-slate-500">Ringkasan tersimpan per hari sinkronisasi.</p>
          </div>
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-right font-medium">Biaya</th>
                  <th className="px-4 py-3 text-right font-medium">Penjualan</th>
                  <th className="px-5 py-3 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(ads?.history || []).map((row) => (
                  <tr key={row.date}>
                    <td className="px-5 py-3 text-slate-700 font-medium">{row.date}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatIDR(row.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatIDR(row.sales)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">
                      {row.roas === null || row.roas === undefined ? 'Belum tersedia' : `${Number(row.roas).toFixed(2)}x`}
                    </td>
                  </tr>
                ))}
                {!ads?.history?.length && (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">
                      Belum ada histori iklan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-sm font-semibold text-slate-900">Audit Normalisasi Nominal</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Nilai mentah disimpan untuk penelusuran. Nilai yang ditampilkan di halaman ini adalah nilai mentah dibagi pembagi transaksi Shopee.
          </p>
          {ads?.amountAudit ? (
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="surface-muted p-3 rounded-md">
                <dt className="text-slate-500">Pembagi</dt>
                <dd className="mt-1 font-semibold text-slate-900">{formatNumber(ads.amountAudit.divisor)}</dd>
              </div>
              <div className="surface-muted p-3 rounded-md">
                <dt className="text-slate-500">Biaya Mentah</dt>
                <dd className="mt-1 break-all font-semibold text-slate-900">{formatNumber(ads.amountAudit.rawSpend)}</dd>
              </div>
              <div className="surface-muted p-3 rounded-md">
                <dt className="text-slate-500">Penjualan Mentah</dt>
                <dd className="mt-1 break-all font-semibold text-slate-900">{formatNumber(ads.amountAudit.rawSales)}</dd>
              </div>
              <div className="surface-muted p-3 rounded-md">
                <dt className="text-slate-500">Voucher Mentah</dt>
                <dd className="mt-1 break-all font-semibold text-slate-900">{formatNumber(ads.amountAudit.rawVoucherSpend)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-5 text-sm text-slate-500">Belum ada nilai audit.</p>
          )}
        </section>
      </div>
    </div>
  );
}
