'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ClipboardPlus, RefreshCw, Save, UsersRound } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import EmptyState from '../../../components/EmptyState';
import StatusBadge, { DataSourceNote } from '../../../components/StatusBadge';
import ProductABCopywriter from '../../../components/ProductABCopywriter';
import ProductRestockPredictor from '../../../components/ProductRestockPredictor';
import ProductPricingSimulator from '../../../components/ProductPricingSimulator';
import { createTask, fetchCompetitorIntelligence, fetchProductDetail, refreshCompetitorIntelligence, updateProductEconomics } from '../../../lib/api';
import { formatIDR, formatNumber, formatPercent } from '../../../lib/utils';

export default function ProductDetailPage({ params }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ unitCost: '', unitAdCost: '', shippingCost: '', platformFeePercent: '' });
  const [saving, setSaving] = useState(false);
  const [competitors, setCompetitors] = useState(null);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [message, setMessage] = useState('');
  const itemId = params.id;

  const loadProduct = useCallback(async () => {
    setLoading(true);
    const response = await fetchProductDetail(itemId);
    setSnapshot(response);
    if (response?.product?.economics) {
      const economics = response.product.economics;
      setForm({
        unitCost: economics.unitCost ?? '',
        unitAdCost: economics.unitAdCost ?? '',
        shippingCost: economics.shippingCost ?? '',
        platformFeePercent: economics.platformFeePercent ?? '',
      });
    }
    setLoading(false);
  }, [itemId]);
  useEffect(() => { loadProduct(); }, [loadProduct]);

  const saveEconomics = async (event) => {
    event.preventDefault();
    setSaving(true);
    const response = await updateProductEconomics(itemId, form);
    setMessage(response.success ? 'Data ekonomi produk tersimpan.' : response.error || 'Data ekonomi tidak dapat disimpan.');
    await loadProduct();
    setSaving(false);
  };

  const loadCompetitors = async () => {
    setLoadingCompetitors(true);
    const response = await refreshCompetitorIntelligence(itemId);
    setCompetitors(response?.data || null);
    setMessage(response?.success ? 'Data kompetitor diperbarui.' : response?.data?.message || response?.error || 'Data kompetitor tidak dapat dimuat.');
    setLoadingCompetitors(false);
  };

  const createReviewTask = async () => {
    const product = snapshot?.product;
    if (!product) return;
    const response = await createTask({ id: `PRODUCT-REVIEW-${product.shopeeItemId}`, type: 'PRODUCT_REVIEW', title: `Tinjau produk: ${product.name}`, description: 'Tinjau listing, harga, stok, dan data performa produk secara manual di Seller Center.', source: 'KATALOG_SHOPEE', entityType: 'PRODUCT', entityId: product.shopeeItemId, priority: 'MEDIUM' });
    setMessage(response.message || response.error || 'Tugas diperbarui.');
  };

  const product = snapshot?.product;
  if (!loading && !product) return <EmptyState title="Produk tidak ditemukan" message="Produk tidak ada pada snapshot katalog saat ini." action={<Link href="/shopee" className="text-xs font-semibold text-rose-700">Kembali ke katalog</Link>} />;
  return (
    <div className="space-y-6">
      <PageHeader title={product?.name || 'Detail produk'} description="Data katalog dan performa dari snapshot Shopee. Perubahan ke Seller Center tetap dilakukan secara manual." actions={<Link href="/shopee" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Katalog</Link>}>
        <DataSourceNote meta={snapshot?.meta} />
      </PageHeader>
      {message && <div className="surface-muted flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-700"><span>{message}</span><button type="button" onClick={() => setMessage('')} className="font-semibold text-rose-700">Tutup</button></div>}
      {loading ? <div className="skeleton h-80 rounded-md" /> : <>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="surface p-5"><div className="flex flex-col gap-5 sm:flex-row"><div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-md bg-slate-100">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="160px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Tanpa foto</div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><StatusBadge status={snapshot.meta?.status} compact /><span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">{product.category || 'Tanpa kategori'}</span></div><h2 className="mt-3 text-lg font-semibold text-slate-900">{product.name}</h2><p className="mt-2 text-xs text-slate-500">SKU: {product.sku || product.shopeeItemId}</p><dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-xs text-slate-500">Harga</dt><dd className="mt-1 font-semibold text-slate-900">{formatIDR(product.price)}</dd></div><div><dt className="text-xs text-slate-500">Stok</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(product.stock)}</dd></div><div><dt className="text-xs text-slate-500">Terjual</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(product.salesCount)}</dd></div><div><dt className="text-xs text-slate-500">Rating</dt><dd className="mt-1 font-semibold text-slate-900">{product.rating === null || product.rating === undefined || product.rating === 0 ? 'Belum tersedia' : Number(product.rating).toFixed(1)}</dd></div></dl></div></div></section>
          <section className="surface p-5"><h2 className="text-sm font-semibold text-slate-900">Tindakan</h2><p className="mt-1 text-xs leading-5 text-slate-500">Gunakan tugas untuk menindaklanjuti tanpa perubahan otomatis.</p><button type="button" onClick={createReviewTask} className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700"><ClipboardPlus className="h-4 w-4" />Buat tugas tinjau</button></section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="surface overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-600" /><h2 className="text-sm font-semibold text-slate-900">Performa produk</h2></div><p className="mt-1 text-xs text-slate-500">Snapshot performa yang tersedia dari Seller Center.</p></div><div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">{[{ label: 'Impresi', value: formatNumber(product.metric?.impressions) }, { label: 'Klik', value: formatNumber(product.metric?.clicks) }, { label: 'CTR', value: formatPercent(product.metric?.ctr) }, { label: 'Pesanan', value: formatNumber(product.metric?.confirmedOrders) }, { label: 'Keranjang', value: formatNumber(product.metric?.addToCartBuyers) }, { label: 'Rasio konversi', value: formatPercent(product.metric?.conversionRate) }, { label: 'Bounce rate', value: formatPercent(product.metric?.bounceRate) }, { label: 'Penjualan', value: formatIDR(product.metric?.confirmedSales) }].map((item) => <div key={item.label} className="bg-white p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p></div>)}</div><div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Tanggal</th><th className="px-4 py-3 text-right font-medium">Impresi</th><th className="px-4 py-3 text-right font-medium">CTR</th><th className="px-5 py-3 text-right font-medium">Pesanan</th></tr></thead><tbody className="divide-y divide-slate-100">{(product.metricHistory || []).map((metric) => <tr key={metric.id}><td className="px-5 py-3 text-slate-700">{metric.date}</td><td className="px-4 py-3 text-right text-slate-700">{formatNumber(metric.impressions)}</td><td className="px-4 py-3 text-right text-slate-700">{formatPercent(metric.ctr)}</td><td className="px-5 py-3 text-right font-semibold text-slate-800">{formatNumber(metric.confirmedOrders)}</td></tr>)}{!product.metricHistory?.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">Belum ada snapshot performa produk.</td></tr>}</tbody></table></div></section>
          <form onSubmit={saveEconomics} className="surface p-5"><h2 className="text-sm font-semibold text-slate-900">Ekonomi produk</h2><p className="mt-1 text-xs leading-5 text-slate-500">Isi biaya manual untuk menghitung margin. Kalkulasi tidak dibuat ketika semua nilai belum diisi.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{[{ key: 'unitCost', label: 'Biaya produk per unit' }, { key: 'unitAdCost', label: 'Biaya iklan per unit' }, { key: 'shippingCost', label: 'Biaya pengiriman per unit' }, { key: 'platformFeePercent', label: 'Biaya platform (%)' }].map((field) => <label key={field.key} className="block"><span className="text-xs font-medium text-slate-700">{field.label}</span><input type="number" min="0" step="any" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label>)}</div><div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs text-slate-500">Perkiraan margin per unit</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatIDR(product.economics?.estimatedMargin)}</p>{product.economics?.estimatedMarginPercent !== null && product.economics?.estimatedMarginPercent !== undefined && <p className="mt-1 text-xs text-slate-500">{formatPercent(product.economics.estimatedMarginPercent)} dari harga jual</p>}</div><div className="mt-5 flex justify-end"><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-70"><Save className="h-4 w-4" />{saving ? 'Menyimpan' : 'Simpan ekonomi'}</button></div></form>
        </div>

        {/* AI Features Suite */}
        <div className="space-y-6">
          <ProductABCopywriter product={product} />
          <ProductPricingSimulator product={product} initialEconomics={product.economics} competitorPrice={competitors?.products?.[0]?.price} />
          <ProductRestockPredictor product={product} warehouseStock={snapshot?.warehouseStock || 0} />
        </div>

        <section className="surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><UsersRound className="mt-0.5 h-4 w-4 text-slate-600" /><div><h2 className="text-sm font-semibold text-slate-900">Monitor kompetitor</h2><p className="mt-1 text-xs text-slate-500">Kategori Shopee level 2 dan 3 dipilih otomatis dari snapshot produk.</p></div></div><button type="button" onClick={loadCompetitors} disabled={loadingCompetitors || !product.l2CategoryId || !product.l3CategoryId} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loadingCompetitors ? 'animate-spin' : ''}`} />{loadingCompetitors ? 'Memuat' : 'Muat kompetitor'}</button></div><div className="p-5"><p className="text-xs text-slate-600">Kategori: {product.l2CategoryName || 'Belum tersedia'} / {product.l3CategoryName || 'Belum tersedia'}</p>{competitors?.products?.length ? <div className="table-scroll mt-4"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-medium">Produk</th><th className="px-4 py-3 font-medium">Harga</th><th className="px-4 py-3 font-medium">Penjualan</th></tr></thead><tbody className="divide-y divide-slate-100">{competitors.products.map((item, index) => <tr key={item.itemid || item.item_id || item.id || index}><td className="px-4 py-3 font-medium text-slate-800">{item.name || item.item_name || item.title || 'Produk kompetitor'}</td><td className="px-4 py-3 text-slate-700">{formatIDR(item.price ?? item.price_min)}</td><td className="px-4 py-3 text-slate-700">{formatNumber(item.sold ?? item.sold_count)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">Data kompetitor belum dimuat.</p>}</div></section>
      </>}
    </div>
  );
}
