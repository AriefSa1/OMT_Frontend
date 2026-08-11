'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import MetricCard from '../../components/MetricCard';
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
    <div className="space-y-6">
      <PageHeader
        title="Detail & Riwayat Pesanan"
        description="Analisis performa pesanan, tren harian GMV, tingkat pembatalan, dan retur toko Shopee Anda."
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
        <div className="flex flex-wrap gap-3">
          <DataSourceNote meta={data?.dataState?.catalog} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton h-32 rounded-xl" key={index} />
          ))}
        </div>
      ) : (
        <>
          {/* Main Order KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="GMV Terkonfirmasi"
              value={formatIDR(data?.kpis?.totalGmv)}
              icon={BarChart3}
              tone="slate"
              trend={trend?.gmv}
              subtitle="Nilai penjualan terkonfirmasi pada snapshot terakhir"
            />
            <MetricCard
              title="Total Pesanan"
              value={formatNumber(data?.kpis?.totalOrders)}
              icon={ShoppingBag}
              tone="slate"
              trend={trend?.orders}
              subtitle={`AOV ${formatIDR(data?.kpis?.averageOrderValue)}`}
            />
            <MetricCard
              title="Tingkat Konversi"
              value={formatPercent(data?.kpis?.conversionRate)}
              icon={PackageCheck}
              tone="emerald"
              subtitle="Persentase pembeli dari pengunjung toko"
            />
            <MetricCard
              title="Pesanan Dibatalkan"
              value={orderQuality?.cancelledOrders !== null ? formatNumber(orderQuality?.cancelledOrders) : '0'}
              icon={XCircle}
              tone={orderQuality?.cancelledOrders > 0 ? 'rose' : 'slate'}
              subtitle={orderQuality?.cancelledSales ? `Kerugian GMV: ${formatIDR(orderQuality.cancelledSales)}` : 'Tidak ada pembatalan'}
            />
          </div>

          {/* Order Quality & Refunds Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
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

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
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
                    {formatNumber(orderQuality?.cancelledOrders || 0)} pesanan
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-semibold text-slate-700">Nilai GMV Dibatalkan</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatIDR(orderQuality?.cancelledSales || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700">Pesanan Retur / Refund</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatNumber(orderQuality?.returnRefundOrders || 0)} pesanan
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700">Nilai GMV Retur</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatIDR(orderQuality?.returnRefundSales || 0)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] leading-relaxed text-blue-700">
                <p className="font-semibold mb-0.5">Catatan Sumber Data:</p>
                {orderQuality?.provenance?.cancelled || 'Data pembatalan diambil langsung dari Shopee Data Center.'}
              </div>
            </div>
          </div>

          {/* Daily Orders History Table */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tabel Riwayat Pesanan Harian</h3>
                <p className="text-xs text-slate-500">Rincian GMV, pesanan terkonfirmasi, dan pembatalan per tanggal.</p>
              </div>
              <span className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-600">
                {salesTrend.length} Hari Tercatat
              </span>
            </div>

            <div className="overflow-x-auto">
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
                        <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">
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
          </div>
        </>
      )}
    </div>
  );
}
