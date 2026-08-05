'use client';

import { Radio } from 'lucide-react';
import EmptyState from './EmptyState';
import { formatDataTime } from './StatusBadge';
import { formatIDR, formatPercent } from '../lib/utils';

function shareLabel(ratio) {
  return ratio === null || ratio === undefined ? 'Belum tersedia' : formatPercent(ratio * 100, 1);
}

/**
 * Sales by traffic channel, read live from Seller Center.
 *
 * The shares are Shopee's own and deliberately not renormalised: paid ads overlap the
 * organic channels, so they do not add up to 100% and must not be drawn as if they did.
 */
export default function TrafficSourcePanel({ traffic, loading = false }) {
  if (loading) return <div className="skeleton h-64 rounded-md" />;

  if (!traffic || traffic.source !== 'SHOPEE_API' || !traffic.channels?.length) {
    return (
      <EmptyState
        title="Sumber kunjungan belum tersedia"
        message={traffic?.message || 'Seller Center tidak mengembalikan rincian sumber kunjungan.'}
      />
    );
  }

  const maxSales = Math.max(...traffic.channels.map((channel) => Number(channel.sales) || 0), 1);

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Sumber penjualan</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {traffic.days} hari terakhir · total {formatIDR(traffic.totalSales)}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDataTime(traffic.dataAsOf)}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {traffic.channels.map((channel) => (
          <li key={channel.key}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-700" title={channel.label}>{channel.label}</span>
              <span className="shrink-0 text-slate-500">
                <span className="font-semibold text-slate-900">{formatIDR(channel.sales)}</span> · {shareLabel(channel.ratio)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${Math.round(((Number(channel.sales) || 0) / maxSales) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-5 text-slate-500">
        Pangsa berasal dari Seller Center dan tidak dijumlahkan menjadi 100%: penjualan berbantuan iklan juga tercatat pada kanal organiknya.
      </p>
    </section>
  );
}
