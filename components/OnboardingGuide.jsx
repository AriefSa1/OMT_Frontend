'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, RefreshCw, Settings, Store } from 'lucide-react';

export default function OnboardingGuide({ hasStore = false, hasData = false, onSync = null, syncing = false }) {
  const steps = [
    {
      id: 1,
      title: 'Hubungkan Toko Shopee',
      desc: 'Masukkan Cookie / CsrfToken toko Shopee Anda di menu Pengaturan.',
      completed: hasStore,
      action: (
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Pengaturan Toko</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
    {
      id: 2,
      title: 'Jalankan Sinkronisasi Data',
      desc: 'Tarik data katalog, iklan, dan pesanan terbaru dari Seller Center.',
      completed: hasData,
      action: (
        <button
          type="button"
          onClick={onSync}
          disabled={!hasStore || syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs text-left"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Menyinkronkan…' : 'Mulai Sync'}</span>
        </button>
      ),
    },
    {
      id: 3,
      title: 'Pantau Dashboard & Rekomendasi',
      desc: 'Analisis performa toko, kaji stok gudang, dan jalankan tugas optimasi.',
      completed: hasStore && hasData,
      action: (
        <span className="text-[11px] font-semibold text-slate-400">
          Otomatis setelah data tersedia
        </span>
      ),
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-orange-50/50 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-5 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100/80 text-rose-700 text-xs font-black mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>Panduan Memulai Cepat</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Selamat Datang di Pusat Operasi Analytics</h2>
          <p className="text-xs font-medium text-slate-600 mt-1 max-w-2xl">
            Ikuti 3 langkah mudah berikut untuk menghubungkan toko Shopee Anda dan mengaktifkan dasbor analistik lokal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
              step.completed
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200/80 bg-white/90 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                  step.completed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </span>
                {step.completed && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Selesai
                  </span>
                )}
              </div>
              <h3 className="text-xs font-black text-slate-900 mb-1">{step.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{step.desc}</p>
            </div>
            <div>{step.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
