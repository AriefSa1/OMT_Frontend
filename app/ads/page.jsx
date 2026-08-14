'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/ui/Button';
import SegmentedControl, { SegmentedItem } from '../../components/ui/SegmentedControl';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import AdsAIOptimizerCard from '../../components/AdsAIOptimizerCard';
import DateRangePicker from '../../components/DateRangePicker';
import { fetchShopeeAds, triggerSyncAndPoll } from '../../lib/api';
import { useSnapshotRefresh, useTrickleProgress } from '../../lib/hooks';
import { formatIDR, formatNumber, formatPercent } from '../../lib/utils';
import { useStore } from '../../context/StoreContext';
import { useDateRange } from '../../context/DateRangeContext';

// Dimuat dinamis (tanpa SSR) agar recharts tidak membebani first-load halaman iklan,
// mengikuti pola SalesChart di Beranda.
const AdsTrendChart = dynamic(() => import('../../components/AdsTrendChart'), {
  ssr: false,
  loading: () => <div className="skeleton h-full min-h-[320px] rounded-md" />,
});

function AdsPerformanceBand({ ads }) {
  const traffic = [
    { label: 'Iklan dilihat', value: formatNumber(ads?.impressions), trend: ads?.trend?.impressions },
    { label: 'Jumlah klik', value: formatNumber(ads?.clicks), trend: ads?.trend?.clicks },
    { label: 'Persentase klik', value: ads?.ctr !== null && ads?.ctr !== undefined ? formatPercent(ads.ctr) : '-', trend: ads?.trend?.ctr },
    { label: 'Pesanan', value: formatNumber(ads?.orders), trend: ads?.trend?.orders },
    { label: 'Produk terjual', value: formatNumber(ads?.itemSold), trend: ads?.trend?.itemSold },
  ];
  const outcomes = [
    { label: 'Penjualan iklan', value: formatIDR(ads?.totalSalesGenerated), trend: ads?.trend?.sales },
    { label: 'Biaya iklan', value: formatIDR(ads?.totalSpend), trend: ads?.trend?.spend },
    { label: 'ROAS', value: ads?.roas === null || ads?.roas === undefined ? 'Belum tersedia' : `${Number(ads.roas).toFixed(2).replace('.', ',')}x`, trend: ads?.trend?.roas },
  ];
  const trendLabel = (trend) => trend?.direction && Number.isFinite(Number(trend.changePercent)) ? `${Number(trend.changePercent) > 0 ? '+' : ''}${Number(trend.changePercent).toFixed(1)}%` : null;
  return <section className="ads-performance-band" aria-label="Ringkasan performa iklan"><div className="ads-band-group"><p>Performa trafik</p><div>{traffic.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{trendLabel(item.trend) && <em>{trendLabel(item.trend)}</em>}</article>)}</div></div><div className="ads-band-group ads-band-outcomes"><p>Hasil iklan</p><div>{outcomes.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{trendLabel(item.trend) && <em>{trendLabel(item.trend)}</em>}</article>)}</div></div></section>;
}

export default function AdsPage() {
  const [ads, setAds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState('real_time');
  const [campaignSort, setCampaignSort] = useState('spend');
  const [campaignDirection, setCampaignDirection] = useState('desc');
  // Filter status kampanye: 'all' | 'ongoing' (Berjalan) | 'paused' (Dijeda = selain berjalan).
  const [campaignStateFilter, setCampaignStateFilter] = useState('all');
  // Mode rentang custom (dari DateRangePicker) hidup berdampingan dengan selektor
  // periode preset. Aktif hanya setelah user mengubah picker; klik tombol periode
  // mengembalikannya ke mode preset.
  const [useCustomRange, setUseCustomRange] = useState(false);
  const syncProgress = useTrickleProgress();
  const { selectedStoreId } = useStore();
  const { startDate, endDate } = useDateRange();

  // Lewati nilai awal context saat mount; hanya aktifkan mode custom saat user
  // benar-benar mengubah rentang.
  const rangeTouched = useRef(false);
  useEffect(() => {
    if (!rangeTouched.current) { rangeTouched.current = true; return; }
    setUseCustomRange(true);
  }, [startDate, endDate]);

  const loadAds = useCallback(async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const response = await fetchShopeeAds({
        period: selectedPeriod,
        sort_by: campaignSort,
        direction: campaignDirection,
        store_id: selectedStoreId || undefined,
        // Rentang custom menang; backend memprioritaskan start_date/end_date atas period.
        ...(useCustomRange ? { start_date: startDate, end_date: endDate } : {}),
      });
      setAds(response?.success ? response : null);
    } catch (err) {
      console.warn('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  }, [period, campaignSort, campaignDirection, selectedStoreId, useCustomRange, startDate, endDate]);

  useEffect(() => {
    loadAds(period);
  }, [loadAds, period]);

  useSnapshotRefresh(() => loadAds(period));

  const sync = async () => {
    setSyncing(true);
    syncProgress.start();
    try {
      await triggerSyncAndPoll({ storeId: selectedStoreId });
      await loadAds(period);
    } finally {
      syncProgress.done();
      setSyncing(false);
    }
  };

  const isRealTime = period === 'real_time' && !useCustomRange;

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
    <div className="ads-workspace">
      <PageHeader
        title="Iklan"
        description="Kinerja kampanye Product Ads dari Shopee Seller Center secara langsung dan snapshot historis."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker />
            <Button variant="primary" onClick={sync} loading={syncing} icon={RefreshCw} className="ads-sync-button">
              {syncing ? 'Menyinkronkan...' : 'Sync Iklan'}
            </Button>
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

      <AdsPerformanceBand ads={ads} />

      {/* Bento: grafik tren iklan menonjol (2 kolom) di samping AI Optimizer (1 kolom). */}
      <div className="ads-workbench">
        <div className="ads-trend-slot">
          <AdsTrendChart data={ads?.history || []} />
        </div>
        <div className="ads-insight-slot">
          <AdsAIOptimizerCard adsData={ads} />
        </div>
      </div>

      <section className="ads-campaign-ledger">
        <div className="ads-campaign-header">
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
            <SegmentedControl value={campaignStateFilter} onChange={setCampaignStateFilter} aria-label="Filter status kampanye">
              {CAMPAIGN_STATE_FILTERS.map((opt) => (
                <SegmentedItem key={opt.id} value={opt.id}>{opt.label}</SegmentedItem>
              ))}
            </SegmentedControl>
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
            <Button
              variant="secondary"
              icon={ArrowUpDown}
              title="Balik arah urutan"
              aria-label="Balik arah urutan"
              onClick={() => setCampaignDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}
            >
              {campaignDirection === 'asc' ? 'Naik' : 'Turun'}
            </Button>
            <Link href="/actions" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
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
                  <tr key={campaign.id || campaign.campaignId} className="ads-campaign-row">
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

      <div className="ads-lower-grid">
        <section className="ads-history-panel">
          <div className="ads-panel-header">
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

        <section className="ads-audit-panel">
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
