'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Boxes, Package, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import StatusBadge, { DataSourceNote } from '../../components/StatusBadge';
import { fetchWarehouseInventory, triggerWarehouseSync } from '../../lib/api';
import { useDebouncedValue, useSnapshotRefresh } from '../../lib/hooks';
import { formatNumber } from '../../lib/utils';

export default function WarehousePage() {
  const [inventory, setInventory] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const deferredSearch = useDebouncedValue(search);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const response = await fetchWarehouseInventory({ page, limit: 20, search: deferredSearch });
    setInventory(response?.success ? response : null);
    setLoading(false);
  }, [page, deferredSearch]);
  useEffect(() => { loadInventory(); }, [loadInventory]);
  useEffect(() => { setPage(1); }, [deferredSearch]);
  useSnapshotRefresh(loadInventory);

  const sync = async () => {
    setSyncing(true);
    await triggerWarehouseSync();
    await loadInventory();
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Gudang" description="Stok fisik dan rekonsiliasi dengan katalog Shopee dari snapshot lokal. Foto produk menggunakan aset Warehouse saat tersedia." actions={<button type="button" onClick={sync} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Menyinkronkan' : 'Sync gudang'}</button>}>
        <DataSourceNote meta={inventory?.meta} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard title="SKU diaudit" value={formatNumber(inventory?.totalSkus)} icon={Boxes} tone="slate" subtitle="Total SKU pada snapshot gudang" />
        <MetricCard title="Stok fisik tersedia" value={formatNumber(inventory?.totalAvailableUnits)} icon={Package} tone="emerald" subtitle={`${formatNumber(inventory?.totalPhysicalUnits)} unit fisik tercatat`} />
        <MetricCard title="Selisih stok" value={formatNumber(inventory?.totals?.discrepanciesCount)} icon={ShieldAlert} tone={Number(inventory?.totals?.discrepanciesCount) ? 'amber' : 'emerald'} subtitle="Perlu tindak lanjut bila tidak nol" />
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Persediaan dan rekonsiliasi</h2><p className="mt-1 text-xs text-slate-500">Rekonsiliasi dibuat ketika proses Sync gudang dijalankan.</p></div><Link href="/actions" className="text-xs font-semibold text-rose-700 hover:text-rose-800">Tinjau tindakan</Link></div>
        <div className="border-b border-slate-200 p-4"><label className="relative block max-w-md"><span className="sr-only">Cari SKU atau produk gudang</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari SKU atau nama produk" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400" /></label></div>
        {!loading && !inventory?.items?.length ? <EmptyState title="Snapshot gudang belum tersedia" message={inventory?.meta?.message || 'Lengkapi koneksi gudang lalu jalankan Sync.'} /> : <div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Produk</th><th className="px-4 py-3 font-medium">Lokasi</th><th className="px-4 py-3 text-right font-medium">Total</th><th className="px-4 py-3 text-right font-medium">Tersedia</th><th className="px-4 py-3 text-right font-medium">Shopee</th><th className="px-4 py-3 text-right font-medium">Selisih</th><th className="px-5 py-3 text-right font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">
          {loading && Array.from({ length: 8 }).map((_, index) => <tr key={index}><td colSpan="7" className="px-5 py-3"><div className="skeleton h-8 rounded-md" /></td></tr>)}
          {inventory?.items?.map((item) => { const recon = item.reconciliation; return <tr key={item.sku} className="hover:bg-slate-50"><td className="px-5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="40px" className="object-cover" /> : <Package className="m-2.5 h-5 w-5 text-slate-400" />}</span><span className="min-w-0"><span className="block max-w-64 truncate font-semibold text-slate-800">{item.name}</span><span className="block text-[11px] text-slate-500">{item.sku}</span></span></div></td><td className="px-4 py-3 text-slate-600">{item.location || 'Belum ditetapkan'}</td><td className="px-4 py-3 text-right text-slate-700">{formatNumber(item.totalStock)}</td><td className="px-4 py-3 text-right font-medium text-slate-800">{formatNumber(item.availableStock)}</td><td className="px-4 py-3 text-right text-slate-700">{recon ? formatNumber(recon.shopeeStock) : 'Belum tersedia'}</td><td className="px-4 py-3 text-right text-slate-700">{recon ? formatNumber(recon.variance) : 'Belum tersedia'}</td><td className="px-5 py-3 text-right"><StatusBadge status={recon?.status === 'MATCHED' ? 'Segar' : recon?.status ? 'Tertunda' : 'Tidak Tersedia'} compact /></td></tr>; })}
        </tbody></table></div>}
        <Pagination pagination={inventory?.pagination} onChange={setPage} />
      </section>
    </div>
  );
}
