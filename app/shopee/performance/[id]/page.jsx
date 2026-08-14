'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BarChart3, CheckCircle2, CircleAlert, Eye, MousePointerClick, ShoppingCart, ShoppingBag, Wallet } from 'lucide-react';
import PageHeader from '../../../../components/PageHeader';
import EmptyState from '../../../../components/EmptyState';
import { fetchProductDetail } from '../../../../lib/api';
import { formatIDR, formatNumber, formatPercent } from '../../../../lib/utils';

const METRICS = [
  { key: 'impressions', label: 'Impresi', icon: Eye, format: formatNumber },
  { key: 'clicks', label: 'Klik', icon: MousePointerClick, format: formatNumber },
  { key: 'ctr', label: 'CTR', icon: BarChart3, format: formatPercent },
  { key: 'addToCartBuyers', label: 'Masuk keranjang', icon: ShoppingCart, format: formatNumber },
  { key: 'confirmedOrders', label: 'Pesanan', icon: ShoppingBag, format: formatNumber },
  { key: 'conversionRate', label: 'Konversi', icon: CheckCircle2, format: formatPercent },
  { key: 'confirmedSales', label: 'GMV terkonfirmasi', icon: Wallet, format: formatIDR },
];

function measured(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function buildFindings(product) {
  const metric = product?.metric;
  if (!metric) return [];
  const findings = [];
  if (measured(metric.impressions) && Number(metric.impressions) < 100) findings.push({ level: 'MONITOR', title: 'Sampel trafik belum cukup untuk diagnosis kuat', evidence: `${formatNumber(metric.impressions)} impresi terukur (aturan minimum halaman: 100 impresi).`, action: 'Kumpulkan snapshot berikutnya sebelum menyimpulkan kualitas foto atau judul. Jangan mengubah banyak variabel berdasarkan sampel kecil.' });
  if (measured(metric.impressions) && Number(metric.impressions) >= 100 && measured(metric.ctr) && Number(metric.ctr) < 2) findings.push({ level: 'HIGH', title: 'Klik dari impresi masih rendah', evidence: `CTR terukur ${formatPercent(metric.ctr)} dari ${formatNumber(metric.impressions)} impresi (aturan tinjau: di bawah 2%).`, action: 'Uji satu perubahan utama pada foto pertama atau judul. Pertahankan variabel lain agar dampaknya dapat dibandingkan pada snapshot berikutnya.' });
  if (measured(metric.clicks) && Number(metric.clicks) >= 20 && measured(metric.conversionRate) && Number(metric.conversionRate) < 2) findings.push({ level: 'HIGH', title: 'Trafik belum berubah menjadi pesanan', evidence: `${formatNumber(metric.clicks)} klik dengan konversi ${formatPercent(metric.conversionRate)}.`, action: 'Periksa kecocokan harga, variasi tersedia, ongkir, ulasan, dan kejelasan manfaat pada halaman produk sebelum menambah trafik.' });
  if (measured(metric.addToCartBuyers) && Number(metric.addToCartBuyers) >= 10 && measured(metric.confirmedOrders) && Number(metric.addToCartBuyers) > Number(metric.confirmedOrders) * 2) findings.push({ level: 'MEDIUM', title: 'Banyak calon pembeli berhenti setelah keranjang', evidence: `${formatNumber(metric.addToCartBuyers)} pembeli masuk keranjang dibanding ${formatNumber(metric.confirmedOrders)} pesanan terkonfirmasi.`, action: 'Tinjau total biaya checkout, voucher minimum belanja, stok variasi populer, dan estimasi pengiriman.' });
  if (measured(product.stock) && Number(product.stock) <= 0) findings.push({ level: 'HIGH', title: 'Stok katalog habis', evidence: 'Stok produk terukur 0.', action: 'Pulihkan stok hanya setelah memastikan ketersediaan komponen gudang; jangan menaikkan iklan sebelum stok siap.' });
  if (!findings.length) findings.push({ level: 'MONITOR', title: 'Tidak ada alarm dari aturan terukur', evidence: 'Metrik yang tersedia tidak melewati ambang diagnosis halaman ini.', action: 'Pertahankan baseline dan uji satu perubahan kecil per periode. Gunakan riwayat snapshot untuk memastikan hasilnya konsisten.' });
  return findings;
}

export default function ProductPerformanceDetailPage({ params }) {
  const { id } = use(params);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetchProductDetail(id);
    setSnapshot(response);
    setError(response?.product ? '' : 'Produk atau snapshot performanya tidak ditemukan.');
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const product = snapshot?.product;
  const findings = useMemo(() => buildFindings(product), [product]);

  if (!loading && !product) return <EmptyState title="Performa produk tidak ditemukan" message={error} action={<Link href="/shopee/performance" className="text-xs font-semibold text-teal-700">Kembali ke daftar performa</Link>} />;

  return (
    <div className="space-y-4">
      <PageHeader title={product?.name || 'Detail performa produk'} description="Diagnosis funnel dan tindakan berbasis snapshot produk terukur, terpisah dari pengelolaan katalog." actions={<div className="flex flex-wrap gap-2"><Link href="/shopee/performance" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><ArrowLeft className="h-4 w-4" />Performa</Link>{product && <Link href={`/product/${product.shopeeItemId}`} className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-600 px-3 text-xs font-semibold text-white">Detail katalog<ArrowUpRight className="h-4 w-4" /></Link>}</div>} />

      {loading ? <div className="skeleton h-72 rounded-md" /> : <>
        <section className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map(({ key, label, icon: Icon, format }) => {
            const value = product.metric?.[key];
            return <div key={key} className="min-w-0 bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><Icon className="h-4 w-4 text-teal-600" /></div><p className="mt-2 text-lg font-semibold text-slate-900">{measured(value) ? format(value) : 'Belum tersedia'}</p></div>;
          })}
        </section>

        {!product.metric ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>Snapshot performa produk belum tersedia. Sistem tidak membuat diagnosis dari nilai kosong.</p></div>
        ) : (
          <section className="surface overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Diagnosis & solusi prioritas</h2><p className="mt-1 text-xs text-slate-500">Aturan diagnosis ditampilkan bersama bukti; ini bukan klaim AI dan tidak mengubah Seller Center.</p></div>
            <div className="grid gap-3 p-4 lg:grid-cols-2">{findings.map((item) => <article key={item.title} className="rounded-md border border-slate-200 bg-white p-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${item.level === 'HIGH' ? 'bg-rose-50 text-rose-700' : item.level === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.level === 'MONITOR' ? 'PANTAU' : item.level}</span><h3 className="mt-2 text-sm font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-600"><b>Bukti:</b> {item.evidence}</p><p className="mt-2 text-xs leading-5 text-slate-700"><b>Tindakan:</b> {item.action}</p></article>)}</div>
          </section>
        )}

        <section className="surface overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Riwayat snapshot</h2><p className="mt-1 text-xs text-slate-500">Gunakan perubahan antar-snapshot untuk menilai hasil tindakan.</p></div><div className="table-scroll"><table className="w-full text-left text-xs"><thead><tr><th className="px-5 py-3">Tanggal</th><th className="px-4 py-3 text-right">Impresi</th><th className="px-4 py-3 text-right">CTR</th><th className="px-4 py-3 text-right">Pesanan</th><th className="px-5 py-3 text-right">GMV</th></tr></thead><tbody className="divide-y divide-slate-100">{(product.metricHistory || []).map((row) => <tr key={row.id}><td className="px-5 py-3">{row.date}</td><td className="px-4 py-3 text-right">{formatNumber(row.impressions)}</td><td className="px-4 py-3 text-right">{formatPercent(row.ctr)}</td><td className="px-4 py-3 text-right">{formatNumber(row.confirmedOrders)}</td><td className="px-5 py-3 text-right font-semibold">{formatIDR(row.confirmedSales)}</td></tr>)}{!product.metricHistory?.length && <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-500">Belum ada riwayat snapshot untuk dibandingkan.</td></tr>}</tbody></table></div></section>
      </>}
    </div>
  );
}
