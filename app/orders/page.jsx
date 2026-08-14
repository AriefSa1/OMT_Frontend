'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, TrendingDown, XCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import DateRangePicker from '../../components/DateRangePicker';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import { fetchDashboardOverview } from '../../lib/api';
import { formatIDR, formatNumber, formatPercent } from '../../lib/utils';
import { useSnapshotRefresh } from '../../lib/hooks';
import { useStore } from '../../context/StoreContext';
import { useDateRange } from '../../context/DateRangeContext';

const SalesChart = dynamic(() => import('../../components/SalesChart'), {
  ssr: false,
  loading: () => <div className="skeleton h-80 rounded-xl" />,
});

export default function OrdersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedStoreId } = useStore();
  const { startDate, endDate } = useDateRange();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Kirim rentang tanggal → KPI, salesTrend, dan orderQuality ikut rentang terpilih.
      const overview = await fetchDashboardOverview(selectedStoreId, 'real_time', { startDate, endDate });
      setData(overview);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useSnapshotRefresh(loadData);

  const orderQuality = data?.orderQuality;
  const salesTrend = data?.salesTrend || [];
  const trend = data?.kpiTrend;

  return (
    <div className="orders-workspace">
      <PageHeader
        title="Riwayat Pesanan"
        description="Pantau GMV, pesanan, kualitas transaksi, dan ritme penjualan dari waktu ke waktu."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker />
            <Link
              href="/settings"
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Pengaturan Toko
            </Link>
          </div>
        }
      >
        <div className="orders-source-line">
          <DataSourceNote meta={data?.dataState?.catalog} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="orders-summary-loading">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton h-32 rounded-xl" key={index} />
          ))}
        </div>
      ) : (
        <>
          {/* Main Order KPIs */}
          <section className="orders-summary-band" aria-label="Ringkasan pesanan">
            <article><p>GMV terkonfirmasi</p><strong>{formatIDR(data?.kpis?.totalGmv)}</strong><span>{trend?.gmv?.direction ? `${Number(trend.gmv.changePercent) > 0 ? '+' : ''}${Number(trend.gmv.changePercent).toFixed(1)}% vs pembanding` : 'Belum ada pembanding'}</span></article>
            <article><p>Pesanan</p><strong>{formatNumber(data?.kpis?.totalOrders)}</strong><span>{trend?.orders?.direction ? `${Number(trend.orders.changePercent) > 0 ? '+' : ''}${Number(trend.orders.changePercent).toFixed(1)}% vs pembanding` : `${formatNumber(data?.kpis?.totalUnits)} unit tercatat`}</span></article>
            <article><p>Nilai rata-rata pesanan</p><strong>{formatIDR(data?.kpis?.averageOrderValue)}</strong><span>GMV per pesanan terkonfirmasi</span></article>
            <article className={Number(orderQuality?.cancelledOrders) > 0 ? 'is-attention' : ''}><p>Pembatalan</p><strong>{formatNumber(orderQuality?.cancelledOrders)}</strong><span>{orderQuality?.cancelledSales == null ? 'Nilai belum tersedia' : `${formatIDR(orderQuality.cancelledSales)} GMV dibatalkan`}</span></article>
          </section>

          {/* Order Quality & Refunds Card */}
          <div className="orders-workbench">
            <div className="orders-chart-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Grafik Tren Penjualan & Pesanan Harian</h2>
                  <p className="text-xs text-slate-500">Visualisasi GMV dan jumlah pesanan harian dari Seller Center.</p>
                </div>
              </div>
              {salesTrend.length > 0 ? (
                <SalesChart data={salesTrend} />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500">
                  Belum ada riwayat pesanan harian tersimpan. Jalankan Sync untuk menarik data.
                </div>
              )}
            </div>

            <aside className="orders-quality-panel">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Kualitas Pesanan & Retur</h2>
                  <p className="text-[11px] text-slate-500">Ringkasan pembatalan dan pengembalian barang.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-semibold text-slate-700">Pesanan Dibatalkan</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatNumber(orderQuality?.cancelledOrders)} pesanan
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-semibold text-slate-700">Nilai GMV Dibatalkan</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatIDR(orderQuality?.cancelledSales)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700">Pesanan Retur / Refund</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatNumber(orderQuality?.returnRefundOrders)} pesanan
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700">Nilai GMV Retur</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatIDR(orderQuality?.returnRefundSales)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] leading-relaxed text-blue-700">
                <p className="font-semibold mb-0.5">Catatan Sumber Data:</p>
                {orderQuality?.provenance?.cancelled || 'Data pembatalan diambil langsung dari Shopee Data Center.'}
              </div>
            </aside>
          </div>

          {/* Daily Orders History Table */}
          <section className="orders-ledger">
            <div className="orders-ledger-header">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tabel Riwayat Pesanan Harian</h3>
                <p className="text-xs text-slate-500">Rincian GMV, pesanan terkonfirmasi, dan pembatalan per tanggal.</p>
              </div>
              <span className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-600">
                {salesTrend.length} Hari Tercatat
              </span>
            </div>

            <div className="table-scroll">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3 text-right">GMV Terkonfirmasi</th>
                    <th className="px-5 py-3 text-right">Jumlah Pesanan</th>
                    <th className="px-5 py-3 text-right">Estimasi AOV</th>
                    <th className="px-5 py-3 text-right">Biaya Iklan (Hari Tersebut)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesTrend.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        Belum ada data pesanan tersimpan.
                      </td>
                    </tr>
                  ) : (
                    salesTrend.map((row) => (
                      <tr key={row.day} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-800">{row.day}</td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-teal-800">
                          {formatIDR(row.gmv)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-700">
                          {formatNumber(row.orders)} pesanan
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-600 font-medium">
                          {row.orders > 0 ? formatIDR(row.gmv / row.orders) : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-600 font-medium">
                          {row.adSpend !== null ? formatIDR(row.adSpend) : <span className="text-slate-400 italic">N/A</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
