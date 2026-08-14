'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import InfoTooltip from '../InfoTooltip';
import { cn } from '../../lib/utils';

// Ubin KPI kompak — ~setengah tinggi MetricCard. Untuk baris ringkasan angka yang
// banyak (mis. metrik iklan di Beranda) supaya muat tanpa scroll panjang. Tanpa kotak
// ikon/subtitle; nilai tetap menonjol, tren tetap ada.
export default function StatTile({ title, value, trend = null, invertTrendColor = false, tip = null, accent = false }) {
  const direction = trend?.direction || null;
  const isUp = direction === 'up';
  const isDown = direction === 'down';
  const positive = invertTrendColor ? isDown : isUp;
  const negative = invertTrendColor ? isUp : isDown;
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const trendClass = positive ? 'text-emerald-700' : negative ? 'text-rose-700' : 'text-slate-400';
  const changeLabel = Number.isFinite(Number(trend?.changePercent))
    ? `${Number(trend.changePercent) > 0 ? '+' : ''}${Number(trend.changePercent).toFixed(1)}%`
    : direction === 'flat' ? 'sama' : '';

  return (
    <div className={cn('surface metric-tile min-w-0 px-3.5 py-2.5', accent && 'ring-1 ring-teal-300')}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500">
        <span className="truncate">{title}</span>
        {tip && <InfoTooltip label={title}>{tip}</InfoTooltip>}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span
          className="min-w-0 truncate text-xl font-bold tracking-[-0.035em] text-slate-950"
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        >
          {value}
        </span>
        {direction && (
          <span className={cn('inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold', trendClass)}>
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {changeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
