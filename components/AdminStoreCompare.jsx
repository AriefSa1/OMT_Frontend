'use client';

import { ArrowLeft } from 'lucide-react';
import { formatIDR, formatNumber } from '../lib/utils';

// Versi dasar: membandingkan metrik yang sudah dimuat di tabel statistik. Fitur 3
// (endpoint /admin/analytics/compare) memperdalam ini dengan tren harian, mix kategori,
// dan top produk. Sengaja dipisah supaya fitur statistik bisa berdiri sendiri lebih dulu.

const ROWS = [
  { label: 'Omzet', get: (m) => formatIDR(m?.gmv || 0) },
  { label: 'Order', get: (m) => formatNumber(m?.orders || 0) },
  { label: 'AOV', get: (m) => formatIDR(m?.avgOrderValue || 0) },
  { label: 'Tren omzet', get: (m) => (m?.gmvTrendPct === null || m?.gmvTrendPct === undefined ? '—' : `${m.gmvTrendPct >= 0 ? '+' : ''}${m.gmvTrendPct.toFixed(1)}%`) },
  { label: 'Order dibatalkan', get: (m) => formatNumber(m?.cancelledOrders || 0) },
  { label: 'Rasio batal', get: (m) => `${(m?.cancelRate || 0).toFixed(1)}%` },
  { label: 'Biaya iklan', get: (m) => formatIDR(m?.adsSpend || 0) },
  { label: 'Penjualan iklan', get: (m) => formatIDR(m?.adsSales || 0) },
  { label: 'ROAS', get: (m) => (m?.adsRoas === null || m?.adsRoas === undefined ? '—' : `${m.adsRoas.toFixed(2)}×`) },
  { label: 'Produk terkatalog', get: (m) => formatNumber(m?.productCount || 0) },
];

export default function AdminStoreCompare({ storeIds, days, stores, onBack }) {
  const selected = stores.filter((s) => storeIds.includes(s.storeId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke daftar
        </button>
        <span className="text-xs text-slate-500">Pembanding · periode {days} hari</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Metrik</th>
                {selected.map((s) => (
                  <th key={s.storeId} className="px-4 py-3 text-right">
                    <span className="block text-slate-900">{s.storeName}</span>
                    <span className="text-[10px] font-normal text-slate-400">{s.owner?.name || '—'}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROWS.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-600">{row.label}</td>
                  {selected.map((s) => (
                    <td key={s.storeId} className="px-4 py-3 text-right font-semibold text-slate-800">{row.get(s.metrics)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
