'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight, Settings, Database } from 'lucide-react';
import Link from 'next/link';
import { refreshAIDailyBriefing } from '../lib/api';

const URGENCY_STYLES = {
  TINGGI: 'border-rose-200 bg-rose-50 text-rose-800',
  SEDANG: 'border-amber-200 bg-amber-50 text-amber-800',
  RENDAH: 'border-slate-200 bg-slate-50 text-slate-700',
};

/**
 * Briefing tidak lagi dibuat otomatis saat dashboard dimuat.
 *
 * Dua alasan: kunci Gemini yang dipakai ada di kuota gratis 20 permintaan/hari — memuat
 * dashboard berkali-kali saja bisa menghabiskannya — dan analisis ini hanya berguna ketika
 * memang sedang dibaca. Jadi hanya berjalan saat pengguna menekan tombol.
 */
export default function DailyBriefingCard() {
  const [briefing, setBriefing] = useState(null);
  const [provider, setProvider] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const generate = () => {
    setLoading(true);
    setHasRun(true);
    refreshAIDailyBriefing()
      .then((res) => {
        setBriefing(res?.briefing || null);
        setProvider(res?.briefing?.provider || res?.provider || null);
        setNotice(res?.briefing?.message || res?.message || res?.error || null);
      })
      .catch((err) => {
        console.warn('Failed to generate daily briefing:', err);
        setBriefing(null);
        setProvider(null);
        setNotice('Briefing tidak dapat dibuat.');
      })
      .finally(() => setLoading(false));
  };

  const isRealAI = provider === 'REAL_GEMINI_API';
  // criticalAlerts diturunkan backend dari ROAS dan selisih stok yang nyata, jadi tetap
  // ditampilkan meskipun modelnya sendiri gagal menjawab.
  const alerts = Array.isArray(briefing?.criticalAlerts) ? briefing.criticalAlerts : null;
  const actions = Array.isArray(briefing?.priorityActions) ? briefing.priorityActions : [];
  const risks = Array.isArray(briefing?.risks) ? briefing.risks : [];
  const dataGaps = Array.isArray(briefing?.dataGaps) ? briefing.dataGaps : [];

  const trigger = (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
    >
      {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
      {loading ? 'Menganalisa...' : hasRun ? 'Analisa ulang' : 'Buat Analisa'}
    </button>
  );

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isRealAI ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Briefing Harian AI</h2>
            {isRealAI && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Gemini Live
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {briefing?.date || 'Analisa dibuat saat diminta, bukan otomatis — menghemat kuota AI harian.'}
          </p>
        </div>
      </div>
      {trigger}
    </div>
  );

  // Belum pernah dijalankan: jangan tampilkan apa pun selain ajakan menjalankan.
  if (!hasRun) {
    return (
      <section className="surface p-5">
        {header}
        <p className="mt-4 text-xs leading-6 text-slate-600">
          Tekan <span className="font-semibold">Buat Analisa</span> untuk meminta AI membaca snapshot toko
          terbaru dan menyusun tindakan prioritas hari ini beserta alasannya.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="surface p-5" aria-busy="true">
        {header}
        <div className="mt-4 space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
          <div className="skeleton h-20 w-full rounded-md" />
        </div>
      </section>
    );
  }

  if (!isRealAI) {
    return (
      <section className="surface p-5" aria-live="polite">
        {header}
        <p className="mt-4 text-xs leading-6 text-slate-600">{notice || 'Briefing harian belum dapat dibuat.'}</p>
        {provider === 'NOT_CONFIGURED' && (
          <Link
            href="/settings"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Atur kunci API Gemini
          </Link>
        )}
        {alerts?.length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Perhatian dari data snapshot</p>
            <ul className="mt-2 space-y-1.5">
              {alerts.map((alert, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>{alert}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="surface p-5">
      {header}

      {briefing.headline && (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-900">{briefing.headline}</p>
      )}
      {briefing.situation && (
        <p className="mt-2 text-xs leading-6 text-slate-600">{briefing.situation}</p>
      )}

      {actions.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tindakan prioritas</p>
            <Link href="/actions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800">
              Buka Pusat Tindakan <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <ol className="mt-3 space-y-3">
            {actions.map((action, idx) => (
              <li key={idx} className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">{idx + 1}. {action.title}</p>
                  {action.urgency && (
                    <span className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${URGENCY_STYLES[String(action.urgency).toUpperCase()] || URGENCY_STYLES.RENDAH}`}>
                      {action.urgency}
                    </span>
                  )}
                </div>
                <dl className="mt-2 space-y-1.5 text-[11px] leading-5">
                  {action.why && <div><dt className="inline font-semibold text-slate-600">Kenapa: </dt><dd className="inline text-slate-600">{action.why}</dd></div>}
                  {action.how && <div><dt className="inline font-semibold text-slate-600">Caranya: </dt><dd className="inline text-slate-700">{action.how}</dd></div>}
                  {action.expectedImpact && (
                    <div className="flex items-start gap-1.5 pt-1 text-emerald-700">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>{action.expectedImpact}</span>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ol>
        </div>
      )}

      {risks.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Risiko bila dibiarkan</p>
          <ul className="mt-2 space-y-2">
            {risks.map((row, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[11px] leading-5">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
                <span className="text-slate-700"><span className="font-semibold">{row.risk}</span>{row.mitigation ? ` — ${row.mitigation}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(alerts?.length > 0 || dataGaps.length > 0) && (
        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
          {alerts?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Perhatian dari data snapshot</p>
              <ul className="mt-2 space-y-1.5">
                {alerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] leading-5 text-slate-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dataGaps.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Data yang perlu disinkronkan</p>
              <ul className="mt-2 space-y-1.5">
                {dataGaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] leading-5 text-slate-700">
                    <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
