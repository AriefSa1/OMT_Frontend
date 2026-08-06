'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, Plus, RefreshCw, Settings, ShieldCheck, Store, UserRound } from 'lucide-react';
import { fetchConnectionStatus, triggerFullSync } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import StatusBadge from './StatusBadge';

export default function Navbar({ onMenu }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const { stores, selectedStoreId, selectedStore, switchStore } = useStore();
  const isAdmin = user?.role === 'ADMIN';

  const loadStatus = async () => setStatus(await fetchConnectionStatus());
  useEffect(() => { loadStatus(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setStoreDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const result = await triggerFullSync(selectedStoreId || null);
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
  const currentDisplayName = selectedStore?.storeName || (stores.length === 1 ? stores[0]?.storeName : null) || (stores.length > 1 && !selectedStoreId ? 'Semua Toko Terhubung' : status?.connections?.shopee?.storeName || 'Toko belum terhubung');

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f6f7f9]">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" title="Buka navigasi" aria-label="Buka navigasi" onClick={onMenu} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 lg:hidden"><Menu className="h-4 w-4" /></button>
          
          {/* Store Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setStoreDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs shadow-xs hover:border-slate-300 hover:bg-slate-50 transition"
              title="Pilih Toko"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                <Store className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 max-w-[160px] sm:max-w-[220px]">
                <p className="truncate font-semibold text-slate-800">{currentDisplayName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {selectedStoreId ? `ID: ${selectedStoreId}` : stores.length > 1 ? `${stores.length} Toko Aktif` : 'Shopee'}
                  </span>
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {storeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Daftar Toko Shopee
                </div>

                {stores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      switchStore('');
                      setStoreDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      !selectedStoreId ? 'bg-rose-50 text-rose-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="truncate">Semua Toko (Konsolidasi)</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">{stores.length}</span>
                  </button>
                )}

                <div className="my-1 max-h-48 overflow-y-auto space-y-0.5">
                  {stores.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-slate-500">Belum ada toko terhubung</div>
                  ) : (
                    stores.map((s) => {
                      const isSelected = selectedStoreId === s.storeId || (stores.length === 1 && !selectedStoreId);
                      return (
                        <button
                          key={s.storeId}
                          type="button"
                          onClick={() => {
                            switchStore(s.storeId);
                            setStoreDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                            isSelected ? 'bg-rose-50 text-rose-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <div className="min-w-0">
                              <p className="truncate text-xs">{s.storeName}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">ID: {s.storeId}</p>
                            </div>
                          </div>
                          {s.productCount !== undefined && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono shrink-0 ml-1">
                              {s.productCount} item
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1.5 mt-1">
                  <Link
                    href="/settings"
                    onClick={() => setStoreDropdownOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                    <span>Tambah / Kelola Toko</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <StatusBadge status={shopeeMeta?.status || 'Tidak Tersedia'} compact />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:inline-flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Panel Admin</span>
            </Link>
          )}

          <button type="button" onClick={handleSync} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Menyinkronkan' : 'Sync'}</span>
          </button>
          <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
            <Link href="/account" title="Detail akun" className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-300">{user?.name?.slice(0, 1)?.toUpperCase() || <UserRound className="h-4 w-4" />}</Link>
            <div className="flex flex-col text-left">
              <Link href="/account" className="max-w-28 truncate text-xs font-medium text-slate-700 hover:text-rose-700" title="Detail akun">{user?.name || 'Akun'}</Link>
              <span className="text-[10px] font-semibold text-slate-400">{user?.role || 'USER'}</span>
            </div>
            <button type="button" onClick={logout} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:border-rose-200 hover:text-rose-700" title="Keluar">Keluar</button>
          </div>
        </div>
      </div>
      {message && <div className="border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:px-6">{message}</div>}
    </header>
  );
}
