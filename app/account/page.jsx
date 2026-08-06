'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, KeyRound, Mail, ShieldCheck, Store, UserRound } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { fetchAccountOverview, changeAccountPassword } from '../../lib/api';
import { formatIDR, formatNumber } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import DataSourceNote from '../../components/DataSourceNote';
import { SkeletonLine } from '../../components/Skeleton';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function RoleBadge({ role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        isAdmin
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}
    >
      <ShieldCheck className="h-3 w-3" />
      {isAdmin ? 'Administrator' : 'Pengguna'}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [state, setState] = useState({ submitting: false, error: '', success: '' });

  const field = (name) => (event) => {
    setForm((cur) => ({ ...cur, [name]: event.target.value }));
    setState((cur) => ({ ...cur, error: '', success: '' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword.length < 6) return setState({ submitting: false, error: 'Sandi baru minimal 6 karakter.', success: '' });
    if (form.newPassword !== form.confirmPassword) return setState({ submitting: false, error: 'Konfirmasi sandi tidak sama.', success: '' });
    setState({ submitting: true, error: '', success: '' });
    const res = await changeAccountPassword(form.currentPassword, form.newPassword);
    if (res.success) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setState({ submitting: false, error: '', success: 'Sandi berhasil diperbarui.' });
    } else {
      setState({ submitting: false, error: res.error || 'Gagal memperbarui sandi.', success: '' });
    }
  };

  const inputClass = 'mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 focus:border-rose-500 focus:outline-none';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Ganti Sandi</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">Masukkan sandi lama untuk mengonfirmasi identitas Anda.</p>
      {state.error && <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>}
      {state.success && <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{state.success}</p>}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Sandi lama</span>
          <input type="password" value={form.currentPassword} onChange={field('currentPassword')} required className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Sandi baru</span>
          <input type="password" value={form.newPassword} onChange={field('newPassword')} required className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Konfirmasi sandi baru</span>
          <input type="password" value={form.confirmPassword} onChange={field('confirmPassword')} required className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={state.submitting}
          className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
        >
          {state.submitting ? 'Menyimpan…' : 'Perbarui Sandi'}
        </button>
      </form>
    </div>
  );
}

export default function AccountPage() {
  const { user: authUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAccountOverview();
    if (res.success) {
      setData(res.data);
      setError('');
    } else {
      setError(res.error || 'Gagal memuat data akun.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const user = data?.user || authUser || {};
  const stores = data?.stores || [];
  const summary = data?.summary || { totalStores: 0, activeStores: 0, totalProducts: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Akun"
        description="Informasi akun Anda, toko yang Anda kelola, dan pengaturan keamanan."
      />

      {error && !loading && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom kiri: profil + keamanan */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-xl font-bold text-rose-700">
                {(user.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{user.name || '—'}</p>
                <div className="mt-1"><RoleBadge role={user.role} /></div>
              </div>
            </div>
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2">
              <InfoRow icon={Mail} label="Email" value={user.email || '—'} />
              <InfoRow icon={CalendarDays} label="Terdaftar sejak" value={formatDate(user.createdAt)} />
            </div>
          </div>

          <PasswordCard />
        </div>

        {/* Kolom kanan: ringkasan + daftar toko */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <SkeletonLine width="60%" className="h-2.5" />
                  <SkeletonLine width="50%" className="mt-3 h-7" />
                </div>
              ))
            ) : (
              <>
                <StatTile label="Total Toko" value={formatNumber(summary.totalStores)} />
                <StatTile label="Toko Aktif" value={formatNumber(summary.activeStores)} />
                <StatTile label="Total Produk" value={formatNumber(summary.totalProducts)} />
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Toko yang Anda Kelola</h2>
              </div>
              <DataSourceNote source="Shopee" cadence="sync tiap ±15 mnt" className="hidden sm:flex" />
            </div>
            {loading ? (
              <div className="divide-y divide-slate-100">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <SkeletonLine className="flex-[2]" />
                    <SkeletonLine className="flex-1" />
                    <SkeletonLine className="flex-1" />
                  </div>
                ))}
              </div>
            ) : stores.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  title="Belum ada toko"
                  description="Anda belum menambahkan toko Shopee. Tambahkan lewat menu toko di navigasi atas."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Toko</th>
                      <th className="px-5 py-3 text-center">Produk</th>
                      <th className="px-5 py-3 text-right">Omzet Terakhir</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3">Sync Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stores.map((s) => (
                      <tr key={s.id || s.storeId} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <span className="block font-semibold text-slate-900">{s.storeName || 'Shopee Store'}</span>
                          <span className="font-mono text-[11px] text-slate-500">ID: {s.storeId}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-semibold text-slate-800">{formatNumber(s.totalProducts)}</td>
                        <td className="px-5 py-3.5 text-right">
                          {s.latestGmv === null || s.latestGmv === undefined ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <>
                              <span className="font-semibold text-slate-800">{formatIDR(s.latestGmv)}</span>
                              <span className="block text-[10px] text-slate-400">{s.latestSalesDate || ''}</span>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {s.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Aktif</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Nonaktif</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{s.lastSyncAt ? formatDate(s.lastSyncAt) : 'Belum pernah'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
