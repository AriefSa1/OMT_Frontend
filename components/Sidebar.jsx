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
    title: 'Analitik Shopee',
    items: [
      { label: 'Katalog Produk', href: '/shopee', icon: Store },
      { label: 'Performa Produk', href: '/shopee/performance', icon: TrendingUp },
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
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const content = (
    <div className="app-sidebar flex h-full flex-col bg-white text-slate-800">
      <div className="flex h-[4.5rem] items-center justify-between border-b border-slate-200 px-4">
        <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
          <span className="brand-mark inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white shadow-sm ring-1 ring-white/30">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold tracking-tight text-teal-800">Pusat Operasi</span>
            <span className="block truncate text-[10px] font-medium text-slate-500">Shopee & Gudang Analytics</span>
          </span>
        </Link>
        {mobile && (
          <button type="button" title="Tutup navigasi" aria-label="Tutup navigasi" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-teal-50 hover:text-teal-800">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto space-y-3 p-2.5" aria-label="Navigasi utama">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2.5 text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
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
                    className="flex h-8 cursor-not-allowed select-none items-center gap-2.5 rounded-md px-2.5 text-[11px] font-semibold text-slate-400 opacity-70"
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
                  className={`nav-link flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all ${
                    active
                      ? 'nav-link-active border border-transparent text-teal-800'
                      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {isAdmin && (
          <div className="space-y-1 border-t border-slate-200 pt-3">
            <div className="px-2.5 text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              Administrasi
            </div>
            <Link
              href="/admin"
              onClick={onClose}
                className={`nav-link flex h-8 items-center justify-between rounded-md px-2.5 text-[11px] font-semibold transition-all ${
                isActivePath(pathname, '/admin')
                  ? 'nav-link-active border border-transparent text-teal-800'
                  : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" />
                <span>Panel Admin</span>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-700">
                PRO
              </span>
            </Link>
          </div>
        )}
      </nav>

      <div className="sidebar-account">
        <Link href="/account" onClick={onClose} className="sidebar-account-link" title="Detail akun">
          <span className="sidebar-avatar">{user?.name?.slice(0, 2)?.toUpperCase() || 'AK'}</span>
          <span className="sidebar-account-copy">
            <b>{user?.name || 'Akun'}</b>
            <span>{user?.role === 'ADMIN' ? 'Administrator' : user?.role || 'Pengguna'}</span>
          </span>
        </Link>
        <button type="button" className="sidebar-logout" onClick={logout} title="Keluar">Keluar</button>
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
  return <aside className="app-sidebar-shell fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-slate-200 lg:block">{content}</aside>;
}
