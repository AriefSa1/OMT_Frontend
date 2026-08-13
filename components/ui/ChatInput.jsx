'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

// Input chat konsisten untuk seluruh aplikasi.
// - Kolom TIDAK bisa diubah ukurannya secara manual (resize-none) — tingginya hanya
//   menyesuaikan jumlah karakter/baris yang diketik, lalu menyusut kembali saat dihapus.
// - Tetap pada posisinya saat halaman di-scroll (sticky di bawah area kontennya).
// - Enter mengirim, Shift+Enter baris baru. `onSend(text)` dipanggil lalu draft dikosongkan.
//
//   <ChatInput onSend={handleSend} sending={sending} placeholder="Tulis pesan…" />
export default function ChatInput({
  onSend,
  sending = false,
  disabled = false,
  placeholder = 'Tulis pesan…',
  maxLength = 10000,
  minRows = 1,
  maxHeight = 176,
  sticky = true,
  helperText = 'Enter untuk mengirim · Shift+Enter baris baru',
  className,
}) {
  const [draft, setDraft] = useState('');
  const areaRef = useRef(null);

  // Tinggi mengikuti isi: reset ke auto lalu set ke scrollHeight (dibatasi maxHeight,
  // setelahnya baru muncul scroll internal). useLayoutEffect agar tak ada "kedip" tinggi.
  const autosize = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };
  useLayoutEffect(autosize, [draft, maxHeight]);
  // Sesuaikan juga saat ukuran viewport berubah (mis. rotasi / panel dibuka).
  useEffect(() => {
    window.addEventListener('resize', autosize);
    return () => window.removeEventListener('resize', autosize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = Boolean(draft.trim()) && !sending && !disabled;

  const submit = () => {
    const text = draft.trim();
    if (!text || sending || disabled) return;
    onSend?.(text);
    setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={cn(
        sticky && 'sticky bottom-0 z-10',
        'border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80',
        className,
      )}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20">
          <label htmlFor="chat-input" className="sr-only">Pesan</label>
          <textarea
            id="chat-input"
            ref={areaRef}
            rows={minRows}
            value={draft}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-[1.5rem] flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Kirim pesan"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {(helperText || maxLength) && (
          <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>{helperText}</span>
            {maxLength ? <span className="tabular-nums">{draft.length}/{maxLength}</span> : <span />}
          </div>
        )}
      </form>
    </div>
  );
}
