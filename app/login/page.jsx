'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BarChart3, CheckCircle2, KeyRound, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    registrationSecret: ''
  });
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('invitation') || searchParams.get('invite');
    const modeParam = searchParams.get('mode');

    if (codeParam) {
      setMode('register');
      setForm((prev) => ({ ...prev, registrationSecret: codeParam.trim() }));
      setInfoMessage(`Kode undangan ${codeParam.trim()} terpasang otomatis.`);
    } else if (modeParam === 'register') {
      setMode('register');
    }
  }, [searchParams]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!form.name.trim()) return setError('Nama lengkap wajib diisi.');
      if (form.password.length < 6) return setError('Password minimal 6 karakter.');
      if (form.password !== form.confirmPassword) return setError('Konfirmasi password tidak sama.');
      if (!form.registrationSecret.trim()) return setError('Kode registrasi / undangan dari Admin wajib diisi.');
    }

    setSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register(form.name, form.email, form.password, form.registrationSecret);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Autentikasi tidak berhasil.');
      }
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    if (error) setError('');
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden border-r border-slate-200 bg-white p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Pusat Operasi</span>
            <span className="block text-xs text-slate-500">Shopee dan gudang</span>
          </span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-slate-900">
            Data toko yang jelas untuk keputusan harian.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Pantau katalog Shopee, iklan, gudang, dan tindak lanjut dari satu ruang kerja operasional terpadu.
          </p>
        </div>
        <p className="text-xs text-slate-500">Akses internal &bull; Sistem Terlindungi</p>
      </section>

      <main className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-900">Pusat Operasi</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'login'
              ? 'Gunakan akun internal Anda untuk melanjutkan.'
              : 'Daftarkan akun internal dengan kode registrasi.'}
          </p>

          <div className="mt-6 flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`h-10 border-b-2 px-3 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`h-10 border-b-2 px-3 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Daftar
            </button>
          </div>

          {infoMessage && mode === 'register' && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="text-xs font-medium text-slate-700">Nama Lengkap</span>
                <span className="relative mt-1 block">
                  <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={form.name}
                    onChange={field('name')}
                    required
                    placeholder="Nama Anda"
                    className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Email Internal</span>
              <span className="relative mt-1 block">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={field('email')}
                  required
                  placeholder="nama@perusahaan.com"
                  className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Password</span>
              <span className="relative mt-1 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={field('password')}
                  required
                  placeholder="Minimal 6 karakter"
                  className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                />
              </span>
            </label>

            {mode === 'register' && (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Konfirmasi Password</span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={field('confirmPassword')}
                    required
                    placeholder="Ulangi password"
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Kode Registrasi / Undangan</span>
                  <span className="relative mt-1 block">
                    <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.registrationSecret}
                      onChange={field('registrationSecret')}
                      placeholder="Contoh: REG-XXXX-2026"
                      className="h-10 w-full font-mono uppercase rounded-md border border-slate-300 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                    />
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Pendaftaran memerlukan kode registrasi yang digenerate oleh Administrator.
                  </span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
            >
              {submitting
                ? 'Memproses...'
                : mode === 'login'
                ? 'Masuk ke Dashboard'
                : 'Daftarkan Akun'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Memuat...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
