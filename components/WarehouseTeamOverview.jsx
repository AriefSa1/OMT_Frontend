'use client';

import { Boxes, PackageCheck, RotateCcw, ShoppingCart, Truck } from 'lucide-react';
import EmptyState from './EmptyState';
import { formatDataTime } from './StatusBadge';
import { formatIDR, formatNumber } from '../lib/utils';

const ONGOING_LABELS = {
  restock: { label: 'Restock berjalan', icon: Truck, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  return: { label: 'Retur berjalan', icon: RotateCcw, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
};

function Figure({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900" title={typeof value === 'string' ? value : undefined}>{value}</dd>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * Team-scoped inventory KPIs read live from PDC Gudang. The scope is stated on the panel:
 * these cover one team, while the inventory table below spans every team the account sees.
 */
export default function WarehouseTeamOverview({ overview, loading = false }) {
  if (loading) return <div className="skeleton h-40 rounded-md" />;

  if (!overview || overview.source !== 'WAREHOUSE_API' || !overview.data) {
    return (
      <EmptyState
        title="Ringkasan inventori tim belum tersedia"
        message={overview?.message || 'Gudang tidak mengembalikan ringkasan inventori untuk akun ini.'}
      />
    );
  }

  const { team, products, ready, ongoing = [], invoice, invoiceFromOtherTeam, orderCount } = overview.data;

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Ringkasan inventori tim</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cakupan {team?.name || 'tim aktif'}{team?.code ? ` (kode ${team.code})` : ''} — bukan seluruh gudang pada tabel di bawah.
          </p>
        </div>
        <span className="text-xs text-slate-500">Langsung dari PDC Gudang · {formatDataTime(overview.dataAsOf)}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Figure label="Produk" value={formatNumber(products?.productCount)} hint={`${formatNumber(products?.skuCount)} SKU · ${formatNumber(products?.bundleCount)} bundle`} />
        <Figure label="Stok siap kirim" value={formatNumber(ready?.stock)} hint={`${formatNumber(ready?.skuCount)} SKU`} />
        <Figure label="Nilai aset siap" value={formatIDR(ready?.assetsTotal)} hint="Harga modal x stok siap" />
        <Figure label="Invoice tim" value={formatNumber(invoice?.count)} hint={formatIDR(invoice?.total)} />
        <Figure label="Invoice tim lain" value={formatNumber(invoiceFromOtherTeam?.count)} hint={formatIDR(invoiceFromOtherTeam?.total)} />
        <Figure label="Order tercatat" value={formatNumber(orderCount)} hint="Sepanjang riwayat tim" />
      </dl>

      {/* Only the categories the warehouse reported. A category it did not mention is not
          claimed to be zero. */}
      {ongoing.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ongoing.map((row) => {
            const meta = ONGOING_LABELS[row.type] || { label: row.type || 'Proses berjalan', icon: Boxes, tone: 'text-slate-700 bg-slate-50 border-slate-200' };
            const Icon = meta.icon || PackageCheck;
            return (
              <div key={row.type} className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 ${meta.tone}`}>
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {meta.label}
                </span>
                <span className="text-right text-xs">
                  <span className="block font-semibold">{formatNumber(row.stock)} unit · {formatNumber(row.skuCount)} SKU</span>
                  <span className="block text-[11px] opacity-80">{formatIDR(row.assetsTotal)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
        Angka pada panel ini dibaca saat halaman dimuat, bukan dari snapshot sinkronisasi.
      </p>
    </section>
  );
}
