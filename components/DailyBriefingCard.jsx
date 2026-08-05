'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Trophy, CheckCircle2, ArrowRight, Settings } from 'lucide-react';
import Link from 'next/link';
import { fetchAIDailyBriefing } from '../lib/api';

export default function DailyBriefingCard() {
  const [briefing, setBriefing] = useState(null);
  const [provider, setProvider] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBriefing = async () => {
    try {
      const res = await fetchAIDailyBriefing();
      setBriefing(res?.briefing || null);
      setProvider(res?.briefing?.provider || res?.provider || null);
      setNotice(res?.briefing?.message || res?.message || res?.error || null);
    } catch (err) {
      console.warn('Failed to load daily briefing:', err);
      setBriefing(null);
      setProvider(null);
      setNotice('Briefing tidak dapat dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBriefing();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBriefing();
  };

  if (loading) {
    return (
      <div className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
        </div>
      </div>
    );
  }

  const isRealAI = provider === 'REAL_GEMINI_API';
  // criticalAlerts are derived from real ROAS and stock figures by the backend, so they
  // are shown even when the model itself is unavailable.
  const alerts = Array.isArray(briefing?.criticalAlerts) ? briefing.criticalAlerts : null;

  const refreshButton = (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      title="Muat ulang briefing"
      aria-label="Muat ulang briefing"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-rose-600' : ''}`} aria-hidden="true" />
    </button>
  );

  // Anything other than a live model result is stated plainly. Previously this path
  // rendered a canned summary, an invented health score and three fixed "priority
  // actions" that were indistinguishable from real analysis.
  if (!isRealAI) {
    return (
      <section className="surface p-5" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Briefing Harian AI</h2>
              <p className="text-[11px] text-slate-500">
                {provider === 'NOT_CONFIGURED' ? 'Belum dikonfigurasi' : 'Tidak tersedia'}
              </p>
            </div>
          </div>
          {refreshButton}
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-600">
          {notice || 'Briefing harian belum dapat dibuat.'}
        </p>

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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Perhatian dari data snapshot
            </p>
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

  const score = Number.isFinite(Number(briefing?.healthScore)) ? Number(briefing.healthScore) : null;

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-600 text-white">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Briefing Harian AI</h2>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Gemini Live
              </span>
            </div>
            {briefing.date && <p className="text-[11px] text-slate-500">{briefing.date}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {score !== null && (
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold">
              <span className="text-slate-500">Kesehatan Toko:</span>
              <span className={score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-rose-700'}>
                {score}/100
              </span>
            </div>
          )}
          {refreshButton}
        </div>
      </div>

      {briefing.executiveSummary && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3.5">
          <p className="text-xs font-medium leading-relaxed text-slate-800">{briefing.executiveSummary}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {briefing.topWinner && (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3">
            <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900">Produk Terlaris</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-700">{briefing.topWinner}</p>
            </div>
          </div>
        )}

        {/* An absent array means the backend could not evaluate alerts; an empty array
            means it evaluated them and found none. Only the latter is an all-clear. */}
        {alerts !== null && (
          <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-rose-900">Perhatian Mendesak</p>
              <p className={`mt-0.5 line-clamp-2 text-[11px] ${alerts.length ? 'text-slate-700' : 'text-emerald-700'}`}>
                {alerts.length ? alerts[0] : 'Tidak ada alert kritis aktif.'}
              </p>
            </div>
          </div>
        )}

        {briefing.marketOutlook && (
          <div className="flex items-start gap-2.5 rounded-md border border-blue-200 bg-blue-50 p-3">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-900">Prospek Pasar</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-700">{briefing.marketOutlook}</p>
            </div>
          </div>
        )}
      </div>

      {briefing.priorityActionsToday?.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fokus Prioritas Hari Ini</p>
            <Link href="/actions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800">
              Buka Pusat Tindakan <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {briefing.priorityActionsToday.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
                <span className="text-[11px] font-medium leading-snug text-slate-700">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
