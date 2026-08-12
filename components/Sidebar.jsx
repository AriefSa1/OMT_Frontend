'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bot, Boxes, CheckSquare, Gauge, LayoutDashboard, Layers, Megaphone, Settings, ShieldCheck, ShoppingBag, Sparkles, Store, Tag, TrendingUp, Wrench, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_GROUPS = [
  {
    title: 'Ringkasan',
    items: [
      { label: 'Beranda', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Analistik Shopee',
    items: [
      { label: 'Katalog Produk', href: '/shopee', icon: Store },
      { label: 'Detail Pesanan', href: '/orders', icon: ShoppingBag },
      { label: 'Iklan', href: '/ads', icon: Megaphone },
      { label: 'Promosi', href: '/promotions', icon: Tag },
    ],
  },
  {
    title: 'Operasional Gudang',
    items: [
      { label: 'Inventaris Stok', href: '/warehouse', icon: Boxes },
      { label: 'Rekonsiliasi Stok', href: '/warehouse/reconciliation', icon: Layers, maintenance: true },
      { label: 'Performa Marketplace', href: '/warehouse/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Rekomendasi & Optimasi',
    items: [
      { label: 'Aksi & Tugas', href: '/actions', icon: CheckSquare, maintenance: true },
      { label: 'Pusat Optimasi', href: '/optimization', icon: Gauge },
      { label: 'Wawasan Growth', href: '/growth', icon: Sparkles },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Pengaturan Koneksi', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'Eksperimen',
    items: [
      { label: 'Hermes Agent', href: '/hermes', icon: Bot },
    ],
  },
];

// Semua href navigasi — dipakai untuk menentukan "prefix terpanjang yang menang",
// supaya induk tidak ikut aktif saat berada di anak yang punya item sendiri.
const ALL_HREFS = [...NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href)), '/admin'];

function isActivePath(pathname, href) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // Cocok sebagai prefix induk — tapi JANGAN aktifkan bila ada item lain yang lebih
  // spesifik (href lebih dalam) yang juga cocok dengan path sekarang. Ini mencegah
  // "Inventaris Stok" (/warehouse) ikut aktif saat di "Performa Marketplace"
  // (/warehouse/performance) atau "Rekonsiliasi Stok" (/warehouse/reconciliation).
  return !ALL_HREFS.some((other) =>
    other !== href
    && other.startsWith(`${href}/`)
    && (pathname === other || pathname.startsWith(`${other}/`))
  );
}

export default function Sidebar({ mobile = false, onClose }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const content = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-900">Pusat Operasi</span>
            <span className="block truncate text-[11px] font-medium text-slate-500">Shopee & Gudang Analytics</span>
          </span>
        </Link>
        {mobile && (
          <button type="button" title="Tutup navigasi" aria-label="Tutup navigasi" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto space-y-4 p-3" aria-label="Navigasi utama">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase">
              {group.title}
            </div>
            {group.items.map(({ label, href, icon: Icon, maintenance }) => {
              if (maintenance) {
                // Dalam perawatan: tidak bisa diklik (bukan <Link>), diredupkan, diberi
                // lencana "Perawatan". Rutenya sengaja tetap ada untuk pengembangan.
                return (
                  <div
                    key={href}
                    aria-disabled="true"
                    title="Fitur sedang dalam perawatan — belum bisa dibuka."
                    className="flex h-9 cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-400 opacity-70"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-300" />
                    <span className="flex-1 truncate">{label}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                      <Wrench className="h-2.5 w-2.5" /> Perawatan
                    </span>
                  </div>
                );
              }
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-rose-50 text-rose-700 shadow-xs border border-rose-100/60'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {isAdmin && (
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div className="px-3 text-[10px] font-black tracking-wider text-rose-500 uppercase">
              Administrasi
            </div>
            <Link
              href="/admin"
              onClick={onClose}
              className={`flex h-9 items-center justify-between rounded-lg px-3 text-xs font-semibold transition-all ${
                isActivePath(pathname, '/admin')
                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Panel Admin</span>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-700">
                PRO
              </span>
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-slate-100 p-3 bg-slate-50/50 text-[11px] leading-relaxed text-slate-500 rounded-b-xl">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-0.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Status Sistem Aktif</span>
        </div>
        Snapshot lokal disinkronkan otomatis.
      </div>
    </div>
  );
  if (mobile) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigasi">
        <button type="button" className="absolute inset-0 bg-slate-950/35" onClick={onClose} aria-label="Tutup navigasi" />
        <aside className="relative h-full w-72 max-w-[84vw] border-r border-slate-200 shadow-xl">{content}</aside>
      </div>
    );
  }
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 lg:block">{content}</aside>;
}
