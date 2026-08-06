'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, Megaphone, Target } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import MetricCard from '../../../components/MetricCard';
import RecommendationList from '../../../components/RecommendationList';
import { DataSourceNote } from '../../../components/StatusBadge';
import { fetchAdsOptimizations } from '../../../lib/api';
import { useSnapshotRefresh } from '../../../lib/hooks';
import { emptyListReason } from '../../../lib/utils';
import { useStore } from '../../../context/StoreContext';

export default function AdsOptimizationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedStoreId } = useStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    setData(await fetchAdsOptimizations(selectedStoreId));
    setLoading(false);
  }, [selectedStoreId]);

  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const recommendations = data?.keywordBids || [];
  const score = data?.adsHealthScore;
  const roas = data?.currentROAS;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimasi iklan"
        description="Rekomendasi kampanye dari snapshot iklan Shopee. Perubahan bid dan anggaran tetap dilakukan manual di Seller Center."
        actions={<Link href="/ads" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Halaman iklan</Link>}
      >
        <DataSourceNote meta={data?.meta} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Skor kesehatan iklan"
          value={score === null || score === undefined ? 'Belum tersedia' : `${score}/100`}
          icon={Gauge}
          tone="slate"
          subtitle={score === null || score === undefined
            ? 'Skor hanya dihitung bila ada rekomendasi kampanye yang terukur.'
            : 'Dihitung dari jumlah dan prioritas rekomendasi kampanye.'}
        />
        <MetricCard
          title="ROAS snapshot terakhir"
          value={roas === null || roas === undefined ? 'Belum tersedia' : `${Number(roas).toFixed(2)}x`}
          icon={Megaphone}
          tone="rose"
          subtitle="Diambil dari snapshot iklan tersimpan, bukan perhitungan ulang."
        />
        {/* targetROAS has no source yet; it must read as unset, never as 0. */}
        <MetricCard
          title="Target ROAS"
          value={data?.targetROAS === null || data?.targetROAS === undefined ? 'Belum ditetapkan' : `${Number(data.targetROAS).toFixed(2)}x`}
          icon={Target}
          tone="slate"
          subtitle="Belum ada target yang dikonfigurasi pada sistem."
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Rekomendasi kampanye</h2>
          <p className="mt-1 text-xs text-slate-500">Kampanye dengan CTR rendah atau ROAS di bawah ambang pada snapshot iklan terakhir.</p>
        </div>
        <RecommendationList
          items={recommendations}
          loading={loading}
          emptyTitle="Belum ada rekomendasi kampanye"
          emptyMessage={emptyListReason(
            data?.meta,
            'Tidak ada kampanye berbiaya yang CTR-nya di bawah 1% atau ROAS-nya di bawah 2x pada snapshot terakhir.',
          )}
        />
      </section>
    </div>
  );
}
