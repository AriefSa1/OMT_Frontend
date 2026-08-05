'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Boxes,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Flame,
  FlaskConical,
  Building2,
  Users,
  ArrowUpDown,
  Filter,
  Eye,
  DollarSign,
  XCircle,
  TrendingUp,
  Layers,
} from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import WarehouseDetailModal from '../../components/WarehouseDetailModal';
import { fetchWarehouseInventory, triggerWarehouseSync } from '../../lib/api';
import { useDebouncedValue, useSnapshotRefresh } from '../../lib/hooks';
import { formatIDR, formatNumber } from '../../lib/utils';

export default function WarehousePage() {
  const [inventory, setInventory] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, priority, research, general
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [syncError, setSyncError] = useState('');

  const deferredSearch = useDebouncedValue(search);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const response = await fetchWarehouseInventory({
      page,
      limit: 20,
      search: deferredSearch,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      warehouseId: warehouseFilter || undefined,
      teamId: teamFilter || undefined,
      sortBy,
    });
    setInventory(response?.success ? response : null);
    setLoading(false);
  }, [page, deferredSearch, typeFilter, warehouseFilter, teamFilter, sortBy]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, typeFilter, warehouseFilter, teamFilter, sortBy]);

  useSnapshotRefresh(loadInventory);

  const sync = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const result = await triggerWarehouseSync();
      if (!result?.success) {
        setSyncError(result?.error || result?.message || 'Sinkronisasi PDC Gudang gagal. Data sebelumnya tetap digunakan.');
        return;
      }
      await loadInventory();
    } catch (error) {
      setSyncError(error.message || 'Sinkronisasi PDC Gudang gagal.');
    } finally {
      setSyncing(false);
    }
  };

  const hasActiveFilters = typeFilter !== 'all' || warehouseFilter !== '' || teamFilter !== '' || search !== '';

  const resetFilters = () => {
    setTypeFilter('all');
    setWarehouseFilter('');
    setTeamFilter('');
    setSearch('');
    setSortBy('updated_desc');
    setPage(1);
  };

  const counts = inventory?.counts || { all: 0, priority: 0, research: 0, general: 0 };
  const warehouseOptions = inventory?.filters?.warehouses || [];
  const teamOptions = inventory?.filters?.teams || [];

  const getTypeBadge = (type) => {
    if (type === 'priority') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200">
          <Flame className="w-3 h-3 fill-rose-500" />
          PRIORITY
        </span>
      );
    }
    if (type === 'research') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-600 border border-purple-200">
          <FlaskConical className="w-3 h-3" />
          RESEARCH
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <Boxes className="w-3 h-3 text-slate-400" />
        GENERAL
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gudang & Manajemen Stok"
        description="Inventori fisik terintegrasi dari PDC Gudang API, klasifikasi produk (Priority, Research, General), valuasi aset, lokasi rak gudang, dan rekonsiliasi Shopee."
        actions={
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-70 shadow-sm transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Menyinkronkan PDC Gudang...' : 'Sync PDC Gudang'}
          </button>
        }
      >
        <DataSourceNote meta={inventory?.meta} />
      </PageHeader>

      {syncError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700" role="alert">
          {syncError}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total SKU Terdata"
          value={formatNumber(inventory?.totalSkus)}
          icon={Boxes}
          tone="slate"
          subtitle={`${formatNumber(counts.priority)} Priority · ${formatNumber(counts.research)} Research`}
        />
        <MetricCard
          title="Stok Fisik Tersedia"
          value={formatNumber(inventory?.totalAvailableUnits)}
          icon={Package}
          tone="emerald"
          subtitle={`${formatNumber(inventory?.totalPhysicalUnits)} total unit fisik tercatat`}
        />
        <MetricCard
          title="Estimasi Valuasi Persediaan"
          value={formatIDR(inventory?.totalValuation)}
          icon={DollarSign}
          tone="rose"
          subtitle="Berdasarkan harga satuan x stok fisik"
        />
        <MetricCard
          title="Selisih Rekonsiliasi Shopee"
          value={formatNumber(inventory?.totals?.discrepanciesCount)}
          icon={ShieldAlert}
          tone={Number(inventory?.totals?.discrepanciesCount) ? 'amber' : 'emerald'}
          subtitle={Number(inventory?.totals?.discrepanciesCount) ? 'Perlu tindakan penyesuaian' : 'Semua katalog sinkron sempurna'}
        />
      </div>

      {/* Main Section */}
      <section className="surface overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm bg-white">
        {/* Type Tabs Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 mr-1 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Tipe Produk:
            </span>

            {/* All */}
            <button
              onClick={() => setTypeFilter('all')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Semua Produk</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${typeFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'}`}>
                {formatNumber(counts.all)}
              </span>
            </button>

            {/* Priority */}
            <button
              onClick={() => setTypeFilter('priority')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'priority'
                  ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200'
                  : 'text-slate-600 hover:bg-rose-50/50 hover:text-rose-600'
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Priority</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${typeFilter === 'priority' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'}`}>
                {formatNumber(counts.priority)}
              </span>
            </button>

            {/* Research */}
            <button
              onClick={() => setTypeFilter('research')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'research'
                  ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-200'
                  : 'text-slate-600 hover:bg-purple-50/50 hover:text-purple-600'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
              <span>Research</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${typeFilter === 'research' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}>
                {formatNumber(counts.research)}
              </span>
            </button>

            {/* General */}
            <button
              onClick={() => setTypeFilter('general')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'general'
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                  : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
              <span>General</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${typeFilter === 'general' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                {formatNumber(counts.general)}
              </span>
            </button>
          </div>

          <Link href="/actions" className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
            Tinjau tindakan stok →
          </Link>
        </div>

        {/* Secondary Filters Bar: Search, Warehouse, Team, Sort */}
        <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="lg:col-span-4">
            <label className="relative block">
              <span className="sr-only">Cari SKU, nama produk, atau barcode</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SKU, nama produk, rak..."
                className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </label>
          </div>

          {/* Warehouse Dropdown */}
          <div className="lg:col-span-3">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="ui-select h-9 w-full rounded-xl pl-9 pr-8 text-xs font-medium text-slate-800"
              >
                <option value="">Semua gudang</option>
                {warehouseOptions.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.count} SKU)
                  </option>
                ))}
               </select>
            </div>
          </div>

          {/* Team Dropdown */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="ui-select h-9 w-full rounded-xl pl-9 pr-8 text-xs font-medium text-slate-800"
              >
                <option value="">Semua tim</option>
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="lg:col-span-2">
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
               className="ui-select h-9 w-full rounded-xl pl-9 pr-8 text-xs font-medium text-slate-800"
               >
                 <option value="total_desc">Stok Fisik (Banyak)</option>
                 <option value="total_asc">Stok Fisik (Sedikit)</option>
                 <option value="valuation_desc">Valuasi Tertinggi</option>
                 <option value="valuation_asc">Valuasi Terendah</option>
                 <option value="warehouse_asc">Nama Gudang</option>
                <option value="updated_desc">Terakhir diperbarui</option>
                <option value="name_asc">Nama produk (A-Z)</option>
                <option value="name_desc">Nama produk (Z-A)</option>
                <option value="available_desc">Stok tersedia (banyak)</option>
                <option value="available_asc">Stok tersedia (sedikit)</option>
                <option value="price_desc">Harga tertinggi</option>
                <option value="price_asc">Harga terendah</option>
                <option value="team_asc">Nama tim</option>
              </select>
            </div>
          </div>

          {/* Reset Filter Button */}
          <div className="lg:col-span-1 flex justify-end">
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                title="Reset filter"
                className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reset
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-400">
                {formatNumber(inventory?.pagination?.total || 0)} item
              </span>
            )}
          </div>
        </div>

        {/* Table Content */}
        {!loading && !inventory?.items?.length ? (
          <EmptyState
            title="Tidak ada produk ditemukan"
            message={
              hasActiveFilters
                ? 'Tidak ada produk yang cocok dengan kriteria filter atau pencarian saat ini.'
                : inventory?.meta?.message || 'Lengkapi koneksi PDC Gudang lalu jalankan Sync.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Produk Gudang & SKU</th>
                  <th className="px-3 py-3.5">Tipe</th>
                  <th className="px-3 py-3.5">Tim Pemilik</th>
                  <th className="px-4 py-3.5">Gudang</th>
                  <th className="px-3 py-3.5 text-right">Harga Satuan</th>
                  <th className="px-3 py-3.5 text-right">Stok Fisik</th>
                  <th className="px-3 py-3.5 text-right">Katalog Shopee</th>
                  <th className="px-3 py-3.5 text-right">Selisih</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan="9" className="px-5 py-4">
                        <div className="skeleton h-10 rounded-xl" />
                      </td>
                    </tr>
                  ))}

                {inventory?.items?.map((item) => {
                  const recon = item.reconciliation;
                  const price = item.priceMin ?? item.priceMax ?? null;
                  return (
                    <tr
                      key={`${item.sku}-${item.warehouseId ?? 'all'}`}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Product Name & SKU */}
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name || ''}
                                fill
                                sizes="44px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Package className="m-3 h-5 w-5 text-slate-400" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="block max-w-xs truncate font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-mono font-medium text-slate-400">
                                {item.sku}
                              </span>
                              {item.bundleCount && item.bundleCount > 1 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                  Bundle {item.bundleCount}x
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {getTypeBadge(item.productType)}
                      </td>

                      {/* Team */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Users className="w-3 h-3 text-indigo-500" />
                          {item.teamName || (item.teamId ? `Team ${item.teamId}` : 'Team Belum Ada')}
                        </span>
                      </td>

                      {/* Warehouse Location */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-800 font-bold text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.warehouseName || 'PDC Warehouse'}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <span className="font-extrabold text-slate-800 text-xs">
                          {formatIDR(price)}
                        </span>
                      </td>

                      {/* Physical Stock Breakdown */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-black text-emerald-700 text-xs block">
                            {formatNumber(item.availableStock)} unit
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {item.reservedStock ? `(${formatNumber(item.reservedStock)} tertahan)` : `Total: ${formatNumber(item.totalStock)}`}
                          </span>
                        </div>
                      </td>

                      {/* Shopee Stock */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap text-slate-700 font-medium">
                        {recon ? `${formatNumber(recon.shopeeStock)} unit` : <span className="text-slate-400 italic">Belum link</span>}
                      </td>

                      {/* Variance */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        {recon ? (
                          <span className={`font-bold ${recon.variance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {recon.variance === 0 ? '0 (Pas)' : `${recon.variance > 0 ? '+' : ''}${formatNumber(recon.variance)}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold transition-all border border-slate-200 hover:border-rose-200 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-500" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination pagination={inventory?.pagination} onChange={setPage} />
      </section>

      {/* Product Stock Detail & Mutation History Modal */}
      <WarehouseDetailModal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        sku={selectedItem?.sku}
        item={selectedItem}
        initialWarehouseId={warehouseFilter || selectedItem?.warehouseId || ''}
      />
    </div>
  );
}
