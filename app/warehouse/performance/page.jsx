'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Banknote,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  FileBox,
  LineChart,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Undo2,
  Wallet
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import MetricCard from '../../../components/MetricCard';
import StatusBadge from '../../../components/StatusBadge';
import { fetchMarketplacePerformance } from '../../../lib/api';
import { formatIDR, formatNumber } from '../../../lib/utils';
import { useStore } from '../../../context/StoreContext';
import { useDateRange } from '../../../context/DateRangeContext';

export default function MarketplacePerformancePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { selectedStoreId } = useStore();
  // Context mengekspos startDate/endDate sebagai string ISO 'YYYY-MM-DD' (bukan objek Date).
  const { startDate, endDate } = useDateRange();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMarketplacePerformance({ startDate, endDate });
      setData(res?.success ? res.rows || [] : []);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (!search) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((item) => 
      item.name.toLowerCase().includes(lowerSearch) || 
      item.owner.toLowerCase().includes(lowerSearch) ||
      item.type.toLowerCase().includes(lowerSearch)
    );
  }, [data, search]);

  const totals = useMemo(() => {
    return filteredItems.reduce((acc, row) => {
      acc.omset += row.orderAmount || 0;
      acc.pesanan += row.orderCount || 0;
      acc.profit += row.profitLoss || 0;
      acc.retur += row.returnAmount || 0;
      return acc;
    }, { omset: 0, pesanan: 0, profit: 0, retur: 0 });
  }, [filteredItems]);

  const getPlatformColor = (type) => {
    switch (type.toLowerCase()) {
      case 'tiktok': return 'bg-black text-white';
      case 'shopee': return 'bg-orange-500 text-white';
      case 'tokopedia': return 'bg-green-500 text-white';
      case 'lazada': return 'bg-blue-600 text-white';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <PageHeader 
        title="Performa Marketplace" 
        description="Analisis penjualan, profitabilitas, dan retur berdasarkan data gudang."
        icon={LineChart}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Omzet"
          value={formatIDR(totals.omset)}
          icon={Wallet}
          tone="emerald"
        />
        <MetricCard
          title="Laba Bersih"
          value={formatIDR(totals.profit)}
          icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
          tone={totals.profit >= 0 ? 'emerald' : 'rose'}
        />
        <MetricCard
          title="Total Pesanan"
          value={formatNumber(totals.pesanan)}
          icon={ShoppingCart}
          tone="blue"
        />
        <MetricCard
          title="Total Retur"
          value={formatIDR(totals.retur)}
          icon={Undo2}
          tone="rose"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">Detail Performa Toko</h2>
            <StatusBadge tone="blue">{filteredItems.length} Toko</StatusBadge>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari toko atau pemilik..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-64"
              />
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium rounded-tl-xl">Toko</th>
                <th className="px-6 py-4 font-medium text-right">Pesanan</th>
                <th className="px-6 py-4 font-medium text-right">Barang</th>
                <th className="px-6 py-4 font-medium text-right">Omzet</th>
                <th className="px-6 py-4 font-medium text-right">HPP</th>
                <th className="px-6 py-4 font-medium text-right">Pengeluaran</th>
                <th className="px-6 py-4 font-medium text-right">Laba Bersih</th>
                <th className="px-6 py-4 font-medium text-right">Retur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-slate-200 rounded"></div>
                      <div className="h-3 w-20 bg-slate-100 rounded mt-2"></div>
                    </td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-slate-100 rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-slate-100 rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-24 bg-slate-100 rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-24 bg-slate-100 rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-24 bg-slate-100 rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-24 bg-slate-100 rounded ml-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-100 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p>Tidak ada data performa marketplace untuk filter ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getPlatformColor(row.type)}`}>
                          {row.type}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3 h-3" /> {row.owner} ({row.ownerAlias})
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                      {formatNumber(row.orderCount)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                      {formatNumber(row.itemCount)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium text-slate-900">
                      {formatIDR(row.orderAmount)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-500">
                      {formatIDR(row.itemAmount)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-500">
                      {formatIDR(row.spentAmount)}
                      {row.adsTotal > 0 && (
                        <span className="block text-[10px] text-orange-500">
                          (Ads: {formatIDR(row.adsTotal)})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      <span className={`font-medium ${row.profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.profitLoss > 0 ? '+' : ''}{formatIDR(row.profitLoss)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-rose-500">
                      {row.returnAmount > 0 ? formatIDR(row.returnAmount) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
