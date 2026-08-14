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
          className="inline-flex items-center gap-1.5 rounded-[4px] bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-teal-700"
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
          className="inline-flex items-center gap-1.5 rounded-[4px] bg-slate-900 px-3 py-1.5 text-xs font-bold text-left text-white shadow-xs transition hover:bg-teal-900 disabled:opacity-50"
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
    <section className="onboarding-guide">
      <div className="onboarding-guide-header">
        <div>
          <div className="onboarding-guide-kicker">
            <Store className="w-3.5 h-3.5" />
            <span>Mulai cepat</span>
          </div>
          <h2>Siapkan pusat operasi</h2>
          <p>Hubungkan toko, tarik snapshot pertama, lalu mulai pantau kondisi toko.</p>
        </div>
      </div>

      <div className="onboarding-steps">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`onboarding-step ${
              step.completed
                ? 'is-complete'
                : ''
            }`}
          >
            <div>
              <div className="onboarding-step-number">
                <span>
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </span>
                {step.completed && (
                    <span className="onboarding-complete">
                    Selesai
                  </span>
                )}
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
            <div className="onboarding-step-action">{step.action}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
