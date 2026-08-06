'use client';

import { Database } from 'lucide-react';

/**
 * Baris kecil "sumber data" untuk dipasang di kepala tiap panel analitik. Menjawab
 * pertanyaan yang selalu muncul saat membaca angka: dari mana, dan sesegar apa?
 * Konsisten di semua halaman agar pengguna belajar sekali, mengerti di mana pun.
 */
export default function DataSourceNote({ source, cadence, lastUpdated, note, className = '' }) {
  const parts = [];
  if (source) parts.push(source);
  if (cadence) parts.push(cadence);
  if (lastUpdated) parts.push(`terakhir: ${lastUpdated}`);

  return (
    <div className={`flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400 ${className}`}>
      <Database className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        <span className="font-medium text-slate-500">Sumber data:</span> {parts.join(' · ')}
        {note && <span className="block text-slate-400">{note}</span>}
      </span>
    </div>
  );
}
