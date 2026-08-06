'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpDown, ChevronDown, ChevronRight, Eye, Layers, Package, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import VariationTable from '../../components/VariationTable';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import { fetchProductDetail, fetchShopeeCatalog, triggerShopeeSync } from '../../lib/api';
import { useDebouncedValue, useSnapshotRefresh } from '../../lib/hooks';
import { formatIDR, formatNumber, formatPercent } from '../../lib/utils';
import { useStore } from '../../context/StoreContext';

export default function ShopeeCatalogPage() {
  const [catalog, setCatalog] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('updatedAt');
  const [direction, setDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const { selectedStoreId } = useStore();
  // Baris varian dibuka per produk. Varian sudah ikut dalam respons katalog, jadi
  // membukanya tidak memicu permintaan baru.
  const [expanded, setExpanded] = useState(() => new Set());
  const deferredSearch = useDebouncedValue(search);
  const [appliedSearch, setAppliedSearch] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    const result = await fetchShopeeCatalog({
      page,
      limit: 20,
      search: appliedSearch,
      category,
      sort,
      direction,
      store_id: selectedStoreId || undefined,
    });
    setCatalog(result?.success ? result : null);
    setLoading(false);
  }, [page, appliedSearch, category, sort, direction, selectedStoreId]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => {
    if (deferredSearch === appliedSearch) return;
    setAppliedSearch(deferredSearch);
    setPage(1);
  }, [deferredSearch, appliedSearch]);
  useSnapshotRefresh(loadCatalog);

  const categories = catalog?.filters?.categories || [];
  const visibleProducts = catalog?.products || [];

  const toggleVariations = (itemId) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    return next;
  });

  const openDetail = async (product) => {
    setSelected(product);
    setDetail(null);
    const result = await fetchProductDetail(product.shopeeItemId);
    if (result?.success) setDetail(result);
  };

  const sync = async () => {
    setSyncing(true);
    await triggerShopeeSync(selectedStoreId);
    await loadCatalog();
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Katalog Shopee" description="Snapshot katalog dari Seller Center. Pencarian dan pengurutan membaca data lokal; Sync mengambil pembaruan secara eksplisit." actions={<button type="button" onClick={sync} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Menyinkronkan' : 'Sync katalog'}</button>}>
        <DataSourceNote meta={catalog?.meta} />
      </PageHeader>

      <section className="surface p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_150px]">
          <label className="relative block"><span className="sr-only">Cari produk</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau SKU" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400" /></label>
          <label><span className="sr-only">Kategori</span><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="ui-select h-10 w-full rounded-md px-3 text-sm text-slate-700"><option value="">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Urutkan menurut</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="ui-select h-10 w-full rounded-md px-3 text-sm text-slate-700"><option value="updatedAt">Pembaruan</option><option value="salesCount">Penjualan</option><option value="views">Tayangan</option><option value="stock">Stok</option><option value="price">Harga</option><option value="name">Nama</option></select></label>
          <button type="button" onClick={() => { setDirection(direction === 'asc' ? 'desc' : 'asc'); setPage(1); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowUpDown className="h-4 w-4" />{direction === 'asc' ? 'Naik' : 'Turun'}</button>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Daftar produk</h2><p className="mt-1 text-xs text-slate-500">Klik baris untuk ringkasan cepat dan detail produk.</p></div><SlidersHorizontal className="h-4 w-4 text-slate-500" /></div>
        <div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Produk</th><th className="px-4 py-3 font-medium">Kategori</th><th className="px-4 py-3 font-medium">Varian</th><th className="px-4 py-3 text-right font-medium">Harga</th><th className="px-4 py-3 text-right font-medium">Stok</th><th className="px-4 py-3 text-right font-medium">Penjualan</th><th className="px-5 py-3 text-right font-medium">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">
          {loading && Array.from({ length: 8 }).map((_, index) => <tr key={index}><td colSpan="7" className="px-5 py-3"><div className="skeleton h-8 rounded-md" /></td></tr>)}
          {!loading && visibleProducts.map((product) => {
            const variationCount = product.variationSummary?.count || 0;
            const isOpen = expanded.has(product.shopeeItemId);
            return (
            <Fragment key={product.shopeeItemId}>
              <tr className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(product)}><td className="px-5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">{product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-cover" /> : <Package className="m-2.5 h-5 w-5 text-slate-400" />}</span><span className="min-w-0"><span className="block max-w-72 truncate font-semibold text-slate-800">{product.name}</span><span className="block max-w-72 truncate text-[11px] text-slate-500">{product.sku || product.shopeeItemId}</span></span></div></td><td className="px-4 py-3 text-slate-600">{product.category || 'Tanpa kategori'}</td>
                <td className="px-4 py-3">
                  {variationCount ? (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleVariations(product.shopeeItemId); }}
                      aria-expanded={isOpen}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isOpen ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                      <Layers className="h-3 w-3" aria-hidden="true" />
                      {variationCount}
                    </button>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-700">{formatIDR(product.price)}</td><td className="px-4 py-3 text-right text-slate-700">{formatNumber(product.stock)}</td><td className="px-4 py-3 text-right text-slate-700">{formatNumber(product.salesCount)}</td><td className="px-5 py-3 text-right"><button type="button" title="Lihat ringkasan produk" aria-label={`Lihat ${product.name}`} onClick={(event) => { event.stopPropagation(); openDetail(product); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"><Eye className="h-4 w-4" /></button></td></tr>
              {isOpen && (
                <tr className="bg-slate-50/60">
                  <td colSpan="7" className="px-5 py-3">
                    <div className="surface overflow-hidden bg-white">
                      <VariationTable variations={product.variations || []} summary={product.variationSummary} compact />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ); })}
          {!loading && !visibleProducts.length && <tr><td colSpan="7" className="p-0"><EmptyState title="Produk tidak ditemukan" message={catalog?.meta?.message || 'Ubah filter atau jalankan Sync katalog.'} /></td></tr>}
        </tbody></table></div>
        <Pagination pagination={catalog?.pagination} onChange={setPage} />
      </section>

      {selected && <div className="fixed inset-0 z-40"><button type="button" aria-label="Tutup detail" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/35" /><aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">Detail produk</p><h2 className="mt-1 truncate text-base font-semibold text-slate-900">{selected.name}</h2></div><button type="button" title="Tutup detail" aria-label="Tutup detail" onClick={() => setSelected(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><DataSourceNote meta={detail?.meta} /><dl className="grid grid-cols-2 gap-3 text-sm"><div className="surface-muted p-3"><dt className="text-xs text-slate-500">Harga</dt><dd className="mt-1 font-semibold text-slate-900">{formatIDR(detail?.product?.price ?? selected.price)}</dd></div><div className="surface-muted p-3"><dt className="text-xs text-slate-500">Stok</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(detail?.product?.stock ?? selected.stock)}</dd></div><div className="surface-muted p-3"><dt className="text-xs text-slate-500">CTR</dt><dd className="mt-1 font-semibold text-slate-900">{formatPercent(detail?.product?.metric?.ctr)}</dd></div><div className="surface-muted p-3"><dt className="text-xs text-slate-500">Pesanan terkonfirmasi</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(detail?.product?.metric?.confirmedOrders)}</dd></div></dl><div className="rounded-md border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500">Kategori kompetitor</p><p className="mt-1 text-sm text-slate-700">{detail?.product?.l2CategoryName || selected.l2CategoryName || 'Belum tersedia'} / {detail?.product?.l3CategoryName || selected.l3CategoryName || 'Belum tersedia'}</p></div><Link href={`/product/${selected.shopeeItemId}`} className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700">Buka detail lengkap</Link></div></aside></div>}
    </div>
  );
}
