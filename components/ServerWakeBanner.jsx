'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { subscribeServerStatus } from '../lib/api';

/**
 * Banner kecil yang muncul saat backend Render free-tier sedang "bangun" dari tidur —
 * panggilan pertama setelah idle bisa memakan 30-60 detik. Tanpa ini, pengguna hanya
 * melihat skeleton berlama-lama tanpa tahu kenapa. Banner otomatis hilang begitu server
 * merespons ('online'), jadi pada pemakaian normal (server sudah aktif) tak pernah tampil.
 */
export default function ServerWakeBanner() {
  const [status, setStatus] = useState('online');

  useEffect(() => subscribeServerStatus(setStatus), []);

  if (status !== 'waking' && status !== 'offline') return null;

  const offline = status === 'offline';
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium shadow-sm ${
        offline ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
      }`}
    >
      {!offline && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {offline
        ? 'Server tidak merespons. Periksa koneksi, lalu muat ulang halaman.'
        : 'Menghubungkan ke server — mungkin sedang aktif kembali dari mode hemat. Mohon tunggu sebentar…'}
    </div>
  );
}
