'use client';

import { useState } from 'react';
import { ArrowUpRight, Boxes, Database, Filter, RefreshCw, Rocket, Sparkles, TrendingUp } from 'lucide-react';
import AIStatusNotice from './AIStatusNotice';
import { suggestAIScaleUp } from '../lib/api';

const EFFORT_STYLES = {
  RENDAH: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  SEDANG: 'border-amber-200 bg-amber-50 text-amber-800',
  TINGGI: 'border-rose-200 bg-rose-50 text-rose-800',
};

const BOTTLENECK_LABELS = {
  JANGKAUAN: 'Jangkauan — produk kurang terlihat',
  KLIK: 'Klik — terlihat tapi tidak diklik',
  KERANJANG: 'Keranjang — diklik tapi tidak dimasukkan keranjang',
  CHECKOUT: 'Checkout — masuk keranjang tapi tidak jadi pesanan',
};

/**
 * Saran scale-up bertumpu pada sebaran penjualan per varian, jadi tombolnya dinonaktifkan
 * ketika data itu belum ada — tanpa penyebut varian, model hanya bisa mengarang varian
 * mana yang "terlaris". Backend juga menolaknya (MISSING_INPUT); ini hanya mencegah
 * permintaan yang sudah pasti ditolak agar tidak memakan kuota AI.
 */
export default function ProductScaleUpAdvisor({ product }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const summary = product?.variationSummary || null;
  const canAnalyse = Boolean(summary?.hasSoldData);

  const analyse = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await suggestAIScaleUp({
        name: product.name,
        category: product.category || '',
        price: product.price,
        stock: product.stock,
        salesCount: product.salesCount,
        metric: product.metric || null,
        variations: product.variations || [],
        variationSummary: summary,
      });
      setResult(res || null);
    } catch (err) {
      console.warn('Failed to fetch scale-up strategy:', err);
    } finally {
      setLoading(false);
    }
  };

  const strategy = result?.success ? result : null;
  const actions = Array.isArray(strategy?.scaleUpActions) ? strategy.scaleUpActions : [];
  const gaps = Array.isArray(strategy?.dataGaps) ? strategy.dataGaps : [];
  const bottleneck = strategy?.funnelDiagnosis?.bottleneck;

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-600 text-white">
            <Rocket className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Strategi Scale-Up AI</h2>
            <p className="text-xs text-slate-500">Menganalisis sebaran penjualan per varian dan funnel produk untuk menemukan langkah menaikkan penjualan.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={analyse}
          disabled={loading || !canAnalyse}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
          {loading ? 'Menganalisa...' : result ? 'Analisa ulang' : 'Buat strategi'}
        </button>
      </div>

      <div className="p-5">
        {!canAnalyse ? (
          <p className="text-xs leading-6 text-slate-600">
            {summary?.message || 'Penjualan per varian belum tersedia untuk produk ini, sehingga strategi scale-up berbasis varian belum dapat disusun.'}
          </p>
        ) : !result ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 py-8 text-center">
            <TrendingUp className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Belum ada strategi yang dibuat</p>
            <p className="mt-1 max-w-sm text-[11px] text-slate-500">
              AI akan membaca {summary.count} varian produk ini beserta metrik funnel-nya, lalu menyusun langkah konkret untuk menaikkan penjualan.
            </p>
          </div>
        ) : !strategy ? (
          <AIStatusNotice result={result} />
        ) : (
          <div className="space-y-5">
            {strategy.verdict && (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold leading-6 text-slate-800">{strategy.verdict}</p>
            )}

            {strategy.variantStrategy && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Strategi varian</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {[
                    { key: 'doubleDown', label: 'Dorong', icon: ArrowUpRight, tone: 'border-emerald-200 bg-emerald-50/60 text-emerald-900' },
                    { key: 'fix', label: 'Perbaiki', icon: Filter, tone: 'border-amber-200 bg-amber-50/60 text-amber-900' },
                    { key: 'retire', label: 'Hentikan', icon: Boxes, tone: 'border-slate-200 bg-slate-50 text-slate-700' },
                  ].map(({ key, label, icon: Icon, tone }) => strategy.variantStrategy[key] ? (
                    <div key={key} className={`rounded-md border p-3 ${tone}`}>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-5">{strategy.variantStrategy[key]}</p>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}

            {strategy.funnelDiagnosis && (
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hambatan funnel</p>
                <p className="mt-1.5 text-xs font-semibold text-slate-900">{BOTTLENECK_LABELS[bottleneck] || bottleneck || 'Belum ditentukan'}</p>
                <dl className="mt-2 space-y-1 text-[11px] leading-5">
                  {strategy.funnelDiagnosis.evidence && <div><dt className="inline font-semibold text-slate-600">Bukti: </dt><dd className="inline text-slate-600">{strategy.funnelDiagnosis.evidence}</dd></div>}
                  {strategy.funnelDiagnosis.fix && <div><dt className="inline font-semibold text-slate-600">Perbaikan: </dt><dd className="inline text-slate-700">{strategy.funnelDiagnosis.fix}</dd></div>}
                </dl>
              </div>
            )}

            {actions.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Langkah menaikkan penjualan</p>
                <ol className="mt-2 space-y-2.5">
                  {actions.map((action, idx) => (
                    <li key={idx} className="rounded-md border border-slate-200 bg-white p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">{idx + 1}. {action.action}</p>
                        {action.effort && (
                          <span className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${EFFORT_STYLES[String(action.effort).toUpperCase()] || EFFORT_STYLES.SEDANG}`}>
                            Usaha {String(action.effort).toLowerCase()}
                          </span>
                        )}
                      </div>
                      {action.how && <p className="mt-1.5 text-[11px] leading-5 text-slate-700">{action.how}</p>}
                      {action.expectedImpact && <p className="mt-1 text-[11px] leading-5 text-emerald-700">Dampak: {action.expectedImpact}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {strategy.stockRisk && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                <span className="font-semibold">Risiko stok: </span>{strategy.stockRisk}
              </p>
            )}

            {gaps.length > 0 && (
              <div className="border-t border-slate-200 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Data yang perlu disinkronkan</p>
                <ul className="mt-1.5 space-y-1">
                  {gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-600">
                      <Database className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
