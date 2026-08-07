'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSnapshotRefresh(onRefresh) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const handler = () => refreshRef.current?.();
    window.addEventListener('snapshot:updated', handler);
    return () => window.removeEventListener('snapshot:updated', handler);
  }, []);
}

/**
 * Menutup panel (dropdown/menu/tooltip) saat pengguna mengklik di luar elemennya atau
 * menekan Escape. Mengembalikan `ref` untuk dipasang di elemen pembungkus panel.
 * Sebelumnya logika ini disalin di Navbar dan InfoTooltip — disatukan di sini agar
 * satu perilaku, satu tempat perbaikan.
 *
 *   const ref = useClickOutside(() => setOpen(false), open);
 *   <div ref={ref}> ... </div>
 */
export function useClickOutside(onOutside, active = true) {
  const ref = useRef(null);
  const handlerRef = useRef(onOutside);
  useEffect(() => { handlerRef.current = onOutside; }, [onOutside]);

  useEffect(() => {
    if (!active) return undefined;
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handlerRef.current?.(event);
    };
    const onKey = (event) => { if (event.key === 'Escape') handlerRef.current?.(event); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [active]);

  return ref;
}

/**
 * Progress "trickle" gaya NProgress untuk operasi yang durasinya tak bisa diketahui pasti
 * dari klien (mis. Sync yang memblokir satu request). Bilah naik cepat lalu melambat
 * mendekati ~90% (menandakan "masih bekerja", jujur sebagai indikator aktivitas — bukan
 * klaim persentase data), dan hanya menyentuh 100% saat `done()` dipanggil ketika respons
 * nyata tiba. Cocok dipakai bersama komponen <ProgressBar />.
 *
 *   const progress = useTrickleProgress();
 *   progress.start(); await doWork(); progress.done();
 */
export function useTrickleProgress({ initial = 8, ceiling = 90, intervalMs = 400 } = {}) {
  const [value, setValue] = useState(0);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback(() => {
    clear();
    setActive(true);
    setValue(initial);
    timerRef.current = window.setInterval(() => {
      setValue((current) => {
        if (current >= ceiling) return current;
        // Langkah mengecil saat mendekati langit-langit → melambat secara alami.
        const remaining = ceiling - current;
        const step = Math.max(0.5, remaining * 0.18);
        return Math.min(ceiling, current + step);
      });
    }, intervalMs);
  }, [clear, initial, ceiling, intervalMs]);

  const done = useCallback(() => {
    clear();
    setValue(100);
    // Beri waktu bilah penuh terlihat sebelum disembunyikan.
    window.setTimeout(() => { setActive(false); setValue(0); }, 450);
  }, [clear]);

  const reset = useCallback(() => { clear(); setActive(false); setValue(0); }, [clear]);

  useEffect(() => clear, [clear]);

  return { value, active, start, done, reset };
}
