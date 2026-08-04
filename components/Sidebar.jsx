'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, CheckSquare, LayoutDashboard, Megaphone, Settings, Store, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Beranda', href: '/', icon: LayoutDashboard },
  { label: 'Katalog Shopee', href: '/shopee', icon: Store },
  { label: 'Iklan', href: '/ads', icon: Megaphone },
  { label: 'Gudang', href: '/warehouse', icon: Boxes },
  { label: 'Pusat Tindakan', href: '/actions', icon: CheckSquare },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

function isActivePath(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ mobile = false, onClose }) {
  const pathname = usePathname();
  const content = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-600 text-white"><BarChart3 className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">Pusat Operasi</span>
            <span className="block truncate text-[11px] text-slate-500">Shopee dan gudang</span>
          </span>
        </Link>
        {mobile && <button type="button" title="Tutup navigasi" aria-label="Tutup navigasi" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Navigasi utama">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link key={href} href={href} onClick={onClose} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${active ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 text-xs leading-5 text-slate-500">Snapshot lokal diperbarui melalui tombol Sync atau jadwal otomatis.</div>
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
