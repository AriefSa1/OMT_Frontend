'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AppShell({ children }) {
  return <AuthProvider><AppShellContent>{children}</AppShellContent></AuthProvider>;
}

function AppShellContent({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthPage = pathname === '/login';

  useEffect(() => {
    if (!isAuthPage && !loading && !user) window.location.replace('/login');
  }, [isAuthPage, loading, user]);

  if (isAuthPage) return <main className="min-h-screen">{children}</main>;
  if (loading) return <main className="min-h-screen" aria-busy="true" />;
  if (!user) {
    return <main className="flex min-h-screen items-center justify-center p-6"><div className="surface max-w-sm p-6 text-center"><p className="text-sm font-semibold text-slate-800">Sesi Anda tidak aktif.</p><Link href="/login" className="mt-4 inline-flex rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Masuk</Link></div></main>;
  }
  return (
    <div className="min-h-screen">
      <Sidebar />
      {menuOpen && <Sidebar mobile onClose={() => setMenuOpen(false)} />}
      <div className="min-w-0 lg:pl-64">
        <Navbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
