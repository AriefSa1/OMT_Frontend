'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BarChart3, Boxes, Eye, MousePointerClick, Package, ShoppingBag, Target, TriangleAlert } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import StatusBadge, { DataSourceNote, formatDataTime } from '../components/StatusBadge';
import DailyBriefingCard from '../components/DailyBriefingCard';
import TrafficSourcePanel from '../components/TrafficSourcePanel';
import { fetchDashboardOverview, fetchSyncLogs, fetchTrafficSources } from '../lib/api';
import { formatIDR, formatNumber, formatPercent } from '../lib/utils';
import { useSnapshotRefresh } from '../lib/hooks';
import { useStore } from '../context/StoreContext';

const SalesChart = dynamic(() => import('../components/SalesChart'), {
  ssr: false,
  loading: () => <div className="skeleton h-96 rounded-md" />,
});

const CategoryPieChart = dynamic(() => import('../components/CategoryPieChart'), {
  ssr: false,
  loading: () => <div className="skeleton h-96 rounded-md" />,
});

function MetricLoading() {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div className="skeleton h-32 rounded-md" key={index} />)}</div>;
}

export default function DashboardOverview() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedStoreId } = useStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [overview, logData, trafficData] = await Promise.all([
      fetchDashboardOverview(selectedStoreId),
      fetchSyncLogs(),
      fetchTrafficSources(7, selectedStoreId),
    ]);
    setData(overview);
    setLogs(logData?.logs || []);
    setTraffic(trafficData);
    setLoading(false);
  }, [selectedStoreId]);

  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const historyAvailable = data?.history?.orderAvailable;
  // The KPI is one day, not a running total — name the day so it cannot be read as a sum.
  const latestDay = data?.salesTrend?.length ? data.salesTrend[data.salesTrend.length - 1].day : null;
  const trend = data?.kpiTrend;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Beranda"
        description="Ringkasan operasional berbasis snapshot lokal. Gunakan Sync pada header untuk memperbarui data dari sumber terhubung."
        actions={<Link href="/settings" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Pengaturan koneksi</Link>}
      >
        <div className="flex flex-wrap gap-3">
          <DataSourceNote meta={data?.dataState?.catalog} />
          <DataSourceNote meta={data?.dataState?.ads} />
          <DataSourceNote meta={data?.dataState?.warehouse} />
        </div>
      </PageHeader>

      {trend?.previousDate && (
        <p className="text-xs text-slate-500">
          Statistik harian dibandingkan terhadap {trend.previousDate}.
          {trend.currentIsPartial && ' Hari ini masih berjalan, jadi angkanya belum utuh — penurunan pada panah bisa jadi hanya karena harinya belum selesai.'}
        </p>
      )}

      {loading ? <MetricLoading /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="GMV terakhir" value={formatIDR(data?.kpis?.totalGmv)} icon={BarChart3} tone="slate" trend={trend?.gmv} subtitle={historyAvailable ? `Pesanan terkonfirmasi pada ${latestDay || 'hari terakhir tersimpan'}` : data?.history?.message} />
          <MetricCard title="Pesanan terakhir" value={formatNumber(data?.kpis?.totalOrders)} icon={ShoppingBag} tone="slate" trend={trend?.orders} subtitle={historyAvailable ? `Konversi ${formatPercent(data?.kpis?.conversionRate)} · nilai rata-rata ${formatIDR(data?.kpis?.averageOrderValue)}` : 'Tidak dibuat estimasi'} />
          <MetricCard title="ROAS iklan" value={data?.kpis?.roas === null || data?.kpis?.roas === undefined ? 'Belum tersedia' : `${Number(data.kpis.roas).toFixed(2)}x`} icon={Target} tone="rose" trend={trend?.roas} subtitle={`Biaya ${formatIDR(data?.kpis?.adSpend)}`} />
          <MetricCard title="Impresi iklan" value={formatNumber(data?.kpis?.impressions)} icon={Eye} tone="slate" trend={trend?.impressions} subtitle="Tayangan iklan pada snapshot iklan terakhir" />
          <MetricCard title="Klik iklan" value={formatNumber(data?.kpis?.clicks)} icon={MousePointerClick} tone="slate" trend={trend?.clicks} subtitle={data?.kpis?.impressions ? `CTR ${formatPercent((Number(data.kpis.clicks) / Number(data.kpis.impressions)) * 100)}` : 'CTR belum dapat dihitung'} />
          {/* A null count means "not measurable" and must not render as a green all-clear. */}
          <MetricCard
            title="Selisih stok"
            value={formatNumber(data?.kpis?.discrepanciesAlerts)}
            icon={Boxes}
            tone={data?.kpis?.discrepanciesAlerts === null || data?.kpis?.discrepanciesAlerts === undefined
              ? 'slate'
              : Number(data.kpis.discrepanciesAlerts) ? 'amber' : 'emerald'}
            subtitle={data?.reconciliationTrust && !data.reconciliationTrust.reliable
              ? data.reconciliationTrust.message
              : `${formatNumber(data?.kpis?.warehouseUnits)} unit tersedia di snapshot`}
          />
        </div>
      )}

      <DailyBriefingCard />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {historyAvailable
            ? <SalesChart data={data?.salesTrend || []} note={data?.lastSyncedAt ? `Sync terakhir: ${formatDataTime(data.lastSyncedAt)}` : undefined} />
            : <EmptyState title="Histori pesanan belum tersedia" message={data?.history?.message} action={<Link href="/settings" className="text-xs font-semibold text-rose-700 hover:text-rose-800">Buka Pengaturan</Link>} />}
        </div>

        <section className="surface p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Aktivitas Sync</h2><p className="mt-1 text-xs text-slate-500">Hasil jalur Sync eksplisit dan cron.</p></div><Link href="/settings" className="text-xs font-semibold text-rose-700">Lihat koneksi</Link></div>
          <div className="mt-4 space-y-3">
            {logs.length ? logs.slice(0, 6).map((log) => <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-700">{log.jobType.replaceAll('_', ' ')}</p><StatusBadge status={log.status === 'SUCCESS' ? 'Segar' : log.status === 'DEGRADED' ? 'Tertunda' : 'Gagal'} compact /></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{log.message}</p><p className="mt-1 text-[11px] text-slate-400">{formatDataTime(log.timestamp)}</p></div>) : <p className="text-sm text-slate-500">Belum ada riwayat Sync.</p>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="surface overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Produk katalog teratas</h2><p className="mt-1 text-xs text-slate-500">Urut berdasarkan penjualan snapshot katalog.{data?.topProductsMeta?.message ? ` ${data.topProductsMeta.message}` : ''}</p></div><Link href="/shopee" className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">Buka katalog <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          {/* The table is what overflows, so the scroll container has to be the table's
              own wrapper — on the <section> the header scrolled with it. */}
          <div className="table-scroll"><table className="w-full text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Produk</th><th className="px-4 py-3 font-medium">Harga</th><th className="px-4 py-3 font-medium">Stok</th><th className="px-5 py-3 text-right font-medium">Penjualan</th></tr></thead><tbody className="divide-y divide-slate-100">
            {(data?.topProducts || []).map((product) => <tr key={product.shopeeItemId} className="hover:bg-slate-50"><td className="px-5 py-3"><Link href={`/product/${product.shopeeItemId}`} className="flex min-w-0 items-center gap-3"><span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-100">{product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="36px" className="object-cover" /> : <Package className="m-2 h-5 w-5 text-slate-400" />}</span><span className="min-w-0"><span className="block max-w-72 truncate font-semibold text-slate-800">{product.name}</span><span className="block truncate text-[11px] text-slate-500">{product.sku || product.category}</span></span></Link></td><td className="px-4 py-3 font-medium text-slate-700">{formatIDR(product.price)}</td><td className="px-4 py-3 text-slate-700">{formatNumber(product.stock)}</td><td className="px-5 py-3 text-right font-semibold text-slate-800">{formatNumber(product.salesCount)}</td></tr>)}
            {!data?.topProducts?.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">Belum ada snapshot katalog.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="surface p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Status persediaan</h2><p className="mt-1 text-xs text-slate-500">Hasil rekonsiliasi snapshot terakhir.</p></div><TriangleAlert className="h-5 w-5 text-amber-600" /></div><dl className="mt-5 space-y-4"><div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">SKU dalam audit</dt><dd className="font-semibold text-slate-900">{formatNumber(data?.reconciliationSummary?.skus)}</dd></div><div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">Selisih terdeteksi</dt><dd className="font-semibold text-slate-900">{formatNumber(data?.reconciliationSummary?.discrepanciesCount)}</dd></div><div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">Stok tersedia</dt><dd className="font-semibold text-slate-900">{formatNumber(data?.reconciliationSummary?.totalAvailableUnits)}</dd></div></dl><Link href="/warehouse" className="mt-6 inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Buka gudang</Link></section>
        <CategoryPieChart
          data={data?.categorySales || []}
          title="Pangsa penjualan per kategori"
          subtitle={data?.categorySalesMeta?.message}
          message={data?.categorySalesMeta?.message}
          provenance={data?.categorySalesMeta?.provenance}
        />

        <section className="surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Pembatalan dan retur</h2>
              <p className="mt-1 text-xs text-slate-500">
                {data?.orderQuality?.days
                  ? `${data.orderQuality.days} hari tersimpan (${data.orderQuality.from} s.d. ${data.orderQuality.to})`
                  : 'Belum ada hari tersimpan.'}
              </p>
            </div>
            <TriangleAlert className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          {data?.orderQuality?.days ? (
            <dl className="mt-5 space-y-4">
              <div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">Pesanan batal</dt><dd className="font-semibold text-slate-900">{formatNumber(data.orderQuality.cancelledOrders)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">Nilai pesanan batal</dt><dd className="font-semibold text-slate-900">{formatIDR(data.orderQuality.cancelledSales)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">Retur / refund</dt><dd className="font-semibold text-slate-900">{formatNumber(data.orderQuality.returnRefundOrders)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sm text-slate-600">Nilai retur / refund</dt><dd className="font-semibold text-slate-900">{formatIDR(data.orderQuality.returnRefundSales)}</dd></div>
            </dl>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-500">{data?.orderQuality?.message}</p>
          )}
          {/* Asal angka dinyatakan eksplisit — sebelumnya panel ini tidak menjelaskan
              pesanan batal/retur itu dihitung dari mana dan atas dasar apa. */}
          {data?.orderQuality?.provenance && (
            <dl className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500">
              <div><dt className="inline font-semibold text-slate-600">Sumber: </dt><dd className="inline">{data.orderQuality.provenance.source} <span className="font-mono">{data.orderQuality.provenance.endpoint}</span> (tipe pesanan: {data.orderQuality.provenance.orderType})</dd></div>
              <div><dt className="inline font-semibold text-slate-600">Pesanan batal: </dt><dd className="inline">{data.orderQuality.provenance.cancelled}</dd></div>
              <div><dt className="inline font-semibold text-slate-600">Retur / refund: </dt><dd className="inline">{data.orderQuality.provenance.returnRefund}</dd></div>
            </dl>
          )}
          {/* Shopee publishes no denominator for a cancellation rate, so none is shown. */}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Angka absolut dari Seller Center. Persentase pembatalan tidak dihitung karena penyebutnya tidak tersedia.</p>
        </section>

        <TrafficSourcePanel traffic={traffic} loading={loading} />
      </div>
    </div>
  );
}
