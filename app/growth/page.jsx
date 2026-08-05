'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Boxes, CalendarRange, Gauge, ShoppingBag, Ticket } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import MetricCard from '../../components/MetricCard';
import EmptyState from '../../components/EmptyState';
import RecommendationList from '../../components/RecommendationList';
import StatusBadge, { DataSourceNote, formatDataTime, formatSource } from '../../components/StatusBadge';
import { fetchGrowthIntelligence } from '../../lib/api';
import { useSnapshotRefresh } from '../../lib/hooks';
import { emptyListReason, formatIDR, formatNumber } from '../../lib/utils';

function Section({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * A panel whose data source does not exist yet. It states the reason instead of
 * rendering an empty list that would read as "nothing to report".
 */
function UnavailablePanel({ title, block }) {
  return (
    <Section title={title}>
      <EmptyState title="Belum tersedia" message={block?.message} />
    </Section>
  );
}

export default function GrowthIntelligencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setData(await fetchGrowthIntelligence());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const weekly = data?.weeklyReport;
  const scorecardScore = data?.catalogScorecard?.score;
  const reconciliationUnreliable = Boolean(data?.reconciliationTrust && !data.reconciliationTrust.reliable);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pertumbuhan"
        description="Ringkasan peluang pertumbuhan dari snapshot lokal katalog, iklan, dan gudang. Panel tanpa sumber data menyatakan alasannya, bukan menampilkan angka perkiraan."
        actions={<Link href="/actions" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Pusat Tindakan</Link>}
      >
        <div className="flex flex-wrap gap-3">
          <DataSourceNote meta={data?.sources?.catalog} />
          <DataSourceNote meta={data?.sources?.ads} />
          <DataSourceNote meta={data?.sources?.warehouse} />
        </div>
        {data?.generatedAt && <p className="mt-2 text-xs text-slate-500">Dihitung: {formatDataTime(data.generatedAt)}</p>}
      </PageHeader>

      <Section
        title="Laporan mingguan"
        description={weekly?.daysWithData
          ? `Dihitung dari ${weekly.daysWithData} hari ringkasan pesanan yang tersimpan.`
          : 'Belum ada hari ringkasan pesanan yang tersimpan.'}
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-32 rounded-md" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="GMV" value={formatIDR(weekly?.gmv)} icon={BarChart3} tone="slate" subtitle={weekly?.message || 'Dari ringkasan pesanan tersimpan.'} />
            <MetricCard title="Pesanan" value={formatNumber(weekly?.orders)} icon={ShoppingBag} tone="slate" subtitle={weekly?.message ? 'Tidak dibuat estimasi.' : 'Dari ringkasan pesanan tersimpan.'} />
            <MetricCard title="Nilai pesanan rata-rata" value={formatIDR(weekly?.averageOrderValue)} icon={ShoppingBag} tone="slate" subtitle="Dihitung hanya bila GMV dan jumlah pesanan tersedia." />
            <MetricCard title="Hari dengan data" value={formatNumber(weekly?.daysWithData)} icon={CalendarRange} tone="slate" subtitle="Jumlah hari ringkasan pesanan pada snapshot." />
          </div>
        )}
      </Section>

      <Section
        title="Rapor katalog"
        description="Skor dihitung dari jumlah rekomendasi katalog yang terukur pada snapshot terakhir."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricCard
            title="Skor katalog"
            value={scorecardScore === null || scorecardScore === undefined ? 'Belum tersedia' : `${scorecardScore}/100`}
            icon={Gauge}
            tone="slate"
            subtitle={scorecardScore === null || scorecardScore === undefined
              ? 'Skor hanya dihitung bila ada rekomendasi katalog.'
              : `Berdasarkan ${data?.catalogScorecard?.products?.length || 0} temuan katalog.`}
          />
          {/* A count of 0 from an untrustworthy reconciliation is not "nothing to
              restock" — it is "not measurable", and must not render as a clean zero. */}
          <MetricCard
            title="Rencana restock"
            value={loading ? '—' : reconciliationUnreliable ? 'Belum tersedia' : formatNumber(data?.restockPlan?.length)}
            icon={Boxes}
            tone={!loading && !reconciliationUnreliable && data?.restockPlan?.length ? 'amber' : 'slate'}
            subtitle={reconciliationUnreliable
              ? data.reconciliationTrust.message
              : 'Selisih stok gudang yang perlu ditindaklanjuti.'}
          />
        </div>
        <RecommendationList
          items={data?.catalogScorecard?.products || []}
          loading={loading}
          emptyTitle="Belum ada temuan katalog"
          emptyMessage={emptyListReason(
            data?.sources?.catalog,
            'Tidak ada produk yang memenuhi kriteria CTR rendah, keranjang tanpa pesanan, atau risiko stok pada snapshot terakhir.',
          )}
        />
      </Section>

      <Section title="Rencana restock" description="Berasal dari rekonsiliasi stok Shopee dan gudang.">
        <RecommendationList
          items={data?.restockPlan || []}
          loading={loading}
          emptyTitle="Belum ada rencana restock"
          emptyMessage={data?.reconciliationTrust && !data.reconciliationTrust.reliable
            ? data.reconciliationTrust.message
            : emptyListReason(data?.sources?.warehouse, 'Tidak ada SKU dengan status selisih pada rekonsiliasi terakhir.')}
        />
      </Section>

      <Section title="Strategi harga" description="Produk dengan hambatan konversi pada snapshot katalog.">
        <RecommendationList
          items={data?.priceStrategies || []}
          loading={loading}
          emptyTitle="Belum ada usulan strategi harga"
          emptyMessage={emptyListReason(
            data?.sources?.catalog,
            'Tidak ada produk dengan pembeli yang menambahkan ke keranjang tanpa pesanan terkonfirmasi pada snapshot terakhir.',
          )}
        />
      </Section>

      <Section title="Peluang iklan" description="Kampanye dengan CTR rendah atau ROAS di bawah ambang.">
        <RecommendationList
          items={data?.adOpportunities || []}
          loading={loading}
          emptyTitle="Belum ada peluang iklan"
          emptyMessage={emptyListReason(
            data?.sources?.ads,
            'Tidak ada kampanye berbiaya yang CTR-nya di bawah 1% atau ROAS-nya di bawah 2x pada snapshot terakhir.',
          )}
        />
      </Section>

      <Section title="Eksperimen listing" description="Listing dengan CTR rendah yang layak diuji ulang.">
        <RecommendationList
          items={data?.listingExperiments || []}
          loading={loading}
          emptyTitle="Belum ada eksperimen listing"
          emptyMessage={emptyListReason(
            data?.sources?.catalog,
            'Tidak ada listing dengan CTR di bawah 1% pada minimal 100 impresi di snapshot terakhir.',
          )}
        />
      </Section>

      <Section title="Analisis voucher" description="Nilai voucher pada snapshot iklan terakhir.">
        <div className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-slate-500"><Ticket className="h-4 w-4" aria-hidden="true" />Sumber: {formatSource(data?.voucherAnalysis?.source)}</span>
            {data?.sources?.ads?.status && <StatusBadge status={data.sources.ads.status} compact />}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-slate-600">Biaya voucher</dt>
              <dd className="font-semibold text-slate-900">{formatIDR(data?.voucherAnalysis?.voucherSpend)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-slate-600">Penjualan dari voucher</dt>
              <dd className="font-semibold text-slate-900">{formatIDR(data?.voucherAnalysis?.voucherSales)}</dd>
            </div>
          </dl>
          {data?.voucherAnalysis?.message && <p className="mt-4 text-xs leading-5 text-slate-500">{data.voucherAnalysis.message}</p>}
        </div>
      </Section>

      <UnavailablePanel title="Prakiraan permintaan" block={data?.demandForecast} />
      <UnavailablePanel title="Usulan bundling" block={data?.bundleSuggestions} />

      <Section title="Pemantauan kompetitor" description="Perbandingan kompetitor dijalankan per produk secara eksplisit.">
        <EmptyState
          title={data?.competitorMonitor?.status === 'PILIH_PRODUK' ? 'Pilih produk terlebih dahulu' : 'Belum tersedia'}
          message={data?.competitorMonitor?.message}
          action={<Link href="/shopee" className="text-xs font-semibold text-rose-700 hover:text-rose-800">Buka katalog</Link>}
        />
      </Section>
    </div>
  );
}
