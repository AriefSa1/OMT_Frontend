'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Database, Package } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import StatusBadge, { formatDataTime } from '../components/StatusBadge';
import DailyBriefingCard from '../components/DailyBriefingCard';
import ProductOverviewPanel from '../components/ProductOverviewPanel';
import StoreCrossCheckPanel from '../components/StoreCrossCheckPanel';
import OnboardingGuide from '../components/OnboardingGuide';
import Sparkline from '../components/Sparkline';
import { fetchDashboardOverview, fetchSyncLogs, triggerSyncAndPoll } from '../lib/api';
import { formatIDR, formatNumber, formatPercent } from '../lib/utils';
import { useSnapshotRefresh } from '../lib/hooks';
import { useStore } from '../context/StoreContext';

const SalesChart = dynamic(() => import('../components/SalesChart'), { ssr: false, loading: () => <div className="skeleton h-96 rounded-md" /> });

function MetricLoading() {
  return <div className="space-y-3"><div className="skeleton h-32 rounded-md" /> <div className="skeleton h-24 rounded-md" /></div>;
}

function OverviewBand({ data, trend, historyAvailable }) {
  const gmvSpark = (data?.salesTrend || []).map((row) => Number(row?.gmv)).filter(Number.isFinite);
  const ordersSpark = (data?.salesTrend || []).map((row) => Number(row?.orders)).filter(Number.isFinite);
  const items = [
    {
      label: 'GMV toko',
      value: formatIDR(data?.kpis?.totalGmv),
      trend: trend?.gmv,
      note: historyAvailable ? `Pesanan terkonfirmasi pada ${data?.kpiTrend?.currentDate || 'periode ini'}` : data?.history?.message,
      spark: gmvSpark,
      sparkColor: '#0088b0',
    },
    {
      label: 'Pesanan toko',
      value: formatNumber(data?.kpis?.totalOrders),
      trend: trend?.orders,
      note: historyAvailable ? `Konversi ${formatPercent(data?.kpis?.conversionRate)} · nilai rata-rata ${formatIDR(data?.kpis?.averageOrderValue)}` : 'Tidak dibuat estimasi',
      spark: ordersSpark,
      sparkColor: '#0088b0',
    },
    {
      label: 'Selisih stok',
      value: formatNumber(data?.kpis?.discrepanciesAlerts),
      trend: null,
      note: data?.reconciliationTrust && !data.reconciliationTrust.reliable
        ? data.reconciliationTrust.message
        : `${formatNumber(data?.kpis?.warehouseUnits)} unit tersedia di snapshot`,
      spark: [],
      sparkColor: '#d6006c',
      alert: data?.kpis?.discrepanciesAlerts !== null && data?.kpis?.discrepanciesAlerts !== undefined && Number(data.kpis.discrepanciesAlerts) > 0,
    },
  ];

  return (
    <section className="home-overview-band" aria-label="Ringkasan operasional">
      {items.map(({ label, value, note, trend: itemTrend, spark, sparkColor, alert }) => (
        <article key={label} className="home-overview-item">
          <div className="home-overview-label">{label}</div>
          <p className="home-overview-value" title={String(value)}>{value}</p>
          <div className="home-overview-foot">
            {itemTrend?.direction && <span className={itemTrend.direction === 'down' ? 'home-trend home-trend-down' : 'home-trend'}>{Number(itemTrend.changePercent) > 0 ? '+' : ''}{Number(itemTrend.changePercent).toFixed(1)}%</span>}
            <span>{note}</span>
          </div>
          {spark.length >= 2 && <Sparkline values={spark} color={sparkColor} width={220} height={34} />}
        </article>
      ))}
    </section>
  );
}

function AdsPerformanceRail({ data, trend }) {
  const items = [
    { label: 'Iklan dilihat', value: formatNumber(data?.kpis?.adsImpressions), trend: trend?.adsImpressions },
    { label: 'Jumlah klik', value: formatNumber(data?.kpis?.adsClicks), trend: trend?.adsClicks },
    { label: 'Persentase klik', value: data?.kpis?.adsCtr !== null ? formatPercent(data?.kpis?.adsCtr) : '-', trend: trend?.adsCtr },
    { label: 'Pesanan', value: formatNumber(data?.kpis?.adsOrders), trend: trend?.adsOrders },
    { label: 'Produk terjual', value: formatNumber(data?.kpis?.adsItemSold), trend: trend?.adsItemSold },
    { label: 'Penjualan iklan', value: formatIDR(data?.kpis?.adsSales), trend: trend?.adsSales, emphasis: true },
    { label: 'Biaya iklan', value: formatIDR(data?.kpis?.adsSpend), trend: trend?.adsSpend, invert: true, emphasis: true },
    { label: 'ROAS', value: data?.kpis?.adsRoas === null || data?.kpis?.adsRoas === undefined ? 'Belum tersedia' : `${Number(data.kpis.adsRoas).toFixed(2).replace('.', ',')}`, trend: trend?.adsRoas, accent: true, emphasis: true },
  ];

  return (
    <section className="home-ads-rail" aria-labelledby="ads-performance-title">
      <div className="home-rail-heading">
        <div><p className="home-section-kicker">Ringkasan cepat</p><h2 id="ads-performance-title">Performa iklan</h2></div>
        {trend?.previousDate && <p>vs. {trend.previousDate}{trend.currentIsPartial ? ' · hari ini belum lengkap' : ''}</p>}
      </div>
      <div className="home-ads-grid">
        {items.map((item) => {
          const direction = item.trend?.direction;
          const worse = item.invert ? direction === 'up' : direction === 'down';
          return (
            <article key={item.label} className={`home-ads-metric ${item.accent ? 'home-ads-metric-accent' : ''} ${item.emphasis ? 'home-ads-metric-emphasis' : ''}`}>
              <p>{item.label}</p>
              <div><strong title={String(item.value)}>{item.value}</strong>{direction && <span className={worse ? 'is-negative' : 'is-positive'}>{Number(item.trend.changePercent) > 0 ? '+' : ''}{Number(item.trend.changePercent).toFixed(1)}%</span>}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SourceStatusPanel({ data, logs }) {
  const sources = [
    { key: 'catalog', label: 'Katalog Shopee', meta: data?.dataState?.catalog },
    { key: 'ads', label: 'Iklan Shopee', meta: data?.dataState?.ads },
    { key: 'warehouse', label: 'Gudang', meta: data?.dataState?.warehouse },
  ];
  const latest = logs[0];

  return (
    <aside className="home-status-panel" aria-label="Status data dan langkah berikutnya">
      <div className="home-status-heading"><div><p className="home-section-kicker">Kondisi workspace</p><h2>Status data</h2></div><Database className="text-teal-700" aria-hidden="true" /></div>
      <div className="home-source-list">
        {sources.map((source) => <div key={source.key} className="home-source-row"><span>{source.label}</span><StatusBadge status={source.meta?.status || source.meta?.freshness || 'Tidak Tersedia'} compact /></div>)}
      </div>
      <div className="home-status-ad-summary">
        <p className="home-section-kicker">Iklan hari ini</p>
        <div className="home-status-ad-row"><span>Dilihat · Klik</span><strong>{formatNumber(data?.kpis?.adsImpressions)} · {formatNumber(data?.kpis?.adsClicks)}</strong></div>
        <div className="home-status-ad-row"><span>Biaya · ROAS</span><strong>{formatIDR(data?.kpis?.adsSpend)} · {data?.kpis?.adsRoas === null || data?.kpis?.adsRoas === undefined ? 'Belum tersedia' : Number(data.kpis.adsRoas).toFixed(1)}</strong></div>
      </div>
      {latest && <p className="home-status-last-sync">Aktivitas terakhir: {latest.jobType?.replaceAll('_', ' ')} · {formatDataTime(latest.timestamp)}</p>}
    </aside>
  );
}

function TopProductsTable({ data }) {
  return (
    <section className="home-products surface" aria-labelledby="top-products-title">
      <header><div><p className="home-section-kicker">Snapshot katalog</p><h2 id="top-products-title">Produk katalog teratas</h2></div><Link href="/shopee">Buka katalog <ArrowRight aria-hidden="true" /></Link></header>
      <div className="table-scroll"><table><thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Penjualan</th></tr></thead><tbody>
        {(data?.topProducts || []).slice(0, 5).map((product) => <tr key={product.shopeeItemId}><td><Link href={`/product/${product.shopeeItemId}`} className="home-product-name"><span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded bg-teal-50">{product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="32px" className="object-cover" /> : <Package className="m-1.5 h-5 w-5 text-teal-700" />}</span><span><b>{product.name}</b><small>{product.sku || product.category}</small></span></Link></td><td>{formatIDR(product.price)}</td><td>{formatNumber(product.stock)}</td><td className="font-semibold">{formatNumber(product.salesCount)}</td></tr>)}
        {!data?.topProducts?.length && <tr><td colSpan="4" className="home-table-empty">Belum ada snapshot katalog.</td></tr>}
      </tbody></table></div>
    </section>
  );
}

export default function DashboardOverview() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period] = useState('real_time');
  const { selectedStoreId, stores } = useStore();
  const [syncingGuide, setSyncingGuide] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [overview, logData] = await Promise.all([
      fetchDashboardOverview(selectedStoreId, period),
      fetchSyncLogs(),
    ]);
    setData(overview);
    setLogs(logData?.logs || []);
    setLoading(false);
  }, [selectedStoreId, period]);

  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const handleGuideSync = async () => {
    setSyncingGuide(true);
    try {
      await triggerSyncAndPoll({ storeId: selectedStoreId || null });
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSyncingGuide(false);
    }
  };

  const historyAvailable = data?.history?.orderAvailable;
  const trend = data?.kpiTrend;
  const hasConnectedStore = stores.length > 0;
  const hasCatalogData = Boolean(data?.dataState?.catalog?.hasData);

  return (
    <div className="home-dashboard">
      <PageHeader
        title="Beranda"
        description="Ringkasan kondisi toko, iklan, dan stok dari sumber yang terhubung — tempat memulai setiap pagi."
      >
        <nav className="home-tabs" aria-label="Ringkasan dashboard">
          <Link href="/" aria-current="page">Ikhtisar</Link>
          <Link href="/orders">Penjualan</Link>
          <Link href="/ads">Iklan</Link>
          <Link href="/warehouse">Stok</Link>
        </nav>
      </PageHeader>

      {(!hasConnectedStore || !hasCatalogData) && <div className="home-onboarding"><OnboardingGuide hasStore={hasConnectedStore} hasData={hasCatalogData} onSync={handleGuideSync} syncing={syncingGuide} /></div>}

      {loading ? <MetricLoading /> : <OverviewBand data={data} trend={trend} historyAvailable={historyAvailable} />}

      <div className="home-workbench">
        {historyAvailable ? <SalesChart data={data?.salesTrend || []} note={data?.lastSyncedAt ? `Sync terakhir: ${formatDataTime(data.lastSyncedAt)}` : undefined} /> : <EmptyState title="Histori pesanan belum tersedia" message={data?.history?.message} action={<Link href="/settings" className="text-xs font-semibold text-teal-700 hover:text-teal-800">Buka Pengaturan</Link>} />}
        <SourceStatusPanel data={data} logs={logs} />
      </div>

      <TopProductsTable data={data} />

      {!loading && <AdsPerformanceRail data={data} trend={trend} />}

      <section className="home-insight-layout" aria-labelledby="insight-title">
        <header className="home-layout-heading"><div><p className="home-section-kicker">Diagnosis operasional</p><h2 id="insight-title">Ringkasan produk & toko</h2></div><p>Funnel dan cross-check ditampilkan langsung agar masalah tidak tersembunyi di dalam accordion.</p></header>
        <div className="home-insight-grid">
          <ProductOverviewPanel />
          <aside className="home-briefing-slot"><DailyBriefingCard /></aside>
          <div className="home-crosscheck-slot"><StoreCrossCheckPanel /></div>
        </div>
      </section>

    </div>
  );
}
