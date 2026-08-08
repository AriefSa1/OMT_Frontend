'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tag, Ticket, Percent, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import DateRangePicker from '../../components/DateRangePicker';
import { fetchDiscountPerformance, fetchVoucherList } from '../../lib/api';
import { formatIDR, formatNumber } from '../../lib/utils';
import { useStore } from '../../context/StoreContext';
import { useDateRange } from '../../context/DateRangeContext';

function fmtDate(sec) {
  if (!sec) return '—';
  const d = new Date(Number(sec) * 1000);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Status dihitung dari periode (start/end vs sekarang) — akurat tanpa menebak kode enum.
function periodStatus(startSec, endSec) {
  const now = Date.now() / 1000;
  if (endSec && now > Number(endSec)) return { label: 'Selesai', cls: 'bg-slate-100 text-slate-600' };
  if (startSec && now < Number(startSec)) return { label: 'Terjadwal', cls: 'bg-amber-50 text-amber-700' };
  return { label: 'Berjalan', cls: 'bg-emerald-50 text-emerald-700' };
}
function StatusPill({ startSec, endSec }) {
  const s = periodStatus(startSec, endSec);
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>;
}

const VOUCHER_LIMIT = 10;

export default function PromotionsPage() {
  const [tab, setTab] = useState('discounts');
  const { selectedStoreId } = useStore();
  const { startDate, endDate } = useDateRange();

  // Diskon
  const [discounts, setDiscounts] = useState([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [discMsg, setDiscMsg] = useState('');

  // Voucher
  const [vouchers, setVouchers] = useState([]);
  const [voucherTotal, setVoucherTotal] = useState(0);
  const [voucherOffset, setVoucherOffset] = useState(0);
  const [vLoading, setVLoading] = useState(true);
  const [vMsg, setVMsg] = useState('');

  const loadDiscounts = useCallback(async () => {
    setDiscLoading(true);
    const res = await fetchDiscountPerformance({ storeId: selectedStoreId || null, startDate, endDate });
    setDiscounts(res?.promotions || []);
    setDiscMsg(res?.success ? '' : (res?.message || ''));
    setDiscLoading(false);
  }, [selectedStoreId, startDate, endDate]);

  const loadVouchers = useCallback(async () => {
    setVLoading(true);
    const res = await fetchVoucherList({ storeId: selectedStoreId || null, offset: voucherOffset, limit: VOUCHER_LIMIT });
    setVouchers(res?.vouchers || []);
    setVoucherTotal(res?.total || 0);
    setVMsg(res?.success ? '' : (res?.message || ''));
    setVLoading(false);
  }, [selectedStoreId, voucherOffset]);

  useEffect(() => { if (tab === 'discounts') loadDiscounts(); }, [tab, loadDiscounts]);
  useEffect(() => { if (tab === 'vouchers') loadVouchers(); }, [tab, loadVouchers]);

  const totalSales = discounts.reduce((s, d) => s + (d.sales || 0), 0);
  const totalOrders = discounts.reduce((s, d) => s + (d.orders || 0), 0);
  const voucherPage = Math.floor(voucherOffset / VOUCHER_LIMIT) + 1;
  const voucherPages = Math.max(1, Math.ceil(voucherTotal / VOUCHER_LIMIT));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Promosi"
        description="Performa promo diskon dan daftar voucher toko dari Shopee Seller Center."
        actions={tab === 'discounts' ? <DateRangePicker /> : null}
      />

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        <button
          type="button"
          onClick={() => setTab('discounts')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === 'discounts' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Tag className="h-3.5 w-3.5" /> Diskon
        </button>
        <button
          type="button"
          onClick={() => setTab('vouchers')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === 'vouchers' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Ticket className="h-3.5 w-3.5" /> Voucher
        </button>
      </div>

      {/* --- DISKON --- */}
      {tab === 'discounts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <section className="surface p-4"><p className="text-xs text-slate-500">Total penjualan dari promo</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatIDR(totalSales)}</p></section>
            <section className="surface p-4"><p className="text-xs text-slate-500">Total pesanan</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(totalOrders)}</p></section>
            <section className="surface p-4"><p className="text-xs text-slate-500">Jumlah promo aktif</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(discounts.length)}</p></section>
          </div>

          {discMsg && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{discMsg}</p>}

          <section className="surface overflow-hidden">
            <div className="table-scroll">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Promo</th>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Unit</th>
                    <th className="px-4 py-3 text-right font-medium">Pesanan</th>
                    <th className="px-4 py-3 text-right font-medium">Pembeli</th>
                    <th className="px-4 py-3 text-right font-medium">Penjualan</th>
                    <th className="px-5 py-3 text-right font-medium">Penjualan/Pembeli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discLoading ? (
                    <tr><td colSpan="8" className="px-5 py-8 text-center text-sm text-slate-500">Memuat…</td></tr>
                  ) : discounts.length ? discounts.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(d.startTime)} – {fmtDate(d.endTime)}</td>
                      <td className="px-4 py-3"><StatusPill startSec={d.startTime} endSec={d.endTime} /></td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(d.units)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(d.orders)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(d.buyers)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatIDR(d.sales)}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{formatIDR(d.salesPerBuyer)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" className="px-5 py-10 text-center"><EmptyState title="Belum ada data promo" message="Tidak ada promo diskon pada rentang ini." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* --- VOUCHER --- */}
      {tab === 'vouchers' && (
        <div className="space-y-4">
          {vMsg && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{vMsg}</p>}

          <section className="surface overflow-hidden">
            <div className="table-scroll">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Voucher</th>
                    <th className="px-4 py-3 font-medium">Nilai</th>
                    <th className="px-4 py-3 font-medium">Min. belanja</th>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Terpakai</th>
                    <th className="px-4 py-3 text-right font-medium">Diklaim</th>
                    <th className="px-5 py-3 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vLoading ? (
                    <tr><td colSpan="8" className="px-5 py-8 text-center text-sm text-slate-500">Memuat…</td></tr>
                  ) : vouchers.length ? vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className="block font-semibold text-slate-800">{v.name}</span>
                        <span className="block font-mono text-[11px] text-slate-500">{v.code}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {v.discountPercent > 0 ? (
                          <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3 text-amber-500" />{v.discountPercent}%</span>
                        ) : formatIDR(v.value)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{v.minSpend > 0 ? formatIDR(v.minSpend) : 'Tanpa minimum'}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(v.startTime)} – {fmtDate(v.endTime)}</td>
                      <td className="px-4 py-3"><StatusPill startSec={v.startTime} endSec={v.endTime} /></td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(v.used)}{v.usageLimit ? ` / ${formatNumber(v.usageLimit)}` : ''}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatNumber(v.distributed)}</td>
                      <td className="px-5 py-3 text-slate-600">{v.minBuyerOrders > 0 ? `Pembeli ≥ ${v.minBuyerOrders} order` : 'Semua pembeli'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" className="px-5 py-10 text-center"><EmptyState title="Belum ada voucher" message="Toko ini belum punya voucher aktif." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {voucherTotal > VOUCHER_LIMIT && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs">
                <span className="text-slate-500">Halaman {voucherPage} dari {voucherPages} · {formatNumber(voucherTotal)} voucher</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={voucherOffset === 0}
                    onClick={() => setVoucherOffset(Math.max(0, voucherOffset - VOUCHER_LIMIT))}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={voucherPage >= voucherPages}
                    onClick={() => setVoucherOffset(voucherOffset + VOUCHER_LIMIT)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Berikutnya <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
