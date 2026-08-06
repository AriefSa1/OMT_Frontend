'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, ListChecks } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import MetricCard from '../../../components/MetricCard';
import RecommendationList from '../../../components/RecommendationList';
import { DataSourceNote } from '../../../components/StatusBadge';
import { fetchProductOptimizations } from '../../../lib/api';
import { useSnapshotRefresh } from '../../../lib/hooks';
import { emptyListReason } from '../../../lib/utils';
import { useStore } from '../../../context/StoreContext';

export default function ProductOptimizationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedStoreId } = useStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    setData(await fetchProductOptimizations(selectedStoreId));
    setLoading(false);
  }, [selectedStoreId]);

  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const recommendations = data?.recommendations || [];
  const score = data?.overallProductHealthScore;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimasi produk"
        description="Rekomendasi listing dari snapshot katalog Shopee. Sistem tidak mengubah Seller Center; setiap rekomendasi ditindaklanjuti sebagai tugas."
        actions={<Link href="/actions" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Pusat Tindakan</Link>}
      >
        <DataSourceNote meta={data?.meta} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard
          title="Skor kesehatan katalog"
          value={score === null || score === undefined ? 'Belum tersedia' : `${score}/100`}
          icon={Gauge}
          tone="slate"
          subtitle={score === null || score === undefined
            ? 'Skor hanya dihitung bila ada rekomendasi katalog yang terukur.'
            : 'Dihitung dari jumlah dan prioritas rekomendasi katalog pada snapshot terakhir.'}
        />
        <MetricCard
          title="Rekomendasi aktif"
          value={loading ? '—' : String(recommendations.length)}
          icon={ListChecks}
          tone={recommendations.length ? 'amber' : 'slate'}
          subtitle="Berasal dari metrik produk yang tersimpan, bukan estimasi."
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Rekomendasi listing</h2>
          <p className="mt-1 text-xs text-slate-500">CTR rendah, hambatan checkout, dan risiko kehabisan stok pada snapshot katalog.</p>
        </div>
        <RecommendationList
          items={recommendations}
          loading={loading}
          emptyTitle="Belum ada rekomendasi katalog"
          emptyMessage={emptyListReason(
            data?.meta,
            'Tidak ada produk yang memenuhi kriteria pada snapshot terakhir: CTR di bawah 1% dengan minimal 100 impresi, keranjang tanpa pesanan terkonfirmasi, atau stok tersisa 3 unit ke bawah pada produk yang pernah terjual.',
          )}
        />
      </section>
    </div>
  );
}
