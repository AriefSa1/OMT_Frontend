'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Ban, Lightbulb, RefreshCw, Settings, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { fetchActionAnalysis } from '../lib/api';

const BADGE = {
  TINGGI: 'border-rose-200 bg-rose-50 text-rose-700',
  SEDANG: 'border-amber-200 bg-amber-50 text-amber-700',
  RENDAH: 'border-slate-200 bg-slate-50 text-slate-600',
};
const AREA = {
  PRODUK: 'border-blue-200 bg-blue-50 text-blue-700',
  IKLAN: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  STOK: 'border-orange-200 bg-orange-50 text-orange-700',
  TOKO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

// "gemini-3.6-flash" → "Gemini 3.6 Flash"; provider OpenRouter → "OpenRouter".
function formatModel(model, provider) {
  if (provider === 'REAL_OPENROUTER_API') return 'OpenRouter';
  if (!model || model === 'openrouter') return provider === 'REAL_GEMINI_API' ? 'Gemini' : '';
  return model.replace(/^gemini-/i, 'Gemini ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function Pill({ children, cls }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{children}</span>;
}

const ALL_SECTIONS = ['summary', 'priorityActions', 'deepDives', 'growth', 'avoid', 'dataGaps'];

/**
 * Analisa mendalam AI bersama untuk Pusat Optimasi / Aksi & Tugas / Wawasan Growth.
 * Satu panggilan `/api/ai/action-analysis` (di-cache), tiap tab memilih `show` yang relevan.
 */
export default function AiDeepAnalysis({ show = ALL_SECTIONS, title = 'Analisa Mendalam AI', subtitle = 'Diagnosa berbasis data toko oleh AI — bukan saran umum.' }) {
  const has = (s) => show.includes(s);
  const [state, setState] = useState({ loading: false, data: null, error: null, provider: null });

  const load = useCallback(async (force) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fetchActionAnalysis({ force });
    if (res?.success && res.analysis) {
      setState({ loading: false, data: res.analysis, error: null, provider: res.provider });
    } else {
      setState({ loading: false, data: null, error: res?.message || res?.error || 'Gagal memuat analisa.', provider: res?.provider });
    }
  }, []);

  const a = state.data || {};

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.data && formatModel(state.data.model, state.provider) && (
            <span
              title={`Model: ${state.data.model || state.provider}`}
              className="hidden items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700 sm:inline-flex"
            >
              <Sparkles className="h-3 w-3" />
              {formatModel(state.data.model, state.provider)}
            </span>
          )}
          <button
            type="button"
            onClick={() => load(Boolean(state.data || state.error))}
            disabled={state.loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin' : ''}`} />
            <span>{state.loading ? 'Menganalisa…' : state.data || state.error ? 'Analisa ulang' : 'Buat Analisa'}</span>
          </button>
        </div>
      </div>

      {/* Loading */}
      {state.loading && (
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <p className="text-xs text-slate-400">AI sedang membaca funnel, iklan, dan stok toko… (bisa 30–60 detik)</p>
        </div>
      )}

      {/* Manual initial state: opening a page must not spend limited AI quota. */}
      {!state.loading && !state.data && !state.error && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-fuchsia-500" /> Analisa dijalankan saat diminta</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Tekan Buat Analisa untuk membaca snapshot toko terbaru. Hasilnya disimpan sementara agar berpindah halaman tidak mengulang pemakaian kuota AI.</p>
        </div>
      )}

      {/* Error / not configured */}
      {!state.loading && !state.data && state.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Analisa belum tersedia</div>
          <p className="mt-1 text-xs">{state.error}</p>
          {state.provider === 'NOT_CONFIGURED' && (
            <Link href="/settings" className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
              <Settings className="h-3.5 w-3.5" /> Aktifkan AI di Pengaturan
            </Link>
          )}
        </div>
      )}

      {/* Content */}
      {!state.loading && state.data && (
        <div className="space-y-5">
          {has('summary') && a.executiveSummary && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{a.executiveSummary.headline}</p>
              {a.executiveSummary.readout && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.executiveSummary.readout}</p>}
            </div>
          )}

          {has('priorityActions') && (a.priorityActions || []).length > 0 && (
            <div className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Target className="h-4 w-4 text-rose-500" /> Tindakan Prioritas</h3>
              {a.priorityActions.map((x, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{i + 1}</span>
                    <p className="flex-1 text-sm font-semibold text-slate-900">{x.title}</p>
                    {x.area && <Pill cls={AREA[x.area]}>{x.area}</Pill>}
                    {x.urgency && <Pill cls={BADGE[x.urgency]}>{x.urgency}</Pill>}
                    {x.effort && <Pill>Usaha {x.effort}</Pill>}
                  </div>
                  {x.targetEntity && <p className="mt-1.5 text-xs font-medium text-slate-500">🎯 {x.targetEntity}</p>}
                  {x.why && <p className="mt-1.5 text-sm text-slate-600"><span className="font-semibold text-slate-700">Kenapa: </span>{x.why}</p>}
                  {x.how && <p className="mt-1 text-sm text-slate-600"><span className="font-semibold text-slate-700">Langkah: </span>{x.how}</p>}
                  {x.expectedImpact && <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Dampak: {x.expectedImpact}</p>}
                </div>
              ))}
            </div>
          )}

          {has('deepDives') && a.deepDives && (['product', 'ads', 'stock'].some((k) => (a.deepDives[k] || []).length)) && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Lightbulb className="h-4 w-4 text-amber-500" /> Diagnosa Mendalam</h3>
              {[['product', 'Produk', AREA.PRODUK], ['ads', 'Iklan', AREA.IKLAN], ['stock', 'Stok', AREA.STOK]].map(([key, label, cls]) => (
                (a.deepDives[key] || []).length > 0 && (
                  <div key={key} className="space-y-2">
                    <Pill cls={cls}>{label}</Pill>
                    {a.deepDives[key].map((d, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-sm font-semibold text-slate-900">{d.entity}</p>
                        {d.diagnosis && <p className="mt-1 text-sm text-slate-600">{d.diagnosis}</p>}
                        {d.action && <p className="mt-1.5 text-sm text-slate-700"><span className="font-semibold">→ </span>{d.action}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                          {d.expectedImpact && <span className="font-medium text-emerald-600">{d.expectedImpact}</span>}
                          {d.evidence && <span>Bukti: {d.evidence}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>
          )}

          {has('growth') && a.growth && ((a.growth.opportunities || []).length > 0 || (a.growth.risks || []).length > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {(a.growth.opportunities || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Lightbulb className="h-4 w-4" /> Peluang Tumbuh</h3>
                  {a.growth.opportunities.map((o, i) => (
                    <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
                      <p className="text-sm font-semibold text-slate-900">{o.title}</p>
                      {o.rationale && <p className="mt-1 text-xs text-slate-600">{o.rationale}</p>}
                      {o.move && <p className="mt-1.5 text-sm text-slate-700"><span className="font-semibold">→ </span>{o.move}</p>}
                      {o.expectedImpact && <p className="mt-1.5 text-xs font-semibold text-emerald-700">{o.expectedImpact}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(a.growth.risks || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><ShieldAlert className="h-4 w-4" /> Risiko</h3>
                  {a.growth.risks.map((r, i) => (
                    <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5">
                      <p className="text-sm font-semibold text-slate-900">{r.risk}</p>
                      {r.signal && <p className="mt-1 text-xs text-slate-600">Penanda: {r.signal}</p>}
                      {r.mitigation && <p className="mt-1.5 text-sm text-slate-700"><span className="font-semibold">→ </span>{r.mitigation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {has('avoid') && (a.avoid || []).length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Ban className="h-4 w-4 text-slate-500" /> Justru Jangan Dilakukan</h3>
              {a.avoid.map((x, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-sm font-semibold text-slate-800">{x.thing}</p>
                  {x.reason && <p className="mt-1 text-xs text-slate-600">{x.reason}</p>}
                </div>
              ))}
            </div>
          )}

          {has('dataGaps') && (a.dataGaps || []).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-semibold text-slate-500">Agar analisa berikutnya lebih tajam, sinkronkan:</p>
              <ul className="mt-1 list-inside list-disc text-xs text-slate-500">
                {a.dataGaps.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
