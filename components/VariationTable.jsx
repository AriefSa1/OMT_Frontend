'use client';

import { Layers } from 'lucide-react';
import EmptyState from './EmptyState';
import { formatNumber, formatPercent } from '../lib/utils';

/**
 * Daftar varian satu produk, terurut menurun menurut penjualan.
 *
 * `summary.hasSoldData` membedakan dua keadaan yang tampak sama di layar tapi berbeda
 * artinya: varian yang benar-benar belum pernah terjual (Shopee mengirim 0), versus
 * Seller Center yang memang belum mencatat penjualan per varian untuk produk ini. Kolom
 * pangsa hanya muncul pada keadaan pertama — tanpa penyebut yang berarti, persentase
 * hanyalah pembagian dengan nol yang disamarkan.
 */
export default function VariationTable({ variations = [], summary = null, compact = false }) {
  if (!variations.length) {
    return (
      <EmptyState
        title="Tidak ada varian"
        message={summary?.message || 'Produk ini tidak memiliki varian pada snapshot katalog.'}
      />
    );
  }

  const hasSold = Boolean(summary?.hasSoldData);
  const rows = compact ? variations.slice(0, 5) : variations;

  return (
    <div>
      <div className="table-scroll">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Varian</th>
              <th className="px-3 py-2.5 text-right font-medium">Terjual</th>
              {hasSold && <th className="px-3 py-2.5 text-right font-medium">Pangsa</th>}
              <th className="px-4 py-2.5 text-right font-medium">Stok</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((variation, index) => {
              const rank = variation.rank || index + 1;
              const isTop = hasSold && rank === 1 && Number(variation.soldCount) > 0;
              return (
                <tr key={variation.id || variation.shopeeModelId || `${variation.name}-${index}`} className={isTop ? 'bg-emerald-50/40' : undefined}>
                  <td className="px-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-right text-[10px] font-semibold text-slate-400">{rank}</span>
                      <span className="truncate font-medium text-slate-800" title={variation.name}>{variation.name || 'Tanpa nama'}</span>
                      {isTop && <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">Terlaris</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{formatNumber(variation.soldCount)}</td>
                  {hasSold && (
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {variation.soldShare === null || variation.soldShare === undefined ? '—' : formatPercent(variation.soldShare, 1)}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right text-slate-700">{formatNumber(variation.stock)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {compact && variations.length > rows.length && (
        <p className="px-4 py-2 text-[11px] text-slate-500">
          Menampilkan {rows.length} dari {variations.length} varian — buka detail produk untuk daftar lengkap.
        </p>
      )}

      {summary && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" aria-hidden="true" />{summary.count} varian</span>
          {hasSold
            ? <span>{formatNumber(summary.soldTotal)} terjual (penjumlahan varian)</span>
            : <span>{summary.message || 'Penjualan per varian belum tercatat.'}</span>}
          <span>Stok gabungan {formatNumber(summary.stockTotal)}</span>
          {hasSold && summary.zeroSellerCount ? <span>{summary.zeroSellerCount} varian belum terjual</span> : null}
        </p>
      )}
    </div>
  );
}
