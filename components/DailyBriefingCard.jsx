'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, Trophy, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { fetchAIDailyBriefing } from '../lib/api';

export default function DailyBriefingCard() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBriefing = async () => {
    try {
      const res = await fetchAIDailyBriefing();
      if (res?.success && res.briefing) {
        setBriefing(res.briefing);
      } else if (res?.briefing) {
        setBriefing(res.briefing);
      }
    } catch (err) {
      console.warn('Failed to load daily briefing:', err);
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
      <div className="surface p-5 border-l-4 border-rose-500 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-48"></div>
          <div className="h-6 bg-slate-200 rounded-full w-24"></div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-full"></div>
          <div className="h-3 bg-slate-200 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  const score = briefing.healthScore || 85;
  const isRealAI = briefing.provider === 'REAL_GEMINI_API';

  return (
    <section className="relative overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-br from-white via-rose-50/30 to-amber-50/20 p-5 shadow-sm">
      {/* Decorative gradient blur */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-rose-400/10 blur-2xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm shadow-rose-200">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">AI Daily Executive Briefing</h2>
              {isRealAI && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  Gemini Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">{briefing.date || 'Hari Ini'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-semibold shadow-xs">
            <span className="text-slate-500">Kesehatan Toko:</span>
            <span className={score >= 80 ? 'text-emerald-600 font-bold' : score >= 60 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold'}>
              {score}/100
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Muat ulang briefing AI"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mt-4 rounded-lg bg-white/90 p-3.5 border border-slate-100 text-xs leading-relaxed text-slate-700 shadow-xs">
        <p className="font-medium text-slate-800">{briefing.executiveSummary}</p>
      </div>

      {/* Grid Highlights */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Top Winner */}
        {briefing.topWinner && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-xs">
            <div className="mt-0.5 rounded-md bg-amber-100 p-1 text-amber-700">
              <Trophy className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-900">Produk Terlaris</p>
              <p className="mt-0.5 line-clamp-2 text-slate-700 text-[11px]">{briefing.topWinner}</p>
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-xs">
          <div className="mt-0.5 rounded-md bg-rose-100 p-1 text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-rose-900">Perhatian Mendesak</p>
            {briefing.criticalAlerts && briefing.criticalAlerts.length > 0 ? (
              <p className="mt-0.5 line-clamp-2 text-slate-700 text-[11px]">{briefing.criticalAlerts[0]}</p>
            ) : (
              <p className="mt-0.5 text-emerald-700 text-[11px]">Tidak ada alert kritis aktif.</p>
            )}
          </div>
        </div>

        {/* Market Outlook */}
        {briefing.marketOutlook && (
          <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs">
            <div className="mt-0.5 rounded-md bg-blue-100 p-1 text-blue-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-blue-900">Market Outlook</p>
              <p className="mt-0.5 line-clamp-2 text-slate-700 text-[11px]">{briefing.marketOutlook}</p>
            </div>
          </div>
        )}
      </div>

      {/* Priority Action Tasks Today */}
      {briefing.priorityActionsToday && briefing.priorityActionsToday.length > 0 && (
        <div className="mt-4 border-t border-slate-200/60 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fokus Prioritas Hari Ini</p>
            <Link href="/actions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700">
              Buka Pusat Tindakan <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {briefing.priorityActionsToday.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg bg-white p-2.5 border border-slate-100 text-xs">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span className="text-slate-700 text-[11px] font-medium leading-snug">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
