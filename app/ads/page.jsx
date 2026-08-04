'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CircleDollarSign, MousePointerClick, RefreshCw, Target } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import { fetchShopeeAds, triggerFullSync } from '../../lib/api';
import { useSnapshotRefresh } from '../../lib/hooks';
import { formatIDR, formatNumber, formatPercent } from '../../lib/utils';

export default function AdsPage() {
  const [ads, setAds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadAds = useCallback(async () => {
    setLoading(true);
    const response = await fetchShopeeAds();
    setAds(response?.success ? response : null);
    setLoading(false);
  }, []);
  useEffect(() => { loadAds(); }, [loadAds]);
  useSnapshotRefresh(loadAds);

  const sync = async () => {
    setSyncing(true);
    await triggerFullSync();
    await loadAds();
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Iklan" description="Kinerja kampanye Product Ads dari snapshot Seller Center. Semua nominal yang tampil sudah dinormalisasi dengan pembagi 100.000." actions={<button type="button" onClick={sync} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Menyinkronkan' : 'Sync iklan'}</button>}>
        <DataSourceNote meta={ads?.meta} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Biaya iklan" value={formatIDR(ads?.totalSpend)} icon={CircleDollarSign} tone="rose" subtitle="Nilai setelah normalisasi" />
        <MetricCard title="Penjualan dari iklan" value={formatIDR(ads?.totalSalesGenerated)} icon={BarChart3} tone="slate" subtitle="GMV yang dilaporkan kampanye" />
        <MetricCard title="ROAS" value={ads?.roas === null || ads?.roas === undefined ? 'Belum tersedia' : `${Number(ads.roas).toFixed(2)}x`} icon={Target} tone="emerald" subtitle="Penjualan dibagi biaya iklan" />
        <MetricCard title="CTR" value={formatPercent(ads?.ctr)} icon={MousePointerClick} tone="slate" subtitle={`${formatNumber(ads?.clicks)} klik dari ${formatNumber(ads?.impressions)} impresi`} />
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Kampanye aktif</h2><p className="mt-1 text-xs text-slate-500">Urut berdasarkan biaya pada snapshot terakhir.</p></div><Link href="/actions" className="text-xs font-semibold text-rose-700 hover:text-rose-800">Buka Pusat Tindakan</Link></div>
        {!loading && !ads?.topCampaigns?.length ? <EmptyState title="Data kampanye belum tersedia" message={ads?.meta?.message || 'Jalankan Sync iklan setelah sesi Shopee terhubung.'} /> : <div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Kampanye</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Anggaran/hari</th><th className="px-4 py-3 text-right font-medium">Biaya</th><th className="px-4 py-3 text-right font-medium">Penjualan</th><th className="px-4 py-3 text-right font-medium">CTR</th><th className="px-5 py-3 text-right font-medium">ROAS</th></tr></thead><tbody className="divide-y divide-slate-100">
          {loading && Array.from({ length: 7 }).map((_, index) => <tr key={index}><td colSpan="7" className="px-5 py-3"><div className="skeleton h-8 rounded-md" /></td></tr>)}
          {ads?.topCampaigns?.map((campaign) => <tr key={campaign.id || campaign.campaignId} className="hover:bg-slate-50"><td className="px-5 py-3"><p className="max-w-72 truncate font-semibold text-slate-800">{campaign.name}</p><p className="mt-1 text-[11px] text-slate-500">{campaign.type}</p></td><td className="px-4 py-3"><StatusBadge status={campaign.state === 'ongoing' ? 'Segar' : 'Tertunda'} compact /></td><td className="px-4 py-3 text-right text-slate-700">{formatIDR(campaign.dailyBudget)}</td><td className="px-4 py-3 text-right font-medium text-slate-700">{formatIDR(campaign.spend)}</td><td className="px-4 py-3 text-right text-slate-700">{formatIDR(campaign.sales)}</td><td className="px-4 py-3 text-right text-slate-700">{formatPercent(campaign.ctr)}</td><td className="px-5 py-3 text-right font-semibold text-slate-900">{Number(campaign.roas || 0).toFixed(2)}x</td></tr>)}
        </tbody></table></div>}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Histori snapshot</h2><p className="mt-1 text-xs text-slate-500">Satu ringkasan tersimpan setiap hari sinkronisasi.</p></div><div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Tanggal</th><th className="px-4 py-3 text-right font-medium">Biaya</th><th className="px-4 py-3 text-right font-medium">Penjualan</th><th className="px-5 py-3 text-right font-medium">ROAS</th></tr></thead><tbody className="divide-y divide-slate-100">{(ads?.history || []).map((row) => <tr key={row.date}><td className="px-5 py-3 text-slate-700">{row.date}</td><td className="px-4 py-3 text-right text-slate-700">{formatIDR(row.spend)}</td><td className="px-4 py-3 text-right text-slate-700">{formatIDR(row.sales)}</td><td className="px-5 py-3 text-right font-semibold text-slate-800">{Number(row.roas || 0).toFixed(2)}x</td></tr>)}{!ads?.history?.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">Belum ada histori iklan.</td></tr>}</tbody></table></div></section>
        <section className="surface p-5"><h2 className="text-sm font-semibold text-slate-900">Audit normalisasi nominal</h2><p className="mt-1 text-xs leading-5 text-slate-500">Nilai mentah disimpan untuk penelusuran. Nilai yang ditampilkan di halaman ini adalah nilai mentah dibagi pembagi transaksi Shopee.</p>{ads?.amountAudit ? <dl className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="surface-muted p-3"><dt className="text-slate-500">Pembagi</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(ads.amountAudit.divisor)}</dd></div><div className="surface-muted p-3"><dt className="text-slate-500">Biaya mentah</dt><dd className="mt-1 break-all font-semibold text-slate-900">{formatNumber(ads.amountAudit.rawSpend)}</dd></div><div className="surface-muted p-3"><dt className="text-slate-500">Penjualan mentah</dt><dd className="mt-1 break-all font-semibold text-slate-900">{formatNumber(ads.amountAudit.rawSales)}</dd></div><div className="surface-muted p-3"><dt className="text-slate-500">Voucher mentah</dt><dd className="mt-1 break-all font-semibold text-slate-900">{formatNumber(ads.amountAudit.rawVoucherSpend)}</dd></div></dl> : <p className="mt-5 text-sm text-slate-500">Belum ada nilai audit.</p>}</section>
      </div>
    </div>
  );
}
