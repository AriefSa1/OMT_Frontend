'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, MinusCircle, Loader2, RefreshCw, Store, Warehouse, Sparkles } from 'lucide-react';
import { fetchConnectionHealth } from '../lib/api';

const POLL_MS = 20000;

// Peta status probe backend → tampilan. Tiga keadaan sesuai permintaan:
// connected → "Terhubung", disconnected → "Belum terhubung", error → "Gagal menghubungkan".
const STATE = {
  connected: {
    label: 'Terhubung',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  disconnected: {
    label: 'Belum terhubung',
    dot: 'bg-slate-400',
    chip: 'bg-slate-50 text-slate-600 border-slate-200',
    Icon: MinusCircle,
  },
  error: {
    label: 'Gagal menghubungkan',
    dot: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    Icon: XCircle,
  },
  checking: {
    label: 'Memeriksa…',
    dot: 'bg-amber-400 animate-pulse',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: Loader2,
  },
};

const SOURCES = [
  { key: 'shopee', title: 'Toko (Shopee)', short: 'Toko', SourceIcon: Store },
  { key: 'warehouse', title: 'Gudang (PDC)', short: 'Gudang', SourceIcon: Warehouse },
  { key: 'ai', title: 'AI (Gemini/OpenRouter)', short: 'AI', SourceIcon: Sparkles },
];

// ── Poller singkron (module-level) ──────────────────────────────────────────
// Satu interval dipakai bersama semua komponen (navbar pill + panel Settings),
// supaya probe Shopee tidak jalan dobel saat keduanya tampil bersamaan.
let sharedState = { data: null, loading: true, checkedAt: null };
const subscribers = new Set();
let sharedTimer = null;
let inFlight = null;

function emit() {
  subscribers.forEach((fn) => fn(sharedState));
}

async function runProbe() {
  if (inFlight) return inFlight;
  sharedState = { ...sharedState, loading: true };
  emit();
  inFlight = (async () => {
    try {
      const res = await fetchConnectionHealth();
      if (res?.success) {
        sharedState = { data: res, loading: false, checkedAt: res.checkedAt || new Date().toISOString() };
      } else {
        sharedState = { ...sharedState, loading: false };
      }
    } catch {
      sharedState = { ...sharedState, loading: false }; // pertahankan status lama
    } finally {
      inFlight = null;
      emit();
    }
  })();
  return inFlight;
}

function useConnectionHealth() {
  const [snap, setSnap] = useState(sharedState);
  useEffect(() => {
    subscribers.add(setSnap);
    if (subscribers.size === 1) {
      // subscriber pertama memulai polling; jika sudah ada data segar, tampilkan dulu
      setSnap(sharedState);
      runProbe();
      sharedTimer = setInterval(runProbe, POLL_MS);
    } else {
      setSnap(sharedState);
    }
    return () => {
      subscribers.delete(setSnap);
      if (subscribers.size === 0 && sharedTimer) {
        clearInterval(sharedTimer);
        sharedTimer = null;
      }
    };
  }, []);
  return { ...snap, refresh: runProbe };
}

function viewFor(probe, loading) {
  return loading && !probe ? STATE.checking : (STATE[probe?.status] || STATE.checking);
}

// ── Panel penuh (halaman Settings) ───────────────────────────────────────────
function SourceRow({ title, SourceIcon, probe, loading }) {
  const view = viewFor(probe, loading);
  const { Icon } = view;
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <SourceIcon className="h-4 w-4 text-slate-400" />
        <span>{title}</span>
      </div>
      <div className="mt-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${view.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${view.dot}`} />
          <Icon className={`h-3.5 w-3.5 ${view.label === 'Memeriksa…' ? 'animate-spin' : ''}`} />
          {view.label}
        </span>
      </div>
      {probe?.detail && (
        <p className="mt-2 truncate text-xs text-slate-500" title={probe.detail}>{probe.detail}</p>
      )}
    </div>
  );
}

export default function ConnectionStatus() {
  const { data, loading, checkedAt, refresh } = useConnectionHealth();
  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Status koneksi sumber data</h2>
          <p className="mt-1 text-xs text-slate-500">
            Dicek realtime dengan menguji koneksi langsung ke setiap sumber
            {checkedAt ? ` — terakhir ${new Date(checkedAt).toLocaleTimeString('id-ID')}` : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Periksa</span>
        </button>
      </div>
      <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {SOURCES.map(({ key, title, SourceIcon }) => (
          <SourceRow key={key} title={title} SourceIcon={SourceIcon} probe={data?.[key]} loading={loading} />
        ))}
      </div>
    </section>
  );
}

// ── Pill ringkas (navbar) ────────────────────────────────────────────────────
// Tiga titik status Toko/Gudang/AI + popover detail saat hover. Klik → /settings.
export function ConnectionStatusPill() {
  const { data, loading, checkedAt } = useConnectionHealth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const onLeave = useCallback(() => setOpen(false), []);

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={onLeave}
    >
      <Link
        href="/settings"
        title="Status koneksi sumber data"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-xs hover:border-slate-300 hover:bg-slate-50 transition"
      >
        {SOURCES.map(({ key, short, SourceIcon }) => {
          const view = viewFor(data?.[key], loading);
          return (
            <span key={key} className="inline-flex items-center gap-1" title={`${short}: ${view.label}`}>
              <SourceIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className={`h-2 w-2 rounded-full ${view.dot}`} />
            </span>
          );
        })}
      </Link>

      {open && (
        <div className="dropdown-panel absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50">
          <div className="px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Status Koneksi (realtime)
          </div>
          <div className="space-y-0.5">
            {SOURCES.map(({ key, title, SourceIcon }) => {
              const probe = data?.[key];
              const view = viewFor(probe, loading);
              return (
                <div key={key} className="flex items-start gap-2 rounded-lg px-1.5 py-1.5">
                  <SourceIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-slate-700">{title}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${view.dot}`} />
                      <span className="text-[11px] font-semibold text-slate-600">{view.label}</span>
                    </div>
                    {probe?.detail && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400" title={probe.detail}>{probe.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 border-t border-slate-100 px-1.5 pt-1.5 text-[10px] text-slate-400">
            {checkedAt ? `Terakhir dicek ${new Date(checkedAt).toLocaleTimeString('id-ID')}` : 'Memeriksa…'} · klik untuk kelola
          </div>
        </div>
      )}
    </div>
  );
}
