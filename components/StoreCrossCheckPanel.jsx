'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { GitCompareArrows, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { fetchMarketplacePerformance, fetchProductOverview } from '../lib/api';
import { formatIDR, formatNumber } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useDateRange } from '../context/DateRangeContext';

function metricValue(metrics, key) {
  const cell = metrics?.[key];
  if (!cell) return 0;
  return Number(cell.value) || 0;
}

// Selisih Gudang - Shopee. Untuk omzet/pesanan, keduanya "makin dekat makin baik".
function DiffPill({ shopee, gudang, money = false }) {
  const diff = (gudang || 0) - (shopee || 0);
  const pct = shopee ? (diff / shopee) * 100 : null;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const cls = diff === 0 ? 'text-slate-500 bg-slate-100' : Math.abs(pct ?? 0) <= 5 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${cls}`} title="Selisih Gudang − Shopee">
      <Icon className="h-3 w-3" />
      {money ? formatIDR(Math.abs(diff)) : formatNumber(Math.abs(diff))}
      {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}
    </span>
  );
}

export default function StoreCrossCheckPanel() {
  const { selectedStore } = useStore();
  const { startDate, endDate } = useDateRange();
  const [gudangRow, setGudangRow] = useState(null);
  const [shopeeMetrics, setShopeeMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const mpId = selectedStore?.marketplaceId || null;

  const load = useCallback(async () => {
    if (!mpId) return;
    setLoading(true);
    setMessage('');
    const [mp, ov] = await Promise.all([
      fetchMarketplacePerformance({ startDate, endDate }),
      fetchProductOverview({ storeId: selectedStore?.storeId || null, startDate, endDate }),
    ]);
    const row = (mp?.rows || []).find((r) => String(r.id) === String(mpId)) || null;
    setGudangRow(row);
    setShopeeMetrics(ov?.metrics || null);
    if (!row) setMessage('Marketplace terpetakan tidak ditemukan di data Gudang untuk rentang ini.');
    setLoading(false);
  }, [mpId, selectedStore?.storeId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // Toko belum dipetakan → ajakan memetakan.
  if (!mpId) {
    return (
      <section className="surface p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><GitCompareArrows className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Cross-check Shopee ↔ Gudang</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Toko ini belum dipetakan ke marketplace Gudang, jadi angka tak bisa dibandingkan.
              Petakan di <Link href="/settings" className="font-semibold text-rose-700 hover:text-rose-800">Pengaturan › Hubungkan Toko</Link> (dropdown Marketplace Gudang).
            </p>
          </div>
        </div>
      </section>
    );
  }

  const shopeeGmv = metricValue(shopeeMetrics, 'confirmed_gmv');
  const shopeeOrders = metricValue(shopeeMetrics, 'placed_orders');
  const gudangOmzet = gudangRow?.orderAmount || 0;
  const gudangOrders = gudangRow?.orderCount || 0;
  const profitLoss = gudangRow?.profitLoss || 0;

  return (
    <section className="surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600"><GitCompareArrows className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Cross-check Shopee ↔ Gudang</h2>
            <p className="text-[11px] text-slate-500">{selectedStore?.storeName} ↔ {selectedStore?.marketplaceName || `MP #${mpId}`}</p>
          </div>
        </div>
      </div>

      {message && <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</p>}

      <div className="table-scroll">
        <table className="w-full text-left text-xs">
          <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">Metrik</th>
              <th className="px-3 py-2.5 text-right font-medium">Menurut Shopee</th>
              <th className="px-3 py-2.5 text-right font-medium">Menurut Gudang</th>
              <th className="px-3 py-2.5 text-right font-medium">Selisih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-3 py-2.5 font-medium text-slate-700">Omzet</td>
              <td className="px-3 py-2.5 text-right text-slate-800">{loading ? '…' : formatIDR(shopeeGmv)}</td>
              <td className="px-3 py-2.5 text-right text-slate-800">{loading ? '…' : formatIDR(gudangOmzet)}</td>
              <td className="px-3 py-2.5 text-right">{!loading && gudangRow && <DiffPill shopee={shopeeGmv} gudang={gudangOmzet} money />}</td>
            </tr>
            <tr>
              <td className="px-3 py-2.5 font-medium text-slate-700">Pesanan</td>
              <td className="px-3 py-2.5 text-right text-slate-800">{loading ? '…' : formatNumber(shopeeOrders)}</td>
              <td className="px-3 py-2.5 text-right text-slate-800">{loading ? '…' : formatNumber(gudangOrders)}</td>
              <td className="px-3 py-2.5 text-right">{!loading && gudangRow && <DiffPill shopee={shopeeOrders} gudang={gudangOrders} />}</td>
            </tr>
            <tr>
              <td className="px-3 py-2.5 font-medium text-slate-700">Laba/rugi (Gudang)</td>
              <td className="px-3 py-2.5 text-right text-slate-400">—</td>
              <td className={`px-3 py-2.5 text-right font-semibold ${profitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{loading ? '…' : formatIDR(profitLoss)}</td>
              <td className="px-3 py-2.5 text-right text-slate-400">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Definisi bisa sedikit berbeda: “Omzet” Shopee = GMV dikonfirmasi (product overview),
        “Pesanan” = pesanan dibuat; sedangkan Gudang menghitung dari pencatatannya sendiri.
        Selisih besar (&gt;5%) layak ditelusuri. Laba/rugi hanya tersedia dari sisi Gudang.
      </p>
    </section>
  );
}
