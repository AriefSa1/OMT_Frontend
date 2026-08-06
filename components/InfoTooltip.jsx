'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/**
 * Ikon info kecil dengan penjelasan singkat — dipakai di sebelah label metrik supaya
 * pengguna tidak perlu menebak arti "AOV", "ROAS", "UV", dsb. Bekerja dengan hover, fokus
 * keyboard, dan sentuhan (klik toggle di layar sentuh yang tak punya hover). Ringan, tanpa
 * dependensi tooltip eksternal.
 */
export default function InfoTooltip({ label, children, side = 'top', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const pos = side === 'top'
    ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
    : 'top-full left-1/2 mt-1.5 -translate-x-1/2';

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label ? `Penjelasan ${label}` : 'Penjelasan'}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="inline-flex items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-30 ${pos} w-56 rounded-lg bg-slate-800 px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed text-slate-100 shadow-lg`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
