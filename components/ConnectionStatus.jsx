'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  { key: 'shopee', title: 'Toko (Shopee)', SourceIcon: Store },
  { key: 'warehouse', title: 'Gudang (PDC)', SourceIcon: Warehouse },
  { key: 'ai', title: 'AI (Gemini/OpenRouter)', SourceIcon: Sparkles },
];

function SourceRow({ title, SourceIcon, probe, loading }) {
  const view = loading && !probe ? STATE.checking : (STATE[probe?.status] || STATE.checking);
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(null);
  const timer = useRef(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConnectionHealth();
      if (!mounted.current) return;
      if (res?.success) {
        setData(res);
        setCheckedAt(res.checkedAt || new Date().toISOString());
      }
    } catch {
      // biarkan status lama; polling berikutnya akan mencoba lagi
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

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
          onClick={load}
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
