'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminStoreAnalytics from '../../components/AdminStoreAnalytics';
import AdminWeeklyPerformance from '../../components/AdminWeeklyPerformance';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Filter,
  KeyRound,
  Lock,
  Plus,
  Power,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  TrendingDown,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';
import {
  createAdminRegistrationCode,
  createAdminUser,
  deleteAdminRegistrationCode,
  deleteAdminUser,
  deleteStoreApi,
  fetchAdminAuditLogs,
  fetchAdminRegistrationCodes,
  fetchAdminStores,
  fetchAdminSystemStats,
  fetchAdminUsers,
  resetAdminUserPassword,
  toggleAdminRegistrationCode,
  toggleStoreActive,
  triggerShopeeSync,
  updateAdminUserRole
} from '../../lib/api';

const ROLES = [
  { id: 'USER', label: 'User / Merchant', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'ADMIN', label: 'Admin (Pusat)', color: 'bg-rose-50 text-rose-700 border-rose-200' }
];

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'stores' | 'codes' | 'access' | 'audit'

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersData, setUsersData] = useState({ users: [], total: 0, counts: {} });
  const [storesData, setStoresData] = useState({ stores: [], total: 0 });
  const [codesData, setCodesData] = useState({ codes: [], summary: {} });
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemStats, setSystemStats] = useState(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Notifications & Messages
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [syncingStoreId, setSyncingStoreId] = useState(null);

  // Modals state
  const [modalUserCreate, setModalUserCreate] = useState(false);
  const [modalUserRole, setModalUserRole] = useState(null); // target user object
  const [modalUserPassword, setModalUserPassword] = useState(null); // target user object
  const [modalUserDelete, setModalUserDelete] = useState(null); // target user object
  const [modalCodeCreate, setModalCodeCreate] = useState(false);
  const [modalCodeDelete, setModalCodeDelete] = useState(null); // target code object
  const [modalStoreDelete, setModalStoreDelete] = useState(null); // target store object

  // Form states
  const [formUser, setFormUser] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [formNewRole, setFormNewRole] = useState('USER');
  const [formNewPassword, setFormNewPassword] = useState('');
  const [formCode, setFormCode] = useState({
    code: '',
    role: 'USER',
    maxUses: 1,
    isUnlimitedUses: false,
    expiresInDays: 7,
    isNoExpiry: false,
    description: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Load all admin data
  const loadAdminData = useCallback(async (isRefresh = false) => {
    if (!isAdmin) return;
    if (isRefresh) setRefreshing(true);
    try {
      const [usersRes, storesRes, codesRes, logsRes, statsRes] = await Promise.all([
        fetchAdminUsers({ search: userSearch, role: userRoleFilter }),
        fetchAdminStores(),
        fetchAdminRegistrationCodes(),
        fetchAdminAuditLogs({ action: auditActionFilter, limit: 60 }),
        fetchAdminSystemStats()
      ]);

      if (usersRes?.success) setUsersData(usersRes.data);
      if (storesRes?.success) setStoresData({ stores: storesRes.stores || [], total: storesRes.total || (storesRes.stores || []).length });
      if (codesRes?.success) setCodesData(codesRes.data);
      if (logsRes?.success) setAuditLogs(logsRes.data.logs || []);
      if (statsRes?.success) setSystemStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Gagal memuat data panel admin: ' + (err.message || 'Koneksi terputus'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, userSearch, userRoleFilter, auditActionFilter]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  // Copy helper
  const handleCopy = (text, id, isLink = false) => {
    const fullText = isLink
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/login?mode=register&code=${encodeURIComponent(text)}`
      : text;
    navigator.clipboard.writeText(fullText);
    setCopiedCodeId(id + (isLink ? '-link' : '-code'));
    showToast(isLink ? 'Tautan pendaftaran berhasil disalin!' : `Kode ${text} berhasil disalin!`);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  // User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await createAdminUser(formUser);
      if (res.success) {
        showToast(res.message || 'Pengguna berhasil dibuat!');
        setModalUserCreate(false);
        setFormUser({ name: '', email: '', password: '', role: 'USER' });
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal membuat pengguna', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!modalUserRole) return;
    setActionLoading(true);
    try {
      const res = await updateAdminUserRole(modalUserRole.id, formNewRole);
      if (res.success) {
        showToast(res.message || 'Peran pengguna berhasil diperbarui!');
        setModalUserRole(null);
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal mengubah peran', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!modalUserPassword) return;
    setActionLoading(true);
    try {
      const res = await resetAdminUserPassword(modalUserPassword.id, formNewPassword);
      if (res.success) {
        showToast(res.message || 'Password berhasil diperbarui!');
        setModalUserPassword(null);
        setFormNewPassword('');
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal mereset password', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!modalUserDelete) return;
    setActionLoading(true);
    try {
      const res = await deleteAdminUser(modalUserDelete.id);
      if (res.success) {
        showToast(res.message || 'Pengguna berhasil dihapus!');
        setModalUserDelete(null);
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal menghapus pengguna', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Store Actions
  const handleToggleStoreActive = async (store) => {
    try {
      const res = await toggleStoreActive(store.storeId, !store.isActive);
      if (res.success) {
        showToast(res.message || 'Status toko berhasil diubah!');
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal mengubah status toko', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    }
  };

  const handleSyncStore = async (storeId) => {
    setSyncingStoreId(storeId);
    try {
      const res = await triggerShopeeSync(storeId);
      if (res.success) {
        showToast(res.message || 'Sinkronisasi toko berhasil!');
        await loadAdminData();
      } else {
        showToast(res.error || 'Sinkronisasi toko gagal', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setSyncingStoreId(null);
    }
  };

  const handleDeleteStore = async () => {
    if (!modalStoreDelete) return;
    setActionLoading(true);
    try {
      const res = await deleteStoreApi(modalStoreDelete.storeId);
      if (res.success) {
        showToast(res.message || 'Sesi toko berhasil dihapus!');
        setModalStoreDelete(null);
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal menghapus sesi toko', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Registration Code Actions
  const handleCreateCode = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        code: formCode.code.trim() ? formCode.code.trim().toUpperCase() : undefined,
        role: formCode.role,
        maxUses: formCode.isUnlimitedUses ? 0 : Number(formCode.maxUses) || 1,
        expiresInDays: formCode.isNoExpiry ? undefined : Number(formCode.expiresInDays) || 7,
        description: formCode.description
      };
      const res = await createAdminRegistrationCode(payload);
      if (res.success) {
        showToast(res.message || 'Kode registrasi berhasil dibuat!');
        setModalCodeCreate(false);
        setFormCode({
          code: '',
          role: 'USER',
          maxUses: 1,
          isUnlimitedUses: false,
          expiresInDays: 7,
          isNoExpiry: false,
          description: ''
        });
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal membuat kode registrasi', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCode = async (code) => {
    try {
      const res = await toggleAdminRegistrationCode(code.id, !code.isActive);
      if (res.success) {
        showToast(res.message || 'Status kode berhasil diubah!');
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal mengubah status kode', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    }
  };

  const handleDeleteCode = async () => {
    if (!modalCodeDelete) return;
    setActionLoading(true);
    try {
      const res = await deleteAdminRegistrationCode(modalCodeDelete.id);
      if (res.success) {
        showToast(res.message || 'Kode registrasi berhasil dihapus!');
        setModalCodeDelete(null);
        await loadAdminData();
      } else {
        showToast(res.error || 'Gagal menghapus kode registrasi', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Codes
  const filteredCodes = (codesData.codes || []).filter((c) => {
    if (codeFilter === 'ALL') return true;
    return c.status === codeFilter;
  });

  // Filtered Stores
  const filteredStores = (storesData.stores || []).filter((s) => {
    if (!storeSearch.trim()) return true;
    const term = storeSearch.toLowerCase();
    return (
      (s.storeName || '').toLowerCase().includes(term) ||
      (s.storeId || '').toLowerCase().includes(term) ||
      (s.owner?.name || '').toLowerCase().includes(term) ||
      (s.owner?.email || '').toLowerCase().includes(term)
    );
  });

  // Access check fallback UI
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Akses Terbatas: Administrator Only</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Halaman ini khusus untuk administrator internal toko. Akun Anda saat ini memiliki peran{' '}
            <span className="font-semibold uppercase text-slate-800">{currentUser?.role || 'Pengguna'}</span>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all ${
            toastMessage.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <span className="text-xs font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        badge="Super Admin"
        title="Panel Kontrol Administrator"
        description="Kelola pengguna sistem, akses lintas toko seluruh merchant, generator kode registrasi, dan log keamanan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadAdminData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
              <span>{refreshing ? 'Memuat...' : 'Muat Ulang'}</span>
            </button>
            <button
              type="button"
              onClick={() => setModalCodeCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Buat Kode Undangan</span>
            </button>
            <button
              type="button"
              onClick={() => setModalUserCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Tambah User</span>
            </button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Users */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Total Pengguna
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {systemStats?.counts?.totalUsers || usersData.total || 0}
            </span>
            <span className="text-xs text-slate-500">akun terdaftar</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium text-rose-700">
              <Shield className="h-3 w-3" />
              {systemStats?.counts?.adminUsers || usersData.counts?.ADMIN || 0} Admin
            </span>
            <span>&bull;</span>
            <span className="font-medium text-blue-700">
              {usersData.counts?.USER || (usersData.total - (usersData.counts?.ADMIN || 0)) || 0} User
            </span>
          </div>
        </div>

        {/* Card 2: Total Registered Stores */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Semua Toko Pengguna
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {storesData.total || storesData.stores?.length || 0}
            </span>
            <span className="text-xs text-slate-500">toko terdaftar</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="text-emerald-700 font-medium">
              {storesData.stores?.filter(s => s.isActive).length || 0} Toko Aktif
            </span>
            <span>&bull;</span>
            <span className="text-slate-400">
              {storesData.stores?.filter(s => !s.isActive).length || 0} Nonaktif
            </span>
          </div>
        </div>

        {/* Card 3: Active Codes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Kode Registrasi Aktif
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {codesData.summary?.active ?? (systemStats?.counts?.activeCodes || 0)}
            </span>
            <span className="text-xs text-slate-500">siap digunakan</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <span>Total {codesData.summary?.total || codesData.codes?.length || 0} dibuat</span>
            <span>&bull;</span>
            <span className="text-slate-400">{codesData.summary?.exhausted || 0} habis</span>
          </div>
        </div>

        {/* Card 4: Security & Database */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Kesehatan Database
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-900">PostgreSQL (Neon)</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Latensi kueri</span>
            <span className="font-mono font-medium text-slate-700">
              {systemStats?.dbLatencyMs !== undefined ? `${systemStats.dbLatencyMs} ms` : 'Terkoneksi'}
            </span>
          </div>
        </div>

        {/* Card 5: Audit Logs */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Aktivitas Audit
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {systemStats?.counts?.auditLogs || auditLogs.length}
            </span>
            <span className="text-xs text-slate-500">peristiwa</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Uptime server</span>
            <span className="font-mono font-medium text-slate-700">
              {systemStats?.uptimeSeconds ? `${Math.floor(systemStats.uptimeSeconds / 60)} m` : 'Aktif'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-8" aria-label="Tabs Admin">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Manajemen Pengguna</span>
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {usersData.total || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'stores'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Semua Toko Pengguna</span>
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {storesData.total || storesData.stores?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Statistik &amp; Analitik</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            <span>Performa Mingguan</span>
          </button>

          <button
            onClick={() => setActiveTab('codes')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'codes'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Generator Kode Undangan</span>
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {codesData.codes?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'access'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Hak Akses & Keamanan</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Log Audit</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANAJEMEN PENGGUNA */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Filter Peran:</span>
              <button
                type="button"
                onClick={() => setUserRoleFilter('')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  userRoleFilter === ''
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({usersData.total || 0})
              </button>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setUserRoleFilter(r.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    userRoleFilter === r.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label} ({usersData.counts?.[r.id] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Pengguna</th>
                    <th className="px-5 py-3.5">Peran / Hak Akses</th>
                    <th className="px-5 py-3.5">Terdaftar Sejak</th>
                    <th className="px-5 py-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <span className="mt-2 block">Memuat daftar pengguna...</span>
                      </td>
                    </tr>
                  ) : usersData.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        Tidak ada pengguna yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    usersData.users.map((u) => {
                      const isSelf = currentUser?.id === u.id;
                      const roleConfig = ROLES.find((r) => r.id === u.role) || ROLES[0];

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{u.name}</span>
                                  {isSelf && (
                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                      Akun Anda
                                    </span>
                                  )}
                                </div>
                                <span className="block truncate text-slate-500">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleConfig.color}`}
                            >
                              {u.role === 'ADMIN' && <ShieldCheck className="h-3 w-3 text-rose-600" />}
                              {u.role}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Edit Role Button */}
                              <button
                                type="button"
                                title="Ubah Peran Pengguna"
                                onClick={() => {
                                  setModalUserRole(u);
                                  setFormNewRole(u.role);
                                }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <UserCog className="h-3.5 w-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Ubah Peran</span>
                              </button>

                              {/* Reset Password Button */}
                              <button
                                type="button"
                                title="Reset Password Pengguna"
                                onClick={() => {
                                  setModalUserPassword(u);
                                  setFormNewPassword('');
                                }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Lock className="h-3.5 w-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Reset Sandi</span>
                              </button>

                              {/* Delete User Button */}
                              <button
                                type="button"
                                title={
                                  isSelf
                                    ? 'Anda tidak dapat menghapus akun Anda sendiri'
                                    : 'Hapus akun pengguna dari sistem'
                                }
                                disabled={isSelf}
                                onClick={() => setModalUserDelete(u)}
                                className={`inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                                  isSelf
                                    ? 'cursor-not-allowed text-slate-300'
                                    : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="ml-1 hidden sm:inline">Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SEMUA TOKO PENGGUNA (GLOBAL STORE VISIBILITY & MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama toko, ID toko, atau pemilik..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Total Toko:</span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {filteredStores.length} Terdaftar
              </span>
            </div>
          </div>

          {/* Stores Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Nama & ID Toko</th>
                    <th className="px-5 py-3.5">Pemilik Akun</th>
                    <th className="px-5 py-3.5 text-center">Produk Terkatalog</th>
                    <th className="px-5 py-3.5">Sinkronisasi Terakhir</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <span className="mt-2 block">Memuat daftar seluruh toko pengguna...</span>
                      </td>
                    </tr>
                  ) : filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        Belum ada toko yang terdaftar atau sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((s) => {
                      const isSyncing = syncingStoreId === s.storeId;

                      return (
                        <tr key={s.id || s.storeId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 border border-orange-200 font-bold">
                                <Store className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 block">{s.storeName || 'Shopee Store'}</span>
                                <span className="font-mono text-[11px] text-slate-500">ID: {s.storeId}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {s.owner ? (
                              <div>
                                <span className="font-medium text-slate-800 block">{s.owner.name}</span>
                                <span className="text-[11px] text-slate-500 block">{s.owner.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sistem / Terhubung Legacy</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="font-semibold text-slate-800">
                              {s._count?.products ?? s.totalProducts ?? 0}
                            </span>
                            <span className="text-[10px] text-slate-400 block">item</span>
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {s.lastSyncAt ? (
                              <div>
                                <span className="font-medium text-slate-700 block">
                                  {new Date(s.lastSyncAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(s.lastSyncAt).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum pernah sync</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {s.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Sync Store Button */}
                              <button
                                type="button"
                                title="Sinkronkan data toko ini sekarang"
                                disabled={isSyncing}
                                onClick={() => handleSyncStore(s.storeId)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
                                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                              </button>

                              {/* Toggle Active Button */}
                              <button
                                type="button"
                                title={s.isActive ? 'Nonaktifkan toko ini' : 'Aktifkan toko ini'}
                                onClick={() => handleToggleStoreActive(s)}
                                className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium ${
                                  s.isActive
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {s.isActive ? 'Matikan' : 'Aktifkan'}
                              </button>

                              {/* Delete Store Button */}
                              <button
                                type="button"
                                title="Hapus sesi toko ini dari database"
                                onClick={() => setModalStoreDelete(s)}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: STATISTIK & ANALITIK LINTAS TOKO */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && <AdminStoreAnalytics />}

      {/* ========================================================================= */}
      {/* TAB: PERFORMA MINGGUAN & PRODUK MENURUN */}
      {/* ========================================================================= */}
      {activeTab === 'weekly' && <AdminWeeklyPerformance />}

      {/* ========================================================================= */}
      {/* TAB 3: GENERATOR KODE REGISTRASI & UNDANGAN */}
      {/* ========================================================================= */}
      {activeTab === 'codes' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Kode Registrasi & Tautan Undangan
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Buat kode khusus untuk membatasi pendaftaran hanya bagi pengguna terotorisasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
                {['ALL', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'INACTIVE'].map((statusKey) => (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setCodeFilter(statusKey)}
                    className={`rounded px-2 py-1 font-medium transition-colors ${
                      codeFilter === statusKey
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {statusKey === 'ALL'
                      ? 'Semua'
                      : statusKey === 'ACTIVE'
                        ? 'Aktif'
                        : statusKey === 'EXHAUSTED'
                          ? 'Kuota Habis'
                          : statusKey === 'EXPIRED'
                            ? 'Kedaluwarsa'
                            : 'Nonaktif'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setModalCodeCreate(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Buat Kode Baru</span>
              </button>
            </div>
          </div>

          {/* Codes List */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Kode Undangan</th>
                    <th className="px-5 py-3.5">Peran Diberikan</th>
                    <th className="px-5 py-3.5">Kuota Pemakaian</th>
                    <th className="px-5 py-3.5">Masa Berlaku</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        Belum ada kode registrasi yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((c) => {
                      const isExpired = c.status === 'EXPIRED';
                      const isExhausted = c.status === 'EXHAUSTED';
                      const isInactive = c.status === 'INACTIVE';
                      const isActive = c.status === 'ACTIVE';

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                                {c.code}
                              </span>
                              <button
                                type="button"
                                title="Salin Kode"
                                onClick={() => handleCopy(c.code, c.id, false)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                {copiedCodeId === `${c.id}-code` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            {c.description && (
                              <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-500">
                                {c.description}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c.role === 'ADMIN' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                              {c.role}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              {c.usedCount}{' '}
                              <span className="text-slate-400">/</span>{' '}
                              {c.maxUses === 0 ? '∞ Tak Terbatas' : c.maxUses}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {c.maxUses === 0
                                ? 'Bisa dipakai berulang'
                                : `Sisa kuota: ${c.remainingUses}`}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {c.expiresAt ? (
                              <div>
                                <span className={isExpired ? 'font-semibold text-rose-600' : 'text-slate-700'}>
                                  {new Date(c.expiresAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="block text-[11px] text-slate-400">
                                  {isExpired ? 'Sudah lewat' : 'Kedaluwarsa'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Permanen</span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {isActive && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Aktif
                              </span>
                            )}
                            {isExhausted && (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                Kuota Habis
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                                Kedaluwarsa
                              </span>
                            )}
                            {isInactive && (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* 1-Click Copy Invite Link */}
                              <button
                                type="button"
                                title="Salin Tautan Registrasi Lengkap"
                                onClick={() => handleCopy(c.code, c.id, true)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {copiedCodeId === `${c.id}-link` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                )}
                                <span className="hidden sm:inline">Salin Link</span>
                              </button>

                              {/* Toggle active button */}
                              <button
                                type="button"
                                title={c.isActive ? 'Nonaktifkan kode' : 'Aktifkan kode'}
                                onClick={() => handleToggleCode(c)}
                                className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium ${
                                  c.isActive
                                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {c.isActive ? 'Matikan' : 'Aktifkan'}
                              </button>

                              {/* Delete code button */}
                              <button
                                type="button"
                                title="Hapus Kode"
                                onClick={() => setModalCodeDelete(c)}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HAK AKSES PERAN & KEAMANAN SISTEM */}
      {/* ========================================================================= */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          {/* RBAC Comparison Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Matriks Hak Akses Peran (USER vs ADMIN)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Sistem menerapkan isolasi data multi-toko berbasis peran dengan perlindungan ketat pada backend.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-3 px-4 font-semibold">Fitur & Modul Sistem</th>
                    <th className="py-3 px-4 text-center font-semibold text-blue-700">
                      USER (Merchant / Pemilik Toko)
                    </th>
                    <th className="py-3 px-4 text-center font-semibold text-rose-700">
                      ADMIN (Pusat / Super Admin)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Lihat Katalog, Analisis Performa & Stok Toko Terdaftar Milik Sendiri
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Toko Sendiri Saja)</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Semua Toko)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Simulasi AI & Fitur Pertumbuhan Pintar Toko Sendiri
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Tambah Toko Shopee Baru & Kelola Toko Milik Sendiri
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Terkunci ke Akunnya)</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Bisa Kelola Semua)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Lihat & Akses Toko Shopee Milik User Lain
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">✗ Dilarang (403 Forbidden)</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Akses Penuh Lintas Akun)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Akses Panel Admin (Kelola Akun Pengguna & Reset Sandi)
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">✗ Tidak Ada Akses</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Penuh)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Generate & Kelola Kode Registrasi Undangan
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">✗ Tidak Ada Akses</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Penuh)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      Hapus Akun Pengguna & Akses Log Audit Keamanan
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">✗ Tidak Ada Akses</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✓ Ya (Penuh)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* System Security Info */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Pengamanan Multi-Tenancy & Otentikasi</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Sistem tertutup (closed-loop) dengan isolasi multi-toko otomatis.
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Otorisasi Token</span>
                  <span className="font-semibold text-emerald-700">JSON Web Token (JWT) Aktif</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Kebijakan Registrasi Baru</span>
                  <span className="font-semibold text-rose-700">Wajib Kode Registrasi Admin</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Isolasi Toko (Tenancy Guard)</span>
                  <span className="font-semibold text-emerald-700">Aktif (Validasi Kepemilikan)</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Proteksi Admin Terakhir</span>
                  <span className="font-semibold text-slate-800">Terkunci (Anti-Lockout)</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Database className="h-4 w-4 text-sky-600" />
                <span>Infrastruktur Backend & Database</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Informasi runtime server Node.js dan koneksi PostgreSQL.
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Runtime Engine</span>
                  <span className="font-mono font-medium text-slate-800">
                    Node.js {systemStats?.nodeVersion || 'v20+'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Database Engine</span>
                  <span className="font-medium text-slate-800">Neon Cloud Serverless PostgreSQL</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-600">Rate Limiter Keamanan</span>
                  <span className="font-semibold text-emerald-700">Aktif (20 req / 15 min per IP)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LOG AUDIT AKTIVITAS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Jejak Audit Aktivitas Administrator
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Mencatat riwayat perubahan peran, pembuatan kode registrasi, reset sandi, dan penghapusan akun.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter Event:</span>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
              >
                <option value="">Semua Event</option>
                <option value="USER_CREATED">USER_CREATED</option>
                <option value="USER_DELETED">USER_DELETED</option>
                <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                <option value="PASSWORD_RESET">PASSWORD_RESET</option>
                <option value="CODE_GENERATED">CODE_GENERATED</option>
                <option value="CODE_TOGGLED">CODE_TOGGLED</option>
                <option value="CODE_DELETED">CODE_DELETED</option>
                <option value="USER_REGISTERED">USER_REGISTERED</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Waktu</th>
                    <th className="px-5 py-3.5">Aksi / Event</th>
                    <th className="px-5 py-3.5">Aktor (Admin)</th>
                    <th className="px-5 py-3.5">Target</th>
                    <th className="px-5 py-3.5">Detail & Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center font-sans text-xs text-slate-500">
                        Belum ada catatan log audit yang terekam.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (log.action.includes('DELETE')) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                      else if (log.action.includes('ROLE') || log.action.includes('RESET')) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      else if (log.action.includes('CREATE') || log.action.includes('GENERATE') || log.action.includes('REGISTER')) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                              {log.action}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 font-sans whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{log.actorName || 'Sistem'}</span>
                            <span className="block text-[10px] text-slate-400">{log.actorEmail || ''}</span>
                          </td>

                          <td className="px-5 py-3.5 font-sans text-slate-800">
                            {log.targetName || log.targetId || '-'}
                          </td>

                          <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate" title={log.details || ''}>
                            {log.details || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH USER BARU */}
      {/* ========================================================================= */}
      {modalUserCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Tambah Pengguna Baru</h3>
              <button
                onClick={() => setModalUserCreate(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Nama merchant atau user"
                  value={formUser.name}
                  onChange={(e) => setFormUser({ ...formUser, name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700">Alamat Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={formUser.email}
                  onChange={(e) => setFormUser({ ...formUser, email: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700">Password Awal</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={formUser.password}
                  onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700">Peran / Hak Akses</label>
                <select
                  value={formUser.role}
                  onChange={(e) => setFormUser({ ...formUser, role: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                >
                  <option value="USER">USER (Kelola & lihat toko miliknya sendiri)</option>
                  <option value="ADMIN">ADMIN (Hak akses penuh seluruh sistem & semua toko)</option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalUserCreate(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
                >
                  {actionLoading ? 'Menyimpan...' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UBAH PERAN PENGGUNA */}
      {/* ========================================================================= */}
      {modalUserRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Ubah Peran Pengguna</h3>
              <button
                onClick={() => setModalUserRole(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="block text-[11px] text-slate-500">Target Akun:</span>
                <span className="font-semibold text-slate-900">{modalUserRole.name}</span>
                <span className="block text-slate-600">{modalUserRole.email}</span>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Pilih Peran Baru</label>
                <select
                  value={formNewRole}
                  onChange={(e) => setFormNewRole(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                >
                  <option value="USER">USER (Kelola & lihat toko miliknya sendiri)</option>
                  <option value="ADMIN">ADMIN (Hak akses penuh seluruh sistem & semua toko)</option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalUserRole(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD PENGGUNA */}
      {/* ========================================================================= */}
      {modalUserPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Reset Password Pengguna</h3>
              <button
                onClick={() => setModalUserPassword(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="block text-[11px] text-slate-500">Akun Pengguna:</span>
                <span className="font-semibold text-slate-900">{modalUserPassword.name}</span>
                <span className="block text-slate-600">{modalUserPassword.email}</span>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Password Baru</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={formNewPassword}
                  onChange={(e) => setFormNewPassword(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalUserPassword(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
                >
                  {actionLoading ? 'Menyimpan...' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS USER (SAFETY CONFIRMATION) */}
      {/* ========================================================================= */}
      {modalUserDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Konfirmasi Penghapusan User</h3>
                <span className="text-xs text-rose-700 font-medium">Tindakan ini tidak dapat dibatalkan</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
              <p>Apakah Anda yakin ingin menghapus akun berikut dari sistem?</p>
              <p className="font-semibold text-slate-900 pt-1">
                {modalUserDelete.name} ({modalUserDelete.email})
              </p>
              <p className="text-[11px] text-slate-500">
                Peran saat ini: <span className="font-semibold uppercase">{modalUserDelete.role}</span>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalUserDelete(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{actionLoading ? 'Menghapus...' : 'Ya, Hapus Akun'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS SESI TOKO (ADMIN DELETE STORE) */}
      {/* ========================================================================= */}
      {modalStoreDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Hapus Sesi Toko</h3>
                <span className="text-xs text-rose-700 font-medium">Toko akan dihapus dari akun terkait</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
              <p>Apakah Anda yakin ingin menghapus sesi toko ini?</p>
              <p className="font-semibold text-slate-900 pt-1">
                {modalStoreDelete.storeName} (ID: {modalStoreDelete.storeId})
              </p>
              {modalStoreDelete.owner && (
                <p className="text-[11px] text-slate-500">
                  Pemilik Akun: <span className="font-medium text-slate-700">{modalStoreDelete.owner.name} ({modalStoreDelete.owner.email})</span>
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalStoreDelete(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStore}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{actionLoading ? 'Menghapus...' : 'Ya, Hapus Toko'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BUAT KODE REGISTRASI BARU */}
      {/* ========================================================================= */}
      {modalCodeCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Generate Kode Registrasi Baru
                </h3>
              </div>
              <button
                onClick={() => setModalCodeCreate(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700">
                  Kustom Kode Registrasi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan untuk generate acak (contoh: REG-7K9M-2026)"
                  value={formCode.code}
                  onChange={(e) => setFormCode({ ...formCode, code: e.target.value })}
                  className="mt-1 h-9 w-full font-mono uppercase rounded-lg border border-slate-300 px-3 text-xs text-slate-800 placeholder:normal-case placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Bila dibiarkan kosong, sistem akan otomatis membuat kode unik.
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700">
                  Peran yang Ditetapkan Saat Mendaftar
                </label>
                <select
                  value={formCode.role}
                  onChange={(e) => setFormCode({ ...formCode, role: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                >
                  <option value="USER">USER (Merchant / Pengguna Toko Biasa)</option>
                  <option value="ADMIN">ADMIN (Hak Akses Penuh Sistem)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Max Uses */}
                <div>
                  <label className="block font-medium text-slate-700">Batas Kuota Pemakaian</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      disabled={formCode.isUnlimitedUses}
                      value={formCode.maxUses}
                      onChange={(e) => setFormCode({ ...formCode, maxUses: e.target.value })}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCode.isUnlimitedUses}
                      onChange={(e) =>
                        setFormCode({ ...formCode, isUnlimitedUses: e.target.checked })
                      }
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Tak terbatas (Unlimited)</span>
                  </label>
                </div>

                {/* Expiration Days */}
                <div>
                  <label className="block font-medium text-slate-700">Masa Berlaku (Hari)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      disabled={formCode.isNoExpiry}
                      value={formCode.expiresInDays}
                      onChange={(e) => setFormCode({ ...formCode, expiresInDays: e.target.value })}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCode.isNoExpiry}
                      onChange={(e) =>
                        setFormCode({ ...formCode, isNoExpiry: e.target.checked })
                      }
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Tanpa masa berlaku (Permanen)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Undangan untuk Merchant Baru"
                  value={formCode.description}
                  onChange={(e) => setFormCode({ ...formCode, description: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalCodeCreate(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
                >
                  {actionLoading ? 'Membuat...' : 'Buat Kode Registrasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS KODE REGISTRASI */}
      {/* ========================================================================= */}
      {modalCodeDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Hapus Kode Registrasi</h3>
                <span className="text-xs text-slate-500">Kode tidak akan dapat digunakan lagi</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
              <p>Apakah Anda yakin ingin menghapus kode berikut?</p>
              <p className="font-mono text-sm font-bold text-slate-900 pt-1">
                {modalCodeDelete.code}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Peran: {modalCodeDelete.role} &bull; Terpakai: {modalCodeDelete.usedCount} kali
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalCodeDelete(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCode}
                disabled={actionLoading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                {actionLoading ? 'Menghapus...' : 'Hapus Kode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
