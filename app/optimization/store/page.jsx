'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, Info, ListChecks } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import MetricCard from '../../../components/MetricCard';
import RecommendationList from '../../../components/RecommendationList';
import { DataSourceNote } from '../../../components/StatusBadge';
import { fetchStoreOptimizations } from '../../../lib/api';
import { useSnapshotRefresh } from '../../../lib/hooks';
import { emptyListReason } from '../../../lib/utils';

export default function StoreOptimizationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setData(await fetchStoreOptimizations());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const recommendations = data?.decorationsAndPromos || [];
  const score = data?.storeHealthScore;
  const reconciliationUnreliable = Boolean(data?.reconciliationTrust && !data.reconciliationTrust.reliable);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimasi toko"
        description="Rekomendasi operasional toko dari snapshot gudang dan rekonsiliasi stok."
        actions={<Link href="/warehouse" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Halaman gudang</Link>}
      >
        <DataSourceNote meta={data?.meta} />
      </PageHeader>

      {/* Store-health metrics (chat response rate, fulfilment speed, rating, cancellation)
          were removed rather than filled with constants — say so instead of leaving a gap. */}
      <div className="surface-muted flex items-start gap-3 px-4 py-3 text-xs leading-5 text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <p>{data?.message || 'Metrik kesehatan toko belum tersedia karena endpoint sumber belum terhubung. Tidak ada angka pengganti yang ditampilkan.'}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard
          title="Skor kesehatan toko"
          value={score === null || score === undefined ? 'Belum tersedia' : `${score}/100`}
          icon={Gauge}
          tone="slate"
          subtitle={score === null || score === undefined
            ? 'Skor hanya dihitung bila ada rekomendasi gudang yang terukur.'
            : 'Dihitung dari jumlah dan prioritas rekomendasi gudang.'}
        />
        {/* Zero recommendations from an untrustworthy reconciliation is not an all-clear. */}
        <MetricCard
          title="Rekomendasi aktif"
          value={loading ? '—' : reconciliationUnreliable ? 'Belum tersedia' : String(recommendations.length)}
          icon={ListChecks}
          tone={!loading && !reconciliationUnreliable && recommendations.length ? 'amber' : 'slate'}
          subtitle={reconciliationUnreliable
            ? data.reconciliationTrust.message
            : 'Berasal dari selisih stok yang tercatat pada rekonsiliasi.'}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Rekomendasi operasional</h2>
          <p className="mt-1 text-xs text-slate-500">Selisih stok Shopee dan gudang yang perlu ditinjau.</p>
        </div>
        <RecommendationList
          items={recommendations}
          loading={loading}
          emptyTitle="Belum ada rekomendasi gudang"
          // An unreliable reconciliation cannot say "no discrepancy" — it says nothing.
          emptyMessage={data?.reconciliationTrust && !data.reconciliationTrust.reliable
            ? data.reconciliationTrust.message
            : emptyListReason(data?.meta, 'Tidak ada SKU dengan status selisih pada rekonsiliasi terakhir.')}
        />
      </section>
    </div>
  );
}
