'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { GitCompareArrows, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { fetchMarketplacePerformance, fetchProductOverview, fetchShopeeAds } from '../lib/api';
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
  const { startDate, endDate, shopeePeriod } = useDateRange();
  const [gudangRow, setGudangRow] = useState(null);
  const [shopeeMetrics, setShopeeMetrics] = useState(null);
  const [shopeeAds, setShopeeAds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const mpId = selectedStore?.marketplaceId || null;

  const load = useCallback(async () => {
    if (!mpId) return;
    setLoading(true);
    setMessage('');
    try {
      const [mp, ov, ads] = await Promise.all([
        fetchMarketplacePerformance({ startDate, endDate }),
        fetchProductOverview({ storeId: selectedStore?.storeId || null, startDate, endDate, period: shopeePeriod || undefined }),
        fetchShopeeAds({ storeId: selectedStore?.storeId || null, startDate, endDate }).catch(() => null),
      ]);
      const row = (mp?.rows || []).find((r) => String(r.id) === String(mpId)) || null;
      setGudangRow(row);
      setShopeeMetrics(ov?.metrics || null);
      setShopeeAds(ads || null);
      if (!row) setMessage('Marketplace terpetakan tidak ditemukan di data Gudang untuk rentang ini.');
    } catch (err) {
      setGudangRow(null);
      setShopeeMetrics(null);
      setShopeeAds(null);
      setMessage(`Gagal memuat cross-check: ${err?.message || 'kesalahan tak terduga'}`);
    } finally {
      setLoading(false);
    }
  }, [mpId, selectedStore?.storeId, startDate, endDate, shopeePeriod]);

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
  // "Harga beli" masuk ke spentAmount (HPP + biaya) dari Gudang. Laba/rugi = omzet −
  // HPP(incl. harga beli) − iklan − retur. profitLoss dari Gudang adalah nilai
  // otoritatifnya; bila 0 tapi komponen ada, hitung sebagai fallback transparan.
  const gudangHpp = gudangRow?.spentAmount || 0;      // termasuk harga beli
  const gudangAds = gudangRow?.adsTotal || 0;
  const gudangReturn = gudangRow?.returnAmount || 0;
  const profitAuthoritative = gudangRow ? Number(gudangRow.profitLoss) : 0;
  const profitComputed = gudangOmzet - gudangHpp - gudangAds - gudangReturn;
  const profitLoss = (gudangRow && profitAuthoritative !== 0) ? profitAuthoritative : profitComputed;

  // --- Estimasi laba/rugi sisi Shopee ---
  // Shopee tak tahu HPP/retur → pinjam dari Gudang, DISKALAKAN per-pesanan (karena
  // omzet Shopee ≠ Gudang). Iklan pakai belanja iklan Shopee (real). Hasil = ESTIMASI.
  const shopeeAdSpend = Number(shopeeAds?.totalSpend) || 0;
  const perOrderHpp = gudangOrders > 0 ? gudangHpp / gudangOrders : 0;
  const perOrderReturn = gudangOrders > 0 ? gudangReturn / gudangOrders : 0;
  const shopeeHppEst = perOrderHpp * shopeeOrders;
  const shopeeReturnEst = perOrderReturn * shopeeOrders;
  const canShopeeProfit = Boolean(gudangRow) && gudangOrders > 0 && shopeeOrders > 0;
  const shopeeProfit = shopeeGmv - shopeeHppEst - shopeeAdSpend - shopeeReturnEst;
  const estTitle = 'Estimasi: biaya per-pesanan Gudang diskalakan ke jumlah pesanan Shopee';

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
              <td className="px-3 py-2.5 text-slate-600">HPP + biaya <span className="text-slate-400">(termasuk harga beli)</span></td>
              <td className="px-3 py-2.5 text-right text-slate-500" title={estTitle}>{loading ? '…' : canShopeeProfit ? `≈ − ${formatIDR(shopeeHppEst)}` : 'N/A'}</td>
              <td className="px-3 py-2.5 text-right text-slate-700">{loading ? '…' : gudangRow ? `− ${formatIDR(gudangHpp)}` : '—'}</td>
              <td className="px-3 py-2.5 text-right text-slate-400">—</td>
            </tr>
            <tr>
              <td className="px-3 py-2.5 text-slate-600">Biaya iklan</td>
              <td className="px-3 py-2.5 text-right text-slate-700">{loading ? '…' : shopeeAds ? `− ${formatIDR(shopeeAds.totalSpend)}` : '—'}</td>
              <td className="px-3 py-2.5 text-right text-slate-700">{loading ? '…' : gudangRow ? `− ${formatIDR(gudangAds)}` : '—'}</td>
              <td className="px-3 py-2.5 text-right">{!loading && gudangRow && shopeeAds && <DiffPill shopee={shopeeAds.totalSpend} gudang={gudangAds} money />}</td>
            </tr>
            <tr>
              <td className="px-3 py-2.5 text-slate-600">Retur</td>
              <td className="px-3 py-2.5 text-right text-slate-500" title={estTitle}>{loading ? '…' : canShopeeProfit ? `≈ − ${formatIDR(shopeeReturnEst)}` : 'N/A'}</td>
              <td className="px-3 py-2.5 text-right text-slate-700">{loading ? '…' : gudangRow ? `− ${formatIDR(gudangReturn)}` : '—'}</td>
              <td className="px-3 py-2.5 text-right text-slate-400">—</td>
            </tr>
            <tr className="border-t-2 border-slate-200">
              <td className="px-3 py-2.5 font-semibold text-slate-800">Laba / rugi</td>
              <td className={`px-3 py-2.5 text-right font-bold ${shopeeProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} title={`${estTitle}. HPP dipinjam dari Gudang; iklan = belanja iklan Shopee.`}>
                {loading ? '…' : canShopeeProfit ? `≈ ${formatIDR(shopeeProfit)}` : 'N/A'}
              </td>
              <td className={`px-3 py-2.5 text-right font-bold ${profitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{loading ? '…' : gudangRow ? formatIDR(profitLoss) : '—'}</td>
              <td className="px-3 py-2.5 text-right">{!loading && canShopeeProfit && <DiffPill shopee={shopeeProfit} gudang={profitLoss} money />}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!loading && !gudangRow && (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">
          Belum ada baris Gudang untuk marketplace ini pada rentang terpilih — coba perlebar rentang tanggal (mis. 30 hari).
        </p>
      )}

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Laba/rugi Gudang = <b>Omzet − (HPP termasuk harga beli) − Iklan − Retur</b> dari pencatatan Gudang.
        Kolom Shopee = <b>estimasi</b> (tanda ≈): Shopee tak menyimpan HPP/retur, jadi keduanya <b>dipinjam
        dari Gudang lalu diskalakan per-pesanan</b> ke jumlah pesanan Shopee; iklan memakai belanja iklan
        Shopee sebenarnya. Karena omzet Shopee (GMV dikonfirmasi) beda definisi dgn Gudang, angka Shopee bersifat perkiraan.
      </p>
    </section>
  );
}
