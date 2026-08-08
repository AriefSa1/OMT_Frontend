'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, Check, CheckCircle2, KeyRound, Plus, Power, RefreshCw, Save, Settings2, ShieldCheck, Store, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusBadge, { DataSourceNote, formatDataTime } from '../../components/StatusBadge';
import { fetchConnectionStatus, fetchSettings, fetchSyncLogs, saveSettings, testWarehouseConnection, updateShopeeCookie, triggerShopeeSync, fetchMarketplaces } from '../../lib/api';
import { useSnapshotRefresh } from '../../lib/hooks';
import { useStore } from '../../context/StoreContext';

const DEFAULT_WAREHOUSE_LOGIN_URL = 'https://pdcgudang.et.r.appspot.com/v1/users/login';
const DEFAULT_WAREHOUSE_INVENTORY_URL = 'https://pdcgudang.et.r.appspot.com/v1/products/list';

const EMPTY_FORM = {
  storeName: '',
  cronInterval: '15m',
  warehouseLoginUrl: DEFAULT_WAREHOUSE_LOGIN_URL,
  warehouseInventoryUrl: DEFAULT_WAREHOUSE_INVENTORY_URL,
  warehouseUsername: '',
  warehousePassword: '',
  warehouseLoginFrom: 'selling',
  geminiApiKey: null,
  openrouterApiKey: null, // OpenRouter fallback for when Gemini quota is exhausted
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [connections, setConnections] = useState(null);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cookie, setCookie] = useState('');
  const [cookieStoreName, setCookieStoreName] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncingStoreId, setSyncingStoreId] = useState(null);
  const [testingWarehouse, setTestingWarehouse] = useState(false);
  const [warehouseTestResult, setWarehouseTestResult] = useState(null);
  const [message, setMessage] = useState('');
  const [showAddStore, setShowAddStore] = useState(false);
  const [marketplaces, setMarketplaces] = useState([]);
  const [selectedMp, setSelectedMp] = useState('');
  const [mpLoading, setMpLoading] = useState(false);

  const { stores, selectedStoreId, switchStore, toggleStoreActive, removeStore, refreshStores } = useStore();

  const loadData = useCallback(async () => {
    const [settingsData, statusData, logsData] = await Promise.all([
      fetchSettings(),
      fetchConnectionStatus(),
      fetchSyncLogs(),
    ]);
    const nextSettings = settingsData?.settings || EMPTY_FORM;
    setSettings(nextSettings);
    setConnections(statusData);
    setLogs(logsData?.logs || []);
    setForm((current) => ({
      ...EMPTY_FORM,
      ...nextSettings,
      warehouseLoginUrl: nextSettings.warehouseLoginUrl || DEFAULT_WAREHOUSE_LOGIN_URL,
      warehouseInventoryUrl: nextSettings.warehouseInventoryUrl || DEFAULT_WAREHOUSE_INVENTORY_URL,
      warehousePassword: current.warehousePassword || '',
    }));
    setCookieStoreName(nextSettings.storeName || '');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useSnapshotRefresh(loadData);

  const save = async (event) => {
    event?.preventDefault?.();
    setSaving(true);
    const payload = { ...form };
    if (!payload.warehousePassword) delete payload.warehousePassword;
    if (!payload.geminiApiKey) delete payload.geminiApiKey;
    if (!payload.openrouterApiKey) delete payload.openrouterApiKey;
    delete payload.cookieConfigured;
    delete payload.warehouseLoginConfigured;
    delete payload.warehouseCredentialsConfigured;
    delete payload.geminiApiKeyConfigured;
    delete payload.openRouterApiKeyConfigured;
    const response = await saveSettings(payload);
    setMessage(response.success ? 'Pengaturan berhasil disimpan.' : response.error || 'Pengaturan tidak dapat disimpan.');
    await loadData();
    setSaving(false);
  };

  const handleTestWarehouse = async () => {
    setTestingWarehouse(true);
    setWarehouseTestResult(null);
    try {
      const payload = {
        loginUrl: form.warehouseLoginUrl,
        inventoryUrl: form.warehouseInventoryUrl,
        username: form.warehouseUsername,
        password: form.warehousePassword || undefined,
        loginFrom: form.warehouseLoginFrom,
      };
      const res = await testWarehouseConnection(payload);
      setWarehouseTestResult(res);
      if (res.success) {
        setMessage('Uji koneksi gudang berhasil!');
      } else {
        setMessage(`Uji koneksi gudang gagal: ${res.error || res.message}`);
      }
    } catch (err) {
      setWarehouseTestResult({
        success: false,
        error: err.message,
        message: err.message,
      });
      setMessage(`Gagal menguji koneksi: ${err.message}`);
    } finally {
      setTestingWarehouse(false);
    }
  };

  // Muat daftar marketplace Gudang saat form daftar toko dibuka (sekali).
  useEffect(() => {
    if (!showAddStore || marketplaces.length || mpLoading) return;
    let cancelled = false;
    (async () => {
      setMpLoading(true);
      const res = await fetchMarketplaces();
      if (!cancelled) setMarketplaces(res?.marketplaces || []);
      if (!cancelled) setMpLoading(false);
    })();
    return () => { cancelled = true; };
  }, [showAddStore, marketplaces.length, mpLoading]);

  const connectCookie = async (event) => {
    event.preventDefault();
    if (!cookie.trim()) {
      setMessage('Masukkan Cookie header dari Seller Center.');
      return;
    }
    setConnecting(true);
    const mp = marketplaces.find((m) => String(m.id) === String(selectedMp)) || null;
    const response = await updateShopeeCookie(cookie.trim(), cookieStoreName.trim(), mp);
    setMessage(
      response.success
        ? 'Sesi Shopee toko tersimpan dan sinkronisasi awal berhasil!'
        : response.error || response.message || 'Sesi Shopee tidak dapat dihubungkan.'
    );
    if (response.success) {
      setCookie('');
      setCookieStoreName('');
      setSelectedMp('');
      setShowAddStore(false);
      await refreshStores();
    }
    await loadData();
    setConnecting(false);
  };

  const handleSyncStore = async (storeId) => {
    setSyncingStoreId(storeId);
    try {
      const res = await triggerShopeeSync(storeId);
      setMessage(res.message || (res.success ? 'Sinkronisasi toko berhasil.' : 'Sinkronisasi gagal.'));
      await refreshStores();
      await loadData();
    } catch (err) {
      setMessage(`Sync gagal: ${err.message}`);
    } finally {
      setSyncingStoreId(null);
    }
  };

  const handleToggleStore = async (storeId, currentStatus) => {
    const res = await toggleStoreActive(storeId, !currentStatus);
    setMessage(res.message || 'Status toko diperbarui.');
  };

  const handleDeleteStore = async (storeId, name) => {
    if (typeof window !== 'undefined' && !window.confirm(`Yakin ingin menghapus sesi toko "${name}"?`)) {
      return;
    }
    const res = await removeStore(storeId);
    setMessage(res.message || 'Sesi toko dihapus.');
  };

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Kelola multi-toko Shopee, koneksi PDC Gudang, dan jadwal pembaruan snapshot." />

      {message && (
        <div className="surface-muted flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-700">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="font-semibold text-rose-700">
            Tutup
          </button>
        </div>
      )}

      {/* Connection status banner */}
      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Status koneksi sumber data</h2>
          <p className="mt-1 text-xs text-slate-500">Status menunjukkan konfigurasi otentikasi serta kesegaran snapshot data terakhir.</p>
        </div>
        <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Shopee Multi-Toko</p>
            <div className="mt-2">
              <StatusBadge status={stores.some((s) => s.isActive) ? 'Segar' : 'Tidak Tersedia'} />
            </div>
            <p className="mt-3 text-xs text-slate-600 font-medium">{stores.length} Toko Terhubung</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Shopee Ads & Performance</p>
            <div className="mt-2">
              <StatusBadge status={connections?.snapshots?.ads?.status || 'Tidak Tersedia'} />
            </div>
            <p className="mt-3 text-xs text-slate-600">Data: {formatDataTime(connections?.snapshots?.ads?.dataAsOf)}</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">PDC Gudang (Warehouse API)</p>
            <div className="mt-2">
              <StatusBadge status={connections?.snapshots?.warehouse?.status || 'Tidak Tersedia'} />
            </div>
            <p className="mt-3 text-xs text-slate-600">
              {connections?.snapshots?.warehouse?.status === 'ONLINE' ? 'Terhubung (PDC Gudang)' : `Data: ${formatDataTime(connections?.snapshots?.warehouse?.dataAsOf)}`}
            </p>
          </div>
        </div>
      </section>

      {/* Multi-Store Shopee Connection Section */}
      <section className="surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Koneksi Multi-Toko Shopee</h2>
              <p className="mt-1 text-xs text-slate-500">
                Hubungkan dan kelola beberapa toko Shopee sekaligus. Setiap toko memiliki sesi, sinkronisasi katalog, dan metrik iklan terisolasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddStore((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddStore ? 'Tutup Form' : 'Hubungkan Toko Baru'}</span>
          </button>
        </div>

        {/* Store List Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 mt-2">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Toko</th>
                <th className="px-4 py-3">Store ID</th>
                <th className="px-4 py-3">Katalog Produk</th>
                <th className="px-4 py-3">Terakhir Sync</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Belum ada toko Shopee terhubung. Klik &quot;Hubungkan Toko Baru&quot; di atas untuk menambahkan.
                  </td>
                </tr>
              ) : (
                stores.map((s) => (
                  <tr key={s.storeId} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>{s.storeName}</span>
                      {selectedStoreId === s.storeId && (
                        <span className="rounded-sm bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Terpilih</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{s.storeId}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{s.productCount || 0} item</td>
                    <td className="px-4 py-3 text-slate-500">{formatDataTime(s.lastSyncedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStore(s.storeId, s.isActive)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                          s.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengaktifkan/menonaktifkan"
                      >
                        <Power className="h-3 w-3" />
                        <span>{s.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSyncStore(s.storeId)}
                          disabled={syncingStoreId === s.storeId}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          title="Sinkronkan toko ini"
                        >
                          <RefreshCw className={`h-3 w-3 ${syncingStoreId === s.storeId ? 'animate-spin text-rose-600' : ''}`} />
                          <span>Sync</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStore(s.storeId, s.storeName)}
                          className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100"
                          title="Hapus sesi toko ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Store Form Modal / Accordion */}
        {showAddStore && (
          <form onSubmit={connectCookie} className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-900">
              <KeyRound className="h-4 w-4 text-rose-600" />
              <span>Form Hubungkan Toko Shopee Baru</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">Nama Toko</span>
                <input
                  value={cookieStoreName}
                  onChange={(event) => setCookieStoreName(event.target.value)}
                  placeholder="Contoh: Toko Fashion Official"
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-rose-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">Marketplace Gudang (untuk cross-check laba/omzet) — opsional</span>
                <select
                  value={selectedMp}
                  onChange={(event) => setSelectedMp(event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-rose-500"
                >
                  <option value="">{mpLoading ? 'Memuat daftar marketplace…' : '— Tidak dipetakan —'}</option>
                  {[...marketplaces]
                    .sort((a, b) => {
                      // Shopee didahulukan (toko app ini toko Shopee), lalu urut nama.
                      const rank = (t) => (String(t).toLowerCase() === 'shopee' ? 0 : 1);
                      return rank(a.type) - rank(b.type) || String(a.name).localeCompare(String(b.name));
                    })
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.type}{m.username && m.username.toLowerCase() !== String(m.name).toLowerCase() ? ` · ${m.username}` : ''}
                      </option>
                    ))}
                </select>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Kaitkan toko ini dengan marketplace di sistem Gudang agar angka “menurut Gudang” bisa dicocokkan. Bisa dikosongkan.
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-700">Cookie Header Seller Center</span>
                <textarea
                  value={cookie}
                  onChange={(event) => setCookie(event.target.value)}
                  placeholder="Tempel Cookie header lengkap dari browser Network tab (misal: SPC_CDS=...; SPC_EC=...; SPC_U=...)"
                  rows="4"
                  className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:outline-rose-500"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddStore(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={connecting}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{connecting ? 'Menghubungkan & Sync...' : 'Simpan dan Hubungkan'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Operational settings */}
        <form onSubmit={save} className="surface p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <Settings2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Operasional & Jadwal Sync</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Atur nama toko utama, integrasi AI Gemini, dan interval Sync otomatis di latar belakang.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Nama toko</span>
              <input
                value={form.storeName || ''}
                onChange={update('storeName')}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
              />
            </label>
            <label className="block">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-700">Kunci API Gemini</span>
                <span className="text-[11px] text-slate-500">
                  Tersimpan: {settings?.geminiApiKeyConfigured ? 'Ya' : 'Belum'}
                </span>
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={form.geminiApiKey || ''}
                onChange={update('geminiApiKey')}
                placeholder={settings?.geminiApiKeyConfigured ? 'Terisi — kosongkan untuk mempertahankan' : 'Tempel kunci API Gemini'}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
              />
              <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                Tanpa kunci ini seluruh fitur AI tidak aktif dan panelnya menampilkan status
                &quot;belum dikonfigurasi&quot;.
              </span>
            </label>
            <label className="block">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-700">Kunci API OpenRouter (Fallback)</span>
                <span className="text-[11px] text-slate-500">
                  Tersimpan: {settings?.openRouterApiKeyConfigured ? 'Ya' : 'Belum'}
                </span>
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={form.openrouterApiKey || ''}
                onChange={update('openrouterApiKey')}
                placeholder={settings?.openRouterApiKeyConfigured ? 'Terisi — kosongkan untuk mempertahankan' : 'Tempel OpenRouter API key (gratis $10/mo)'}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
              />
              <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                Fallback gratis ketika kuota Gemini habis. Daftar gratis di{' '}
                <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline">
                  openrouter.ai
                </a> {' '} dan masukkan API key di sini.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Interval Sync otomatis</span>
              <select
                value={form.cronInterval || '15m'}
                onChange={update('cronInterval')}
                className="ui-select mt-1 h-10 w-full rounded-md px-3 text-sm text-slate-800"
              >
                <option value="5m">Setiap 5 menit</option>
                <option value="15m">Setiap 15 menit</option>
                <option value="30m">Setiap 30 menit</option>
                <option value="1h">Setiap jam</option>
              </select>
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan pengaturan'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Warehouse Connection Section */}
      <form onSubmit={save} className="surface p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Koneksi PDC Gudang</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Sistem menggunakan autentikasi JWT token untuk mengambil stok fisik produk dari API PDC Gudang secara otomatis.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
            Status: {settings?.warehouseLoginConfigured && settings?.warehouseCredentialsConfigured ? 'Terkonfigurasi' : 'Belum lengkap'}
          </span>
        </div>

        {/* Diagnostic result card */}
        {warehouseTestResult && (
          <div
            className={`rounded-lg border p-4 text-xs transition-all ${
              warehouseTestResult.success
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                : 'border-rose-200 bg-rose-50/70 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {warehouseTestResult.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              )}
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-sm">
                  {warehouseTestResult.success ? 'Koneksi Berhasil Terhubung!' : 'Koneksi Gudang Gagal'}
                </p>
                <p className="leading-relaxed">{warehouseTestResult.message || warehouseTestResult.error}</p>
                {warehouseTestResult.success && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                    <div>
                      <span className="text-emerald-700 block">Tim:</span>
                      <span className="font-semibold">{warehouseTestResult.team?.name || `ID ${warehouseTestResult.team?.id}`}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Pengguna:</span>
                      <span className="font-semibold">{warehouseTestResult.user?.name || warehouseTestResult.user?.username || '-'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Total Stok di Gudang:</span>
                      <span className="font-semibold">{warehouseTestResult.totalWarehouseItems?.toLocaleString('id-ID')} items</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">URL Login Gudang</span>
            <input
              type="url"
              value={form.warehouseLoginUrl || ''}
              onChange={update('warehouseLoginUrl')}
              placeholder="https://pdcgudang.et.r.appspot.com/v1/users/login"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
            />
            <span className="mt-1 block text-[11px] text-slate-400">Endpoint otentikasi login pengguna</span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">URL Inventori Gudang</span>
            <input
              type="url"
              value={form.warehouseInventoryUrl || ''}
              onChange={update('warehouseInventoryUrl')}
              placeholder="https://pdcgudang.et.r.appspot.com/v1/products/list"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
            />
            <span className="mt-1 block text-[11px] text-slate-400">Endpoint katalog & stok fisik produk</span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Username</span>
            <input
              value={form.warehouseUsername || ''}
              onChange={update('warehouseUsername')}
              placeholder="Username akun gudang"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Password Baru</span>
            <input
              type="password"
              value={form.warehousePassword || ''}
              onChange={update('warehousePassword')}
              placeholder={settings?.warehouseCredentialsConfigured ? '•••••••• (Tersimpan, isi jika ingin mengganti)' : 'Password akun gudang'}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Asal Login (From)</span>
            <input
              value={form.warehouseLoginFrom || ''}
              onChange={update('warehouseLoginFrom')}
              placeholder="selling"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800"
            />
            <span className="mt-1 block text-[11px] text-slate-400">Default: selling</span>
          </label>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestWarehouse}
              disabled={testingWarehouse}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              <Activity className={`h-4 w-4 ${testingWarehouse ? 'animate-spin' : ''}`} />
              {testingWarehouse ? 'Menguji koneksi...' : 'Uji Koneksi Gudang'}
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan Koneksi Gudang'}
          </button>
        </div>
      </form>

      {/* Sync history table */}
      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Riwayat Sync</h2>
        </div>
        <div className="table-scroll">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Sumber</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Hasil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.slice(0, 20).map((log) => (
                <tr key={log.id}>
                  <td className="px-5 py-3 text-slate-600">{formatDataTime(log.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{log.jobType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status === 'SUCCESS' ? 'Segar' : log.status === 'DEGRADED' ? 'Tertunda' : 'Gagal'} compact />
                  </td>
                  <td className="px-5 py-3 text-slate-600">{log.message}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">
                    Belum ada riwayat Sync.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
