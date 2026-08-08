'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const DateRangeContext = createContext();
const STORAGE_KEY = 'omt_date_range';

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/**
 * Hitung {startDate, endDate} (ISO 'YYYY-MM-DD') dari sebuah preset.
 * Tanggal dihitung dari waktu lokal browser; backend menafsirkannya sebagai WIB.
 */
export function rangeForPreset(preset) {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { startDate: fmt(today), endDate: fmt(today) };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case '30d':
      return { startDate: fmt(addDays(today, -29)), endDate: fmt(today) };
    case 'thismonth': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(first), endDate: fmt(today) };
    }
    case '7d':
    default:
      return { startDate: fmt(addDays(today, -6)), endDate: fmt(today) };
  }
}

export const DATE_PRESETS = [
  { key: 'today', label: 'Hari ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: '7d', label: '7 hari' },
  { key: '30d', label: '30 hari' },
  { key: 'thismonth', label: 'Bulan ini' },
  { key: 'custom', label: 'Custom' },
];

export function DateRangeProvider({ children }) {
  const [preset, setPresetState] = useState('7d');
  const [range, setRange] = useState(() => rangeForPreset('7d'));

  // Muat pilihan tersimpan sekali di sisi klien.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.preset) {
        setPresetState(saved.preset);
        if (saved.preset === 'custom' && saved.startDate && saved.endDate) {
          setRange({ startDate: saved.startDate, endDate: saved.endDate });
        } else {
          setRange(rangeForPreset(saved.preset));
        }
      }
    } catch { /* abaikan */ }
  }, []);

  const persist = useCallback((next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* abaikan */ }
  }, []);

  const setPreset = useCallback((key) => {
    setPresetState(key);
    if (key !== 'custom') {
      const r = rangeForPreset(key);
      setRange(r);
      persist({ preset: key, ...r });
    } else {
      persist({ preset: 'custom', ...range });
    }
  }, [persist, range]);

  const setCustomRange = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return;
    setPresetState('custom');
    setRange({ startDate, endDate });
    persist({ preset: 'custom', startDate, endDate });
  }, [persist]);

  const value = useMemo(() => ({
    preset,
    startDate: range.startDate,
    endDate: range.endDate,
    setPreset,
    setCustomRange,
    // Params siap-pakai untuk fungsi lib/api.
    apiParams: { startDate: range.startDate, endDate: range.endDate },
  }), [preset, range, setPreset, setCustomRange]);

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within a DateRangeProvider');
  return ctx;
}
