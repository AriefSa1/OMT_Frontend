'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, BarChart3, CircleDollarSign, MousePointerClick, RefreshCw, Target, Clock, Zap } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import AdsAIOptimizerCard from '../../components/AdsAIOptimizerCard';
import { fetchShopeeAds, triggerFullSync } from '../../lib/api';
import { useSnapshotRefresh } from '../../lib/hooks';
import { formatIDR, formatNumber, formatPercent } from '../../lib/utils';

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

  const loadAds = useCallback(async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const response = await fetchShopeeAds({
        period: selectedPeriod,
        sort_by: campaignSort,
        direction: campaignDirection,
      });
      setAds(response?.success ? response : null);
    } catch (err) {
      console.warn('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  }, [period, campaignSort, campaignDirection]);

  useEffect(() => {
    loadAds(period);
  }, [loadAds, period]);

  useSnapshotRefresh(() => loadAds(period));

  const sync = async () => {
    setSyncing(true);
    await triggerFullSync();
    await loadAds(period);
    setSyncing(false);
  };

  const isRealTime = period === 'real_time';

  return (
    <div className="space-y-6">
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

      {/* Period Selection Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Periode Iklan:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                period === opt.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {opt.badge && (
                <span className={`h-1.5 w-1.5 rounded-full ${period === opt.id ? 'bg-white' : 'bg-emerald-500'}`} />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Biaya Iklan"
          value={formatIDR(ads?.totalSpend)}
          icon={CircleDollarSign}
          tone="rose"
          subtitle={isRealTime ? 'Total biaya berjalan hari ini' : 'Nilai setelah normalisasi'}
        />
        <MetricCard
          title="Penjualan dari Iklan"
          value={formatIDR(ads?.totalSalesGenerated)}
          icon={BarChart3}
          tone="slate"
          subtitle="GMV yang dihasilkan kampanye"
        />
        <MetricCard
          title="ROAS"
          value={ads?.roas === null || ads?.roas === undefined ? 'Belum tersedia' : `${Number(ads.roas).toFixed(2)}x`}
          icon={Target}
          tone="emerald"
          subtitle="Penjualan dibagi biaya iklan"
        />
        <MetricCard
          title="CTR"
          value={formatPercent(ads?.ctr)}
          icon={MousePointerClick}
          tone="slate"
          subtitle={`${formatNumber(ads?.clicks)} klik dari ${formatNumber(ads?.impressions)} impresi`}
        />
      </div>

      <AdsAIOptimizerCard adsData={ads} />

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Kampanye Produk</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {ads?.topCampaigns?.length || 0} Kampanye
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isRealTime ? 'Menampilkan data performa berjalan hari ini secara real-time.' : 'Data performa sesuai periode yang dipilih.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        {!loading && !ads?.topCampaigns?.length ? (
          <EmptyState
            title="Data kampanye belum tersedia"
            message={ads?.meta?.message || 'Jalankan Sync iklan setelah sesi Shopee terhubung.'}
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
                {ads?.topCampaigns?.map((campaign) => (
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
