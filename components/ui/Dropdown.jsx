'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const DropdownCtx = createContext(null);

// Menu dropdown reusable & mudah diakses (klik-luar/Escape menutup, panah untuk navigasi).
// Pakai `trigger` untuk elemen pemicu kustom, atau `label` untuk tombol standar.
//
//   <Dropdown label="Aksi" align="right">
//     <DropdownItem icon={Pencil} onClick={...}>Ubah</DropdownItem>
//     <DropdownItem icon={Trash2} danger onClick={...}>Hapus</DropdownItem>
//   </Dropdown>
export default function Dropdown({
  trigger,
  label,
  align = 'left',
  width = 'w-56',
  className,
  panelClassName,
  children,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  // Klik di luar / Escape menutup — sekaligus mengembalikan fokus ke pemicu saat Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Saat terbuka, fokuskan item pertama agar bisa langsung dinavigasi dengan keyboard.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector('[data-dd-item]:not([aria-disabled="true"])');
    first?.focus();
  }, [open]);

  const onPanelKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...panelRef.current.querySelectorAll('[data-dd-item]:not([aria-disabled="true"])')];
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    let next = 0;
    if (event.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length;
    else if (event.key === 'ArrowUp') next = idx <= 0 ? items.length - 1 : idx - 1;
    else if (event.key === 'End') next = items.length - 1;
    items[next].focus();
  };

  const ctx = useMemo(() => ({ close }), [close]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {trigger ? (
        <span ref={triggerRef} onClick={() => setOpen((v) => !v)}>{trigger}</span>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
        >
          <span>{label}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="menu"
          onKeyDown={onPanelKeyDown}
          className={cn(
            'dropdown-panel absolute top-full z-50 mt-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5',
            align === 'right' ? 'right-0' : 'left-0',
            width,
            panelClassName,
          )}
        >
          <DropdownCtx.Provider value={ctx}>{children}</DropdownCtx.Provider>
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  icon: Icon,
  onClick,
  href,
  active = false,
  danger = false,
  disabled = false,
  closeOnSelect = true,
  className,
}) {
  const ctx = useContext(DropdownCtx);
  const handle = (event) => {
    if (disabled) return;
    onClick?.(event);
    if (closeOnSelect) ctx?.close();
  };
  const classes = cn(
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none',
    disabled
      ? 'cursor-not-allowed text-slate-300'
      : danger
        ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50'
        : active
          ? 'bg-rose-50 font-semibold text-rose-700'
          : 'text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 hover:text-slate-900',
    className,
  );
  const inner = (
    <>
      {Icon && <Icon className={cn('h-4 w-4 shrink-0', danger ? 'text-red-500' : active ? 'text-rose-600' : 'text-slate-400')} aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} role="menuitem" data-dd-item tabIndex={-1} onClick={handle} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" data-dd-item tabIndex={-1} aria-disabled={disabled || undefined} onClick={handle} className={classes}>
      {inner}
    </button>
  );
}

export function DropdownLabel({ children }) {
  return <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{children}</div>;
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}
