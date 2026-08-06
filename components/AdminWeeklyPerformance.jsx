'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Package, RefreshCw, TrendingDown, Wallet } from 'lucide-react';
import { fetchAdminStores, fetchAdminWeeklyPerformance, downloadAdminDecliningCsv } from '../lib/api';
import { formatNumber, formatIDR } from '../lib/utils';
import Sparkline from './Sparkline';

const WEEK_OPTIONS = [4, 8, 12];
const METRICS = [
  { value: 'visitors', label: 'Pengunjung (UV)' },
  { value: 'units', label: 'Unit Terjual' },
  { value: 'sales', label: 'Omzet' },
];

// Diagnosis → warna, label, dan langkah tindakan yang disarankan. Inilah yang mengubah
// "produk ini turun" menjadi "lakukan ini".
const DIAGNOSIS = {
  TRAFIK_DAN_KONVERSI: {
    label: 'Trafik & konversi turun', color: 'bg-rose-100 text-rose-700 border-rose-200', dot: '#e11d48',
    action: 'Prioritas tinggi — pengunjung dan pembelian sama-sama turun. Tinjau iklan sekaligus harga/stok/listing.',
  },
  TRAFIK: {
    label: 'Trafik turun', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: '#d97706',
    action: 'Pengunjung berkurang. Periksa iklan, kata kunci, dan peringkat pencarian produk.',
  },
  KONVERSI: {
    label: 'Konversi turun', color: 'bg-violet-100 text-violet-700 border-violet-200', dot: '#7c3aed',
    action: 'Pengunjung ada tapi tidak membeli. Cek harga, stok, ulasan, dan kualitas foto/deskripsi.',
  },
  RINGAN: {
    label: 'Penurunan ringan', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: '#64748b',
    action: 'Penurunan kecil. Cukup dipantau untuk saat ini.',
  },
};

function fmtByMetric(value, metric) {
  return metric === 'sales' ? formatIDR(value || 0) : formatNumber(value || 0);
}

function Pct({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  const down = value < 0;
  return (
    <span className={`font-semibold ${down ? 'text-rose-600' : value > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(0)}%
    </span>
  );
}

// Satu "pilar" metrik (UV / Unit / Omzet) dengan ikon, sparkline, dan tren bersih.
function MetricPillar({ icon: Icon, label, series, metricKey }) {
  const down = (series?.netPct ?? 0) < 0;
  return (
    <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500"><Icon className="h-3 w-3" />{label}</span>
        <Pct value={series?.netPct} />
      </div>
      <div className="mt-1.5">
        <Sparkline values={series?.weekly || []} color={down ? '#e11d48' : '#059669'} width={110} height={26} />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">
        {(series?.weekly || []).map((v) => fmtByMetric(v, metricKey)).join(' → ')}
      </p>
    </div>
  );
}

function DecliningCard({ product, primaryMetric }) {
  const diag = DIAGNOSIS[product.diagnosis] || DIAGNOSIS.RINGAN;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{product.name}</p>
          <p className="text-[11px] text-slate-400">{product.category} · <span className="font-mono">{product.shopeeItemId}</span></p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${diag.color}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: diag.dot }} />
          {diag.label}
        </span>
      </div>

      {/* Sorotan penurunan metrik penentu */}
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-rose-50/60 px-3 py-2">
        <TrendingDown className="h-5 w-5 shrink-0 text-rose-500" />
        <div className="text-xs">
          <span className="font-semibold text-rose-700">Turun {product.declineStreak} minggu berturut</span>
          <span className="text-slate-500"> · total </span>
          <span className="font-semibold text-rose-700">{product.netChangePct === null ? '—' : `${product.netChangePct.toFixed(0)}%`}</span>
          <span className="text-slate-500"> pada {METRICS.find((m) => m.value === primaryMetric)?.label}</span>
        </div>
      </div>

      {/* Tiga pilar metrik berdampingan */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <MetricPillar icon={Eye} label="UV" series={product.metrics?.visitors} metricKey="visitors" />
        <MetricPillar icon={Package} label="Unit" series={product.metrics?.units} metricKey="units" />
        <MetricPillar icon={Wallet} label="Omzet" series={product.metrics?.sales} metricKey="sales" />
      </div>

      {/* Rekomendasi tindakan */}
      <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-700">Tindakan: </span>{diag.action}
      </p>
    </div>
  );
}

function SummaryCard({ label, value, tone = 'slate', dot }) {
  const tones = {
    rose: 'text-rose-700', amber: 'text-amber-700', violet: 'text-violet-700', slate: 'text-slate-900',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminWeeklyPerformance() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [metric, setMetric] = useState('visitors');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetchAdminStores();
      if (res.success) {
        const list = res.data?.stores || [];
        setStores(list);
        if (list.length && !storeId) setStoreId(list[0].storeId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const res = await fetchAdminWeeklyPerformance(storeId, weeks, metric);
    if (res.success) { setData(res.data); setError(''); }
    else { setError(res.error || 'Gagal memuat performa mingguan.'); setData(null); }
    setLoading(false);
  }, [storeId, weeks, metric]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async () => {
    if (!storeId) return;
    setDownloading(true);
    const res = await downloadAdminDecliningCsv(storeId, weeks, metric);
    if (!res.success) setError(res.error || 'Gagal mengunduh CSV.');
    setDownloading(false);
  };

  const products = data?.products || [];
  const declining = products.filter((p) => p.declining);
  const stable = products.filter((p) => !p.declining);
  const breakdown = data?.diagnosisBreakdown || {};
  const metricLabel = data?.metricLabel || METRICS.find((m) => m.value === metric)?.label;

  const selectClass = 'h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none';

  return (
    <div className="space-y-5">
      {/* Kontrol */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Toko</span>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={`${selectClass} min-w-44`}>
              {stores.length === 0 && <option value="">Tidak ada toko</option>}
              {stores.map((s) => <option key={s.storeId} value={s.storeId}>{s.storeName || s.storeId}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Metrik penentu</span>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectClass}>
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Jumlah minggu</span>
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className={selectClass}>
              {WEEK_OPTIONS.map((w) => <option key={w} value={w}>{w} minggu</option>)}
            </select>
          </label>
          <button type="button" onClick={load} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-600' : 'text-slate-500'}`} /> Muat
          </button>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || declining.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          title={declining.length === 0 ? 'Tidak ada produk menurun untuk diunduh' : 'Unduh CSV produk menurun'}
        >
          <Download className={`h-4 w-4 ${downloading ? 'animate-pulse' : ''}`} />
          {downloading ? 'Menyiapkan…' : `Unduh CSV (${declining.length})`}
        </button>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Kartu ringkasan: langsung tampak sifat masalahnya */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Produk Menurun" value={loading ? '…' : formatNumber(declining.length)} tone="rose" />
        <SummaryCard label="Trafik Turun" value={loading ? '…' : formatNumber((breakdown.TRAFIK || 0) + (breakdown.TRAFIK_DAN_KONVERSI || 0))} tone="amber" dot="#d97706" />
        <SummaryCard label="Konversi Turun" value={loading ? '…' : formatNumber((breakdown.KONVERSI || 0) + (breakdown.TRAFIK_DAN_KONVERSI || 0))} tone="violet" dot="#7c3aed" />
        <SummaryCard label="Total Produk Aktif" value={loading ? '…' : formatNumber(products.length)} />
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
          <span className="mt-2 block">Memuat…</span>
        </div>
      ) : (
        <>
          {/* Produk perlu ditindak — kartu diagnosis */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-slate-900">Produk Perlu Ditindak</h3>
              <span className="text-xs text-slate-500">· menurun pada {metricLabel} · streak ≥ 2 minggu</span>
            </div>
            {declining.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
                Tidak ada produk yang menurun pada {metricLabel} untuk periode ini.
                <span className="mt-1 block text-xs text-slate-400">Data terisi seiring akumulasi snapshot harian.</span>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {declining.map((p) => <DecliningCard key={p.shopeeItemId} product={p} primaryMetric={metric} />)}
              </div>
            )}
          </div>

          {/* Produk stabil/naik — tabel ringkas untuk referensi */}
          {stable.length > 0 && (
            <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700">
                Produk lain ({stable.length}) — stabil atau naik
              </summary>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Produk</th>
                      <th className="px-3 py-2.5">Tren {metricLabel}</th>
                      {data?.weeks?.map((w) => <th key={w.label} className="px-3 py-2.5 text-right" title={`${w.start} s/d ${w.end}`}>{w.label}</th>)}
                      <th className="px-3 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stable.map((p) => (
                      <tr key={p.shopeeItemId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5"><span className="font-medium text-slate-800">{p.name}</span><span className="block text-[10px] text-slate-400">{p.category}</span></td>
                        <td className="px-3 py-2.5"><Sparkline values={p.weekly} color={(p.netChangePct ?? 0) < 0 ? '#e11d48' : '#059669'} width={80} height={22} /></td>
                        {p.weekly.map((v, i) => <td key={i} className="px-3 py-2.5 text-right tabular-nums text-slate-600">{fmtByMetric(v, metric)}</td>)}
                        <td className="px-3 py-2.5 text-right"><Pct value={p.netChangePct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      <p className="text-[11px] text-slate-400">
        Metrik penentu memicu status "menurun"; ketiga metrik (UV/Unit/Omzet) selalu ditampilkan agar diagnosis penyebab jelas. Minggu = blok 7 hari dari hari ini ke belakang. CSV memuat produk menurun + diagnosis + tren ketiga metrik.
      </p>
    </div>
  );
}
