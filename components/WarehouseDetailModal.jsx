'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Package,
  Building2,
  Users,
  ChevronDown,
  Check,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FlaskConical,
  Boxes,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { formatIDR, formatNumber } from '../lib/utils';
import { fetchWarehouseProductDetail } from '../lib/api';

const ACTIVE_WAREHOUSE_IDS = new Set(['38', '94', '67', '96']);

export default function WarehouseDetailModal({ isOpen, onClose, sku, item = null, initialWarehouseId = '' }) {
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // ALL, IN, OUT
  const [error, setError] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseMenuOpen, setWarehouseMenuOpen] = useState(false);
  const warehouseMenuRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const nextWarehouseId = ACTIVE_WAREHOUSE_IDS.has(String(initialWarehouseId))
        ? String(initialWarehouseId)
        : '';
      setSelectedWarehouseId(nextWarehouseId);
      setWarehouseMenuOpen(false);
    }
  }, [isOpen, initialWarehouseId, sku]);

  useEffect(() => {
    if (!isOpen || !sku) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setDetailData(null);

    fetchWarehouseProductDetail(sku, {
      warehouseId: selectedWarehouseId || undefined,
      variantId: item?.rawVariationId || undefined,
    })
      .then((res) => {
        if (isMounted) {
          if (res?.success) {
            setDetailData(res);
          } else {
            setError(res?.error || 'Gagal memuat rincian produk.');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Terjadi kesalahan sistem.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sku, selectedWarehouseId, item?.rawVariationId]);

  useEffect(() => {
    if (!isOpen || !detailData) return;

    const options = (detailData?.warehouseStockOptions || detailData?.warehouseSkuDetail?.warehouseStockOptions || [])
      .filter((option) => ACTIVE_WAREHOUSE_IDS.has(String(option.warehouseId)));
    if (!options.length) return;

    const currentOption = selectedWarehouseId
      ? options.find((option) => String(option.warehouseId) === String(selectedWarehouseId))
      : null;
    const firstEnabledOption = options.find((option) => !option.disabled);

    if (selectedWarehouseId && (!currentOption || currentOption.disabled)) {
      if (firstEnabledOption) setSelectedWarehouseId(String(firstEnabledOption.warehouseId));
      else setSelectedWarehouseId('');
      return;
    }

    if (!selectedWarehouseId) {
      const activeWarehouseId = detailData?.warehouseSkuDetail?.warehouseId || detailData?.product?.warehouseId;
      const activeOption = options.find((option) => String(option.warehouseId) === String(activeWarehouseId) && !option.disabled);
      const nextOption = activeOption || firstEnabledOption;
      if (nextOption) setSelectedWarehouseId(String(nextOption.warehouseId));
    }
  }, [isOpen, detailData, selectedWarehouseId]);

  useEffect(() => {
    if (!warehouseMenuOpen) return;

    const handleClickOutside = (event) => {
      if (warehouseMenuRef.current && !warehouseMenuRef.current.contains(event.target)) {
        setWarehouseMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [warehouseMenuOpen]);

  const warehouseSkuDetail = detailData?.warehouseSkuDetail;
  const warehouseStockOptions = useMemo(() => {
    const options = detailData?.warehouseStockOptions?.length
      ? detailData.warehouseStockOptions
      : warehouseSkuDetail?.warehouseStockOptions || [];

    return options.filter((option) => ACTIVE_WAREHOUSE_IDS.has(String(option.warehouseId)));
  }, [detailData?.warehouseStockOptions, warehouseSkuDetail?.warehouseStockOptions]);

  if (!isOpen) return null;

  const product = detailData?.product;
  const stats = detailData?.stats;
  const shopee = detailData?.shopeeProduct;
  const movements = detailData?.movements || [];
  const hasVariantDetail = Boolean(warehouseSkuDetail);
  const isSnapshotFallback = detailData?.warehouseDetailSource === 'WAREHOUSE_SNAPSHOT_FALLBACK';
  const noWarehouseMatch = Boolean(warehouseSkuDetail?.noWarehouseMatch);
  const activeVariantId = item?.rawVariationId || warehouseSkuDetail?.variantId;
  const fallbackWarehouseId = ACTIVE_WAREHOUSE_IDS.has(String(product?.warehouseId))
    ? product?.warehouseId
    : '';
  const selectedWarehouseOption = warehouseStockOptions.find((option) => String(option.warehouseId) === String(selectedWarehouseId || fallbackWarehouseId));
  const hasActiveWarehouseOptions = warehouseStockOptions.length > 0;
  const hasActiveWarehouseStock = warehouseStockOptions.some((option) => !option.disabled && Number(option.totalStock || 0) > 0);
  const selectedWarehouseLabel = selectedWarehouseOption?.warehouseName || 'Pilih gudang aktif';
  const displayAvailableStock = selectedWarehouseOption
    ? Number(selectedWarehouseOption.availableStock || 0)
    : hasActiveWarehouseOptions
      ? 0
      : Number(product?.availableStock || 0);
  const displayReservedStock = selectedWarehouseOption
    ? Number(selectedWarehouseOption.reservedStock || 0)
    : hasActiveWarehouseOptions
      ? 0
      : Number(product?.reservedStock || 0);
  const displayTotalStock = selectedWarehouseOption
    ? Number(selectedWarehouseOption.totalStock || 0)
    : hasActiveWarehouseOptions
      ? 0
      : Number(product?.totalStock || 0);
  // Unpriced SKUs have an unknown valuation, not a zero one.
  const unitPrice = product?.priceMin ?? product?.priceMax ?? null;
  const stockValuation = unitPrice === null ? null : unitPrice * displayTotalStock;

  const filteredMovements = movements.filter((m) => {
    if (filterType === 'IN') return m.type === 'IN';
    if (filterType === 'OUT') return m.type === 'OUT';
    return true;
  });

  const getTypeBadge = (type) => {
    if (type === 'priority') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
          <Flame className="w-3 h-3 fill-rose-500" />
          PRIORITY
        </span>
      );
    }
    if (type === 'research') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-200 shadow-sm">
          <FlaskConical className="w-3 h-3" />
          RESEARCH
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
        <Boxes className="w-3 h-3 text-slate-500" />
        GENERAL
      </span>
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-white/40 bg-white/95">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-100/80 flex items-center justify-center text-rose-600 font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Detail Inventori & Riwayat Mutasi Stok
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-sm font-semibold">Memuat rincian stok gudang...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 p-6">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : product ? (
            <>
              {/* Product Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                {/* Photo */}
                <div className="md:col-span-1">
                  <div className="w-full h-44 rounded-2xl overflow-hidden bg-white border border-slate-200 relative shadow-sm flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-slate-300" />
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      {getTypeBadge(product.productType)}
                    </div>
                  </div>
                </div>

                {/* Info Metadata */}
                <div className="md:col-span-3 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {product.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Users className="w-3.5 h-3.5" />
                        {product.teamName || (product.teamId ? `Team ${product.teamId}` : 'Team Belum Ditetapkan')}
                      </span>
                      <div ref={warehouseMenuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => warehouseStockOptions.length && setWarehouseMenuOpen((open) => !open)}
                          disabled={!warehouseStockOptions.length}
                          className="inline-flex h-7 min-w-40 max-w-64 items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-left">{selectedWarehouseLabel}</span>
                          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${warehouseMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {warehouseMenuOpen && (
                          <div className="absolute left-0 top-9 z-30 w-72 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-xl ring-1 ring-slate-900/5">
                            <div className="border-b border-emerald-50 bg-emerald-50/70 px-3 py-2">
                              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Pilih gudang aktif</p>
                            </div>
                            <div className="max-h-56 overflow-y-auto p-1.5">
                              {warehouseStockOptions.map((warehouse) => {
                                const selected = String(warehouse.warehouseId) === String(selectedWarehouseOption?.warehouseId);
                                return (
                                  <button
                                    key={warehouse.warehouseId}
                                    type="button"
                                    disabled={warehouse.disabled}
                                    onClick={() => {
                                      if (warehouse.disabled) return;
                                      setSelectedWarehouseId(String(warehouse.warehouseId));
                                      setWarehouseMenuOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                                      warehouse.disabled
                                        ? 'cursor-not-allowed text-slate-300'
                                        : selected
                                          ? 'bg-emerald-50 text-emerald-800'
                                          : 'text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-800'
                                    }`}
                                  >
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${warehouse.disabled ? 'bg-slate-100' : 'bg-emerald-100 text-emerald-700'}`}>
                                      <Building2 className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-bold">{warehouse.warehouseName}</span>
                                      <span className={`block text-[10px] font-semibold ${warehouse.disabled ? 'text-slate-300' : 'text-emerald-600'}`}>
                                        {formatNumber(warehouse.totalStock)} stok
                                      </span>
                                    </span>
                                    {selected && !warehouse.disabled && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {product.size && product.size !== '-' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          Varian: {product.size}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Valuation */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Harga Satuan</span>
                      <p className="text-sm font-black text-slate-800">
                        {formatIDR(product.priceMin || product.priceMax || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valuasi Stok</span>
                      <p className="text-sm font-black text-rose-600">
                        {formatIDR(stockValuation)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ref ID</span>
                      <p className="text-xs font-mono font-bold text-slate-700 truncate">{product.refId || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bundle Count</span>
                      <p className="text-xs font-bold text-slate-700">{product.bundleCount ? `${product.bundleCount} item` : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-700">Stok Tersedia</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-800">{formatNumber(displayAvailableStock)}</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Siap diproses & dikirim</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-700">Stok Tertahan</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-800">{formatNumber(displayReservedStock)}</p>
                  <span className="text-[10px] text-amber-600 font-medium">Pending order / booked</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-700">Total Stok Gudang</span>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-blue-800">{formatNumber(displayTotalStock)}</p>
                  <span className="text-[10px] text-blue-600 font-medium">Total fisik di gudang ini</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-rose-700">Total Stok Keluar</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-black text-rose-800">-{formatNumber(stats?.totalOut || 0)}</p>
                  <span className="text-[10px] text-rose-600 font-medium">Pesanan MP & mutasi keluar</span>
                </div>
              </div>

              {/* Shopee Cross-Check Note */}
              {activeVariantId && (
                <div className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-xs ${hasVariantDetail && !noWarehouseMatch && hasActiveWarehouseStock && !isSnapshotFallback ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {hasVariantDetail && !noWarehouseMatch && hasActiveWarehouseStock && !isSnapshotFallback ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span className="font-semibold">
                    {isSnapshotFallback
                      ? 'Endpoint live sedang tidak tersedia; stok detail memakai snapshot gudang aktif terakhir yang tervalidasi.'
                      : noWarehouseMatch
                      ? 'Varian ini tidak tercatat pada gudang yang dipilih; stok ditampilkan 0 untuk gudang tersebut.'
                      : hasVariantDetail && hasActiveWarehouseStock
                        ? 'Stok pada kartu di atas sudah mengikuti gudang yang dipilih.'
                        : hasVariantDetail
                          ? 'Varian ini tidak memiliki stok pada empat gudang aktif.'
                          : 'Endpoint detail per gudang belum mengembalikan data; tampilan memakai snapshot lokal terakhir.'}
                  </span>
                </div>
              )}

              {/* Shopee Cross-Check Note */}
              {shopee && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <span className="font-bold text-orange-900">Katalog Shopee Terhubung: </span>
                      <span className="text-orange-800">{shopee.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-600">Stok Shopee: <b className="text-slate-900">{formatNumber(shopee.stock)}</b></span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${Math.abs((shopee.stock || 0) - displayAvailableStock) === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {Math.abs((shopee.stock || 0) - displayAvailableStock) === 0 ? '✓ Sinkron Sempurna' : `Selisih ${Math.abs((shopee.stock || 0) - displayAvailableStock)} unit`}
                    </span>
                  </div>
                </div>
              )}

              {/* Stock Movement Log History */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-black text-slate-800">
                      Riwayat Keluar & Masuk Stok ({filteredMovements.length} Transaksi)
                    </h4>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setFilterType('IN')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterType === 'IN' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-700'}`}
                    >
                      + Masuk (IN)
                    </button>
                    <button
                      onClick={() => setFilterType('OUT')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterType === 'OUT' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-rose-700'}`}
                    >
                      - Keluar (OUT)
                    </button>
                  </div>
                </div>

                {filteredMovements.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Belum ada catatan mutasi stok untuk filter ini.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Waktu & Tanggal</th>
                          <th className="px-3 py-3">Tipe</th>
                          <th className="px-3 py-3 text-right">Jumlah</th>
                          <th className="px-4 py-3">Referensi / No. Order</th>
                          <th className="px-3 py-3">Sumber</th>
                          <th className="px-4 py-3">Keterangan / Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMovements.map((mov) => {
                          const isIn = mov.type === 'IN';
                          return (
                            <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                {formatDate(mov.timestamp)}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                                >
                                  {isIn ? <ArrowDownRight className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                                  {isIn ? 'MASUK (+IN)' : 'KELUAR (-OUT)'}
                                </span>
                              </td>
                              <td className={`px-3 py-3 text-right font-black ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isIn ? `+${formatNumber(mov.quantity)}` : `-${formatNumber(mov.quantity)}`} unit
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-800">
                                {mov.reference || '-'}
                              </td>
                              <td className="px-3 py-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {mov.source}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={mov.note}>
                                {mov.note || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Data terintegrasi dari PDC Gudang API & snapshot sinkronisasi lokal.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
