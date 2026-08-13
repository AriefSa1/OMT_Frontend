'use client';

import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// Satu sumber kebenaran untuk semua tombol. Ganti <button className="..."> yang tersebar
// di tiap halaman dengan <Button variant size icon loading> agar bentuk, tinggi, radius,
// state fokus, dan disabled seragam di seluruh aplikasi.
// Disabled/loading meredupkan warna variannya sendiri (opacity) alih-alih berubah
// jadi abu — jadi spinner saat loading tetap kontras dan state konsisten antar varian.
const VARIANTS = {
  primary: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:opacity-60',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
  subtle: 'border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50',
  // neutral: aksi "simpan/konfirmasi" bertekanan tinggi tapi non-brand (slate gelap).
  neutral: 'bg-slate-800 text-white shadow-sm hover:bg-slate-700 disabled:opacity-60',
  // info: aksi sekunder informatif (tes koneksi, cek) — indigo lembut.
  info: 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-60',
};

const SIZES = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-[11px]',
  md: 'h-9 gap-2 rounded-md px-3.5 text-xs',
  lg: 'h-10 gap-2 rounded-lg px-4 text-sm',
  icon: 'h-9 w-9 rounded-md',
};

const ICON_SIZE = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-4 w-4', icon: 'h-4 w-4' };

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    children,
    disabled = false,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconClass = ICON_SIZE[size] || ICON_SIZE.md;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className={cn(iconClass, 'animate-spin')} aria-hidden="true" />
      ) : Icon ? (
        <Icon className={cn(iconClass, 'shrink-0')} aria-hidden="true" />
      ) : null}
      {children != null && <span className={size === 'icon' ? 'sr-only' : undefined}>{children}</span>}
      {!loading && IconRight ? <IconRight className={cn(iconClass, 'shrink-0')} aria-hidden="true" /> : null}
    </button>
  );
});

export default Button;
