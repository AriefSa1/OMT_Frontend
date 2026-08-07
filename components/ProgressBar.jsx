'use client';

/**
 * Bilah progres yang dapat dipakai ulang di seluruh aplikasi.
 *
 * Dua mode:
 *  - Determinate: beri `value` 0–100. Lebar bilah mengikuti nilai (mis. dari
 *    `useTrickleProgress` saat Sync, atau progres nyata seperti unduhan CSV).
 *  - Indeterminate: set `indeterminate` (abaikan `value`) untuk pita yang meluncur —
 *    saat durasi/porsi kerja tidak diketahui sama sekali.
 *
 * Warna mengikuti aksen merek (rose). Menghormati `prefers-reduced-motion` lewat kelas
 * di globals.css.
 */
export default function ProgressBar({
  value = 0,
  indeterminate = false,
  height = 4,
  className = '',
  trackClassName = '',
  label = null,
  showValue = false,
  rounded = true,
}) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = rounded ? 'rounded-full' : '';

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
          {label && <span>{label}</span>}
          {showValue && !indeterminate && <span className="tabular-nums">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div
        className={`relative overflow-hidden bg-slate-200/80 ${radius} ${trackClassName}`}
        style={{ height }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
        aria-label={typeof label === 'string' ? label : 'Progres'}
      >
        {indeterminate ? (
          <span className="progress-indeterminate" />
        ) : (
          <span
            className={`absolute inset-y-0 left-0 bg-rose-600 ${radius}`}
            style={{ width: `${clamped}%`, transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        )}
      </div>
    </div>
  );
}
