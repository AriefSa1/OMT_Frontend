'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Save, Settings2, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusBadge, { DataSourceNote, formatDataTime } from '../../components/StatusBadge';
import { fetchConnectionStatus, fetchSettings, fetchSyncLogs, saveSettings, updateShopeeCookie } from '../../lib/api';
import { useSnapshotRefresh } from '../../lib/hooks';

const EMPTY_FORM = { storeName: '', cronInterval: '15m', warehouseLoginUrl: '', warehouseInventoryUrl: '', warehouseUsername: '', warehousePassword: '', warehouseLoginFrom: 'selling', shopeeOrderSummaryUrl: '' };

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [connections, setConnections] = useState(null);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cookie, setCookie] = useState('');
  const [cookieStoreName, setCookieStoreName] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const [settingsData, statusData, logsData] = await Promise.all([fetchSettings(), fetchConnectionStatus(), fetchSyncLogs()]);
    const nextSettings = settingsData?.settings || EMPTY_FORM;
    setSettings(nextSettings);
    setConnections(statusData);
    setLogs(logsData?.logs || []);
    setForm((current) => ({ ...EMPTY_FORM, ...nextSettings, warehousePassword: current.warehousePassword || '' }));
    setCookieStoreName(nextSettings.storeName || '');
  }, []);
  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (!payload.warehousePassword) delete payload.warehousePassword;
    const response = await saveSettings(payload);
    setMessage(response.success ? 'Pengaturan tersimpan.' : response.error || 'Pengaturan tidak dapat disimpan.');
    await loadData();
    setSaving(false);
  };

  const connectCookie = async (event) => {
    event.preventDefault();
    if (!cookie.trim()) { setMessage('Masukkan Cookie header dari Seller Center.'); return; }
    setConnecting(true);
    const response = await updateShopeeCookie(cookie.trim(), cookieStoreName.trim());
    setMessage(response.success ? 'Sesi Shopee tersimpan dan snapshot katalog diperbarui.' : response.error || response.message || 'Sesi Shopee tidak dapat dihubungkan.');
    if (response.success) setCookie('');
    await loadData();
    setConnecting(false);
  };

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Kelola koneksi sumber data dan jadwal pembaruan snapshot." />
      {message && <div className="surface-muted flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-700"><span>{message}</span><button type="button" onClick={() => setMessage('')} className="font-semibold text-rose-700">Tutup</button></div>}

      <section className="surface overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Status koneksi</h2><p className="mt-1 text-xs text-slate-500">Status menunjukkan konfigurasi serta kesegaran snapshot terakhir.</p></div><div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-5"><p className="text-xs font-medium text-slate-500">Shopee</p><div className="mt-2"><StatusBadge status={connections?.snapshots?.shopee?.status || 'Tidak Tersedia'} /></div><p className="mt-3 text-xs text-slate-600">{connections?.connections?.shopee?.storeName || 'Belum terhubung'}</p></div><div className="p-5"><p className="text-xs font-medium text-slate-500">Iklan Shopee</p><div className="mt-2"><StatusBadge status={connections?.snapshots?.ads?.status || 'Tidak Tersedia'} /></div><p className="mt-3 text-xs text-slate-600">Data: {formatDataTime(connections?.snapshots?.ads?.dataAsOf)}</p></div><div className="p-5"><p className="text-xs font-medium text-slate-500">Gudang</p><div className="mt-2"><StatusBadge status={connections?.snapshots?.warehouse?.status || 'Tidak Tersedia'} /></div><p className="mt-3 text-xs text-slate-600">Data: {formatDataTime(connections?.snapshots?.warehouse?.dataAsOf)}</p></div></div></section>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={connectCookie} className="surface p-5"><div className="flex items-start gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700"><KeyRound className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Sesi Shopee</h2><p className="mt-1 text-xs leading-5 text-slate-500">Simpan Cookie header Seller Center. Sistem memeriksa CTOKEN atau SPC_CDS untuk melakukan Sync katalog.</p></div></div><div className="mt-5 space-y-4"><label className="block"><span className="text-xs font-medium text-slate-700">Nama toko</span><input value={cookieStoreName} onChange={(event) => setCookieStoreName(event.target.value)} placeholder="Nama toko" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">Cookie header</span><textarea value={cookie} onChange={(event) => setCookie(event.target.value)} placeholder="Tempel Cookie header lengkap di sini" rows="7" className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-800" /></label><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Tersimpan: {settings?.cookieConfigured ? 'Ya' : 'Belum'}</span><button type="submit" disabled={connecting} className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"><ShieldCheck className="h-4 w-4" />{connecting ? 'Menghubungkan' : 'Simpan dan Sync'}</button></div></div></form>

        <form onSubmit={save} className="surface p-5"><div className="flex items-start gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Settings2 className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Operasional</h2><p className="mt-1 text-xs leading-5 text-slate-500">Atur nama toko, endpoint ringkasan pesanan, dan interval Sync otomatis.</p></div></div><div className="mt-5 grid gap-4"><label className="block"><span className="text-xs font-medium text-slate-700">Nama toko</span><input value={form.storeName || ''} onChange={update('storeName')} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">Endpoint ringkasan pesanan</span><input type="url" value={form.shopeeOrderSummaryUrl || ''} onChange={update('shopeeOrderSummaryUrl')} placeholder="https://..." className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">Interval Sync otomatis</span><select value={form.cronInterval || '15m'} onChange={update('cronInterval')} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800"><option value="5m">Setiap 5 menit</option><option value="15m">Setiap 15 menit</option><option value="30m">Setiap 30 menit</option><option value="1h">Setiap jam</option></select></label><div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-70"><Save className="h-4 w-4" />{saving ? 'Menyimpan' : 'Simpan pengaturan'}</button></div></div></form>
      </div>

      <form onSubmit={save} className="surface p-5"><div className="flex items-start gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700"><KeyRound className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Koneksi gudang</h2><p className="mt-1 text-xs leading-5 text-slate-500">Login dipakai ketika Sync gudang dijalankan. Password tidak ditampilkan kembali setelah tersimpan.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="block"><span className="text-xs font-medium text-slate-700">URL login</span><input type="url" value={form.warehouseLoginUrl || ''} onChange={update('warehouseLoginUrl')} placeholder="https://.../v1/users/login" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">URL inventori</span><input type="url" value={form.warehouseInventoryUrl || ''} onChange={update('warehouseInventoryUrl')} placeholder="https://.../v1/products/list_variation" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">Username</span><input value={form.warehouseUsername || ''} onChange={update('warehouseUsername')} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">Password baru</span><input type="password" value={form.warehousePassword || ''} onChange={update('warehousePassword')} placeholder={settings?.warehouseCredentialsConfigured ? 'Tersimpan, isi hanya untuk mengganti' : ''} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="block"><span className="text-xs font-medium text-slate-700">Asal login</span><input value={form.warehouseLoginFrom || ''} onChange={update('warehouseLoginFrom')} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800" /></label></div><div className="mt-5 flex items-center justify-between"><span className="text-xs text-slate-500">Konfigurasi: {settings?.warehouseLoginConfigured && settings?.warehouseCredentialsConfigured ? 'Lengkap' : 'Belum lengkap'}</span><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-70"><Check className="h-4 w-4" />Simpan koneksi gudang</button></div></form>

      <section className="surface overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Riwayat Sync</h2></div><div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Waktu</th><th className="px-4 py-3 font-medium">Sumber</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Hasil</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.slice(0, 20).map((log) => <tr key={log.id}><td className="px-5 py-3 text-slate-600">{formatDataTime(log.timestamp)}</td><td className="px-4 py-3 text-slate-700">{log.jobType}</td><td className="px-4 py-3"><StatusBadge status={log.status === 'SUCCESS' ? 'Segar' : log.status === 'DEGRADED' ? 'Tertunda' : 'Gagal'} compact /></td><td className="px-5 py-3 text-slate-600">{log.message}</td></tr>)}{!logs.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">Belum ada riwayat Sync.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
