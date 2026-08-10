'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  Building2,
  CheckCircle2,
  Database,
  Eye,
  Filter,
  Flame,
  FlaskConical,
  Layers,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import MetricCard from '../../../components/MetricCard';
import StatusBadge, { DataSourceNote } from '../../../components/StatusBadge';
import WarehouseTeamOverview from '../../../components/WarehouseTeamOverview';
import { fetchReconciliation, fetchWarehouseInventory, fetchWarehouseTeamOverview, triggerWarehouseSync } from '../../../lib/api';
import { formatIDR, formatNumber, formatPercent } from '../../../lib/utils';
import { useSnapshotRefresh } from '../../../lib/hooks';
import { useStore } from '../../../context/StoreContext';

export default function WarehousePerformancePage() {
  const [data, setData] = useState(null);
  const [teamOverview, setTeamOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, CRITICAL, DISCREPANCY, MATCHED
  const [search, setSearch] = useState('');
  const { selectedStoreId } = useStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reconRes, teamRes] = await Promise.all([
        fetchReconciliation(selectedStoreId),
        fetchWarehouseTeamOverview(),
      ]);
      setData(reconRes?.success ? reconRes : null);
      setTeamOverview(teamRes);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useSnapshotRefresh(loadData);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerWarehouseSync();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const totals = data?.totals || { totalAvailableUnits: 0, discrepanciesCount: 0, totalSkus: 0 };
  const reconciliationTrust = data?.reconciliationTrust;
  const items = data?.reconciliation || [];

  const filteredItems = items.filter((row) => {
    if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return row.sku?.toLowerCase().includes(q) || row.warehouseName?.toLowerCase().includes(q);
    }
    return true;
  });

  const criticalCount = items.filter((i) => i.status === 'CRITICAL').length;
  const discrepancyCount = items.filter((i) => i.status === 'DISCREPANCY').length;
  const matchedCount = items.filter((i) => i.status === 'MATCHED').length;
  const accuracyRate = items.length > 0 ? (matchedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performa Marketplace (Gudang)"
        description="Analisis akurasi rekonsiliasi stok Shopee vs Gudang, pemetaan lokasi rak, performa tim gudang, dan mitigasi risiko selisih SKU."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-70 shadow-xs transition"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Menyinkronkan…' : 'Sync Gudang & Rekonsiliasi'}</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <DataSourceNote meta={data?.meta} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skeleton h-32 rounded-xl" key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Main KPI Matrix */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Akurasi Rekonsiliasi"
              value={formatPercent(accuracyRate)}
              icon={CheckCircle2}
              tone={accuracyRate >= 90 ? 'emerald' : accuracyRate >= 70 ? 'amber' : 'rose'}
              subtitle={`${matchedCount} SKU cocok dari total ${items.length} SKU`}
            />
            <MetricCard
              title="Selisih Kritis (Critical)"
              value={formatNumber(criticalCount)}
              icon={ShieldAlert}
              tone={criticalCount > 0 ? 'rose' : 'emerald'}
              subtitle="Selisih stok > 10 unit dengan Shopee"
            />
            <MetricCard
              title="Perlu Penyesuaian"
              value={formatNumber(discrepancyCount)}
              icon={AlertTriangle}
              tone={discrepancyCount > 0 ? 'amber' : 'slate'}
              subtitle="Selisih stok ringan (1-10 unit)"
            />
            <MetricCard
              title="Total Unit Gudang"
              value={formatNumber(totals.totalAvailableUnits)}
              icon={Boxes}
              tone="slate"
              subtitle="Tersedia di PDC Warehouse"
            />
          </div>

          {/* Reconciliation Trust Status */}
          {reconciliationTrust && !reconciliationTrust.reliable && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-800 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 mb-0.5">Peringatan Rekonsiliasi Stok</p>
                <p className="leading-relaxed">{reconciliationTrust.message}</p>
              </div>
            </div>
          )}

          {/* Warehouse Team Performance Overview */}
          <WarehouseTeamOverview data={teamOverview} />

          {/* Discrepancy & Reconciliation Matrix Table */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Matriks Rekonsiliasi Stok (Shopee vs Gudang)</h3>
                <p className="text-xs text-slate-500">Perbandingan real-time antara stok aktif di Seller Center dengan stok fisik di PDC Gudang.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari SKU..."
                    className="h-8 w-44 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                  {[
                    { id: 'ALL', label: 'Semua' },
                    { id: 'CRITICAL', label: 'Kritis', badge: criticalCount },
                    { id: 'DISCREPANCY', label: 'Selisih', badge: discrepancyCount },
                    { id: 'MATCHED', label: 'Pas', badge: matchedCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-md transition ${
                        statusFilter === tab.id
                          ? 'bg-white text-rose-700 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">SKU & Produk</th>
                    <th className="px-4 py-3">Gudang</th>
                    <th className="px-4 py-3 text-right">Stok Shopee</th>
                    <th className="px-4 py-3 text-right">Stok Gudang</th>
                    <th className="px-4 py-3 text-right">Selisih (Variance)</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada SKU yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((row) => (
                      <tr key={row.sku} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3">
                          <span className="font-mono font-bold text-slate-900 block">{row.sku}</span>
                          <span className="text-[11px] text-slate-500 max-w-xs truncate block">{row.name || 'SKU Gudang'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{row.warehouseName || 'PDC Warehouse'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {formatNumber(row.shopeeStock)} unit
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {formatNumber(row.warehouseStock)} unit
                        </td>
                        <td className="px-4 py-3 text-right font-black">
                          <span className={row.variance === 0 ? 'text-emerald-600' : row.status === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}>
                            {row.variance === 0 ? '0 (Pas)' : `${row.variance > 0 ? '+' : ''}${formatNumber(row.variance)}`}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center whitespace-nowrap">
                          {row.status === 'MATCHED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> MATCHED
                            </span>
                          )}
                          {row.status === 'DISCREPANCY' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" /> SELISIH
                            </span>
                          )}
                          {row.status === 'CRITICAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              <ShieldAlert className="w-3 h-3" /> KRITIS
                            </span>
                          )}
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
