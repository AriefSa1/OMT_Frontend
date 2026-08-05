'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/**
 * `trend` adalah objek pembanding dari backend (`kpiTrend.<metrik>`):
 *   { current, previous, direction: 'up'|'down'|'flat'|null, changePercent: number|null }
 *
 * `direction: null` berarti salah satu sisi belum terukur — tidak ada panah yang
 * ditampilkan, karena panah tanpa pembanding adalah klaim arah yang tidak dimiliki data.
 *
 * Arah TIDAK diberi makna baik/buruk di sini: hijau untuk naik dan merah untuk turun
 * sesuai permintaan tampilan. Untuk metrik yang "naik = buruk" (mis. biaya iklan),
 * pemanggil dapat membalik warna lewat `invertTrendColor`.
 */
export default function MetricCard({ title, value, icon: Icon, subtitle, tone = 'slate', trend = null, invertTrendColor = false }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  const direction = trend?.direction || null;
  const isUp = direction === 'up';
  const isDown = direction === 'down';
  const positive = invertTrendColor ? isDown : isUp;
  const negative = invertTrendColor ? isUp : isDown;
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const trendClass = positive ? 'text-emerald-700 bg-emerald-50' : negative ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100';
  const changeLabel = Number.isFinite(Number(trend?.changePercent))
    ? `${Number(trend.changePercent) > 0 ? '+' : ''}${Number(trend.changePercent).toFixed(1)}%`
    : direction === 'flat' ? 'sama' : '';

  return (
    <section className="surface min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-600">{title}</p>
        {Icon && <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone] || tones.slate}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        {/* truncate cuts long IDR figures with no way to read them — keep the full value
            available on hover and to assistive technology. */}
        <p className="min-w-0 truncate text-2xl font-semibold text-slate-900" title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}>{value}</p>
        {direction && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${trendClass}`}
            title={trend?.previous !== null && trend?.previous !== undefined ? `Kemarin: ${trend.previous}` : undefined}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {changeLabel}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>}
    </section>
  );
}
