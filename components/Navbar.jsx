'use client';

import { useEffect, useState } from 'react';
import { Menu, RefreshCw, UserRound } from 'lucide-react';
import { fetchConnectionStatus, triggerFullSync } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';

export default function Navbar({ onMenu }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const { user, logout } = useAuth();

  const loadStatus = async () => setStatus(await fetchConnectionStatus());
  useEffect(() => { loadStatus(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await triggerFullSync();
      setMessage(result.message || result.error || 'Sync selesai.');
      await loadStatus();
      if (result?.success && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('snapshot:updated'));
      }
    } catch (error) {
      setMessage(error?.message || 'Sync gagal. Snapshot sebelumnya tetap digunakan.');
    } finally {
      setSyncing(false);
    }
  };

  const shopeeMeta = status?.snapshots?.shopee;
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f6f7f9]">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" title="Buka navigasi" aria-label="Buka navigasi" onClick={onMenu} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 lg:hidden"><Menu className="h-4 w-4" /></button>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium text-slate-800">{status?.connections?.shopee?.storeName || 'Toko belum terhubung'}</p>
            <div className="mt-1"><StatusBadge status={shopeeMeta?.status || 'Tidak Tersedia'} compact /></div>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={handleSync} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Menyinkronkan' : 'Sync'}</span>
          </button>
          <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-700">{user?.name?.slice(0, 1)?.toUpperCase() || <UserRound className="h-4 w-4" />}</span>
            <button type="button" onClick={logout} className="max-w-28 truncate text-xs font-medium text-slate-600 hover:text-rose-700" title="Keluar">{user?.name || 'Keluar'}</button>
          </div>
        </div>
      </div>
      {message && <div className="border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:px-6">{message}</div>}
    </header>
  );
}
