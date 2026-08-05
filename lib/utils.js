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

// STATUS.FRESH and STATUS.PENDING in the backend snapshot service. Both mean the snapshot
// actually holds measurements.
const MEASURED_STATUSES = new Set(['Segar', 'Tertunda']);

/**
 * Why a list is empty. A measured snapshot with no rows means the rule matched nothing —
 * saying "Snapshot lokal siap digunakan" there explains nothing to the reader. Only when
 * the snapshot itself is missing or stale does its own message answer the question.
 */
export function emptyListReason(meta, criterionMessage) {
  const status = meta?.status || meta?.freshness;
  if (status && MEASURED_STATUSES.has(status)) return criterionMessage;
  return meta?.message || criterionMessage;
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || value === '') return 'Belum tersedia';
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(digits)}%` : 'Belum tersedia';
}
