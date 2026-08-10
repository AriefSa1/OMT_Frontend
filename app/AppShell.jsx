'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StoreProvider } from '../context/StoreContext';
import { DateRangeProvider } from '../context/DateRangeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ServerWakeBanner from '../components/ServerWakeBanner';

// Jaring pengaman: setelah deploy, HTML lama yang ter-cache bisa merujuk chunk JS
// yang sudah tak ada (404) → ChunkLoadError. Muat ulang SEKALI untuk menarik HTML
// segar; dijaga anti-loop (maks sekali per 30 detik lewat sessionStorage).
function useChunkErrorRecovery() {
  useEffect(() => {
    const KEY = 'chunk_reload_at';
    const isChunkError = (msg = '', name = '') =>
      name === 'ChunkLoadError' || /ChunkLoadError/i.test(msg) || /Loading chunk [\w-]+ failed/i.test(msg);
    const onError = (event) => {
      const msg = event?.message || event?.reason?.message || '';
      const name = event?.error?.name || event?.reason?.name || '';
      if (!isChunkError(msg, name)) return;
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 30000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
    };
  }, []);
}

export default function AppShell({ children }) {
  useChunkErrorRecovery();
  return (
    <AuthProvider>
      <StoreProvider>
        <DateRangeProvider>
          <ServerWakeBanner />
          <AppShellContent>{children}</AppShellContent>
        </DateRangeProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

function AppShellContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthPage = pathname === '/login';

  useEffect(() => {
    // router.replace keeps the SPA alive; window.location.replace forced a full document
    // reload and threw away every cached snapshot on the way to /login.
    if (!isAuthPage && !loading && !user) router.replace('/login');
  }, [isAuthPage, loading, user, router]);

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
