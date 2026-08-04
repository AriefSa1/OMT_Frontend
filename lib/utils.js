import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatIDR(amount) {
  if (amount === null || amount === undefined || amount === '') return 'Belum tersedia';
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'Belum tersedia';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(num) {
  if (num === null || num === undefined || num === '') return 'Belum tersedia';
  const value = Number(num);
  if (!Number.isFinite(value)) return 'Belum tersedia';
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || value === '') return 'Belum tersedia';
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(digits)}%` : 'Belum tersedia';
}
