'use client';

import { useConnectionHealth } from './ConnectionStatus';

// Peta sumber snapshot → kunci koneksi live (SOURCES di ConnectionStatus).
// Dipakai agar badge kesegaran tidak menampilkan "Dijeda" saat koneksi sumbernya aktif.
const SOURCE_TO_CONNECTION = {
  SHOPEE_SNAPSHOT: 'shopee',
  SHOPEE_ADS_SNAPSHOT: 'shopee',
  KATALOG_SHOPEE: 'shopee',
  IKLAN_SHOPEE: 'shopee',
  WAREHOUSE_SNAPSHOT: 'warehouse',
  GUDANG: 'warehouse',
};

const STATUS_STYLES = {
  Segar: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Tertunda: 'border-amber-200 bg-amber-50 text-amber-800',
  'Perlu Koneksi': 'border-slate-200 bg-slate-50 text-slate-700',
  Gagal: 'border-rose-200 bg-rose-50 text-rose-700',
  'Tidak Tersedia': 'border-slate-200 bg-white text-slate-500',
};

// Teks yang ditampilkan untuk sebuah status. Kunci gaya tetap ('Segar'/'Tertunda') agar
// semua pemanggil dan meta dari backend tak perlu berubah; hanya kata yang tampil berganti.
const STATUS_DISPLAY = {
  Segar: 'Berjalan',
  Tertunda: 'Dijeda',
};

export function formatDataTime(value) {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Belum tersedia';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatSource(value) {
  const sources = {
    SHOPEE_SNAPSHOT: 'Snapshot Katalog Shopee',
    SHOPEE_ADS_SNAPSHOT: 'Snapshot Iklan Shopee',
    WAREHOUSE_SNAPSHOT: 'Snapshot Gudang',
    KATALOG_SHOPEE: 'Katalog Shopee',
    IKLAN_SHOPEE: 'Iklan Shopee',
    GUDANG: 'Gudang',
    DATABASE: 'Database lokal',
  };
  return sources[value] || value || 'Tidak tersedia';
}

export default function StatusBadge({ status, compact = false }) {
  const label = status || 'Tidak Tersedia';
  const display = STATUS_DISPLAY[label] || label;
  return (
    <span className={`inline-flex items-center whitespace-nowrap border px-2 py-1 text-[11px] font-semibold ${compact ? 'rounded-md' : 'rounded-full'} ${STATUS_STYLES[label] || STATUS_STYLES['Tidak Tersedia']}`}>
      {display}
    </span>
  );
}

export function DataSourceNote({ meta, className = '' }) {
  // Baca status koneksi live (poller bersama — tak menambah request).
  const { data } = useConnectionHealth();
  if (!meta) return null;
  const rawStatus = meta.status || meta.freshness;
  // Selaraskan dengan status koneksi di navbar: kalau sumber datanya TERHUBUNG,
  // jangan tampilkan "Dijeda" (Tertunda) yang menyesatkan — koneksi aktif berarti
  // sinkron berjalan. Freshness lain (Segar/Gagal/Perlu Koneksi) dibiarkan apa adanya.
  const connKey = SOURCE_TO_CONNECTION[meta.source];
  const connected = connKey && data?.[connKey]?.status === 'connected';
  const status = connected && rawStatus === 'Tertunda' ? 'Segar' : rawStatus;
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-slate-500 ${className}`}>
      <StatusBadge status={status} compact />
      <span>Sumber: {formatSource(meta.source)}</span>
      <span>Data: {formatDataTime(meta.dataAsOf)}</span>
    </div>
  );
}
