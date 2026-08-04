'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ClipboardList, Plus, RefreshCw, UserRound } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import StatusBadge, { DataSourceNote, formatDataTime, formatSource } from '../../components/StatusBadge';
import { createTask, fetchTasks, updateTaskStatus } from '../../lib/api';
import { useSnapshotRefresh } from '../../lib/hooks';

const STATUS_LABELS = {
  PROPOSED: 'Usulan',
  APPROVED: 'Disetujui',
  IN_PROGRESS: 'Dikerjakan',
  COMPLETED: 'Selesai',
  SKIPPED: 'Dilewati',
};

const PRIORITY_STYLES = { HIGH: 'text-rose-700 bg-rose-50 border-rose-200', MEDIUM: 'text-amber-800 bg-amber-50 border-amber-200', LOW: 'text-slate-700 bg-slate-50 border-slate-200' };

function TaskStatusSelect({ task, onChange, pending }) {
  return <select aria-label={`Status ${task.title}`} value={task.status} disabled={pending} onChange={(event) => onChange(task.id, event.target.value)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 disabled:opacity-50">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>;
}

export default function ActionCenterPage() {
  const searchParams = useSearchParams();
  const sourceFilter = searchParams.get('source') || '';
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState('');
  const [updating, setUpdating] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await fetchTasks(filter ? { status: filter } : {});
    setData(response?.success ? response : null);
    setLoading(false);
  }, [filter]);
  useEffect(() => { loadData(); }, [loadData]);
  useSnapshotRefresh(loadData);

  const create = async (recommendation) => {
    setCreating(recommendation.id);
    const response = await createTask(recommendation);
    setMessage(response.message || response.error || 'Tugas diperbarui.');
    await loadData();
    setCreating('');
  };

  const update = async (id, status) => {
    setUpdating(id);
    const response = await updateTaskStatus(id, status);
    setMessage(response.success ? 'Status tugas diperbarui.' : response.error || 'Status tugas tidak dapat diperbarui.');
    await loadData();
    setUpdating('');
  };

  const activeRecommendationIds = useMemo(() => new Set((data?.tasks || []).filter((task) => !['COMPLETED', 'SKIPPED'].includes(task.status)).map((task) => task.recommendationId)), [data]);
  const recommendations = useMemo(() => (data?.recommendations || []).filter((item) => !sourceFilter || item.source === sourceFilter), [data, sourceFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pusat Tindakan" description="Ubah rekomendasi terverifikasi menjadi tugas. Sistem tidak membuat perubahan otomatis ke Seller Center; keputusan dan progres dicatat di sini.">
        <div className="flex flex-wrap gap-3"><DataSourceNote meta={data?.sources?.catalog} /><DataSourceNote meta={data?.sources?.ads} /><DataSourceNote meta={data?.sources?.warehouse} /></div>
      </PageHeader>

      {message && <div className="surface-muted flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-700"><span>{message}</span><button type="button" onClick={() => setMessage('')} className="font-semibold text-rose-700">Tutup</button></div>}

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Rekomendasi siap ditinjau</h2><p className="mt-1 text-xs text-slate-500">Berbasis snapshot katalog Shopee, iklan, dan gudang.</p></div><span className="text-xs text-slate-500">{recommendations.length} rekomendasi</span></div>
        {!loading && !recommendations.length ? <EmptyState title="Belum ada rekomendasi" message="Jalankan Sync agar sistem dapat mengevaluasi snapshot terbaru." /> : <div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Prioritas</th><th className="px-4 py-3 font-medium">Rekomendasi</th><th className="px-4 py-3 font-medium">Sumber</th><th className="px-4 py-3 font-medium">Konteks</th><th className="px-5 py-3 text-right font-medium">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">
          {loading && Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan="5" className="px-5 py-3"><div className="skeleton h-8 rounded-md" /></td></tr>)}
          {recommendations.map((item) => <tr key={item.id} className="align-top hover:bg-slate-50"><td className="px-5 py-3"><span className={`inline-flex rounded-md border px-2 py-1 font-semibold ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.MEDIUM}`}>{item.priority === 'HIGH' ? 'Tinggi' : item.priority === 'LOW' ? 'Rendah' : 'Sedang'}</span></td><td className="px-4 py-3"><p className="max-w-xl font-semibold text-slate-800">{item.title}</p><p className="mt-1 max-w-xl leading-5 text-slate-500">{item.description}</p></td><td className="px-4 py-3 text-slate-600">{formatSource(item.source)}</td><td className="px-4 py-3 text-slate-600">{item.entityType}{item.entityId ? `: ${item.entityId}` : ''}</td><td className="px-5 py-3 text-right">{item.entityType === 'PRODUCT' && item.entityId && <Link href={`/product/${item.entityId}`} className="mb-2 inline-flex text-xs font-semibold text-rose-700">Produk</Link>}<button type="button" onClick={() => create(item)} disabled={creating === item.id || activeRecommendationIds.has(item.id)} className="ml-auto flex h-8 items-center gap-1 rounded-md border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"><Plus className="h-3.5 w-3.5" />{activeRecommendationIds.has(item.id) ? 'Sudah aktif' : creating === item.id ? 'Membuat' : 'Buat tugas'}</button></td></tr>)}
        </tbody></table></div>}
      </section>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Tugas operasional</h2><p className="mt-1 text-xs text-slate-500">Status dapat diperbarui oleh seluruh pengguna terautentikasi.</p></div><label className="flex items-center gap-2 text-xs text-slate-600"><span>Status</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"><option value="">Semua</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        {!loading && !data?.tasks?.length ? <EmptyState title="Belum ada tugas" message="Buat tugas dari rekomendasi di atas untuk memulai tindak lanjut." /> : <div className="table-scroll"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Tugas</th><th className="px-4 py-3 font-medium">Prioritas</th><th className="px-4 py-3 font-medium">Sumber</th><th className="px-4 py-3 font-medium">Pemilik / waktu</th><th className="px-5 py-3 text-right font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">
          {data?.tasks?.map((task) => <tr key={task.id} className="align-top hover:bg-slate-50"><td className="px-5 py-3"><p className="max-w-lg font-semibold text-slate-800">{task.title}</p><p className="mt-1 max-w-lg leading-5 text-slate-500">{task.description}</p>{task.entityType === 'PRODUCT' && task.entityId && <Link href={`/product/${task.entityId}`} className="mt-2 inline-flex text-xs font-semibold text-rose-700">Buka produk</Link>}<details className="mt-2 max-w-lg text-[11px] text-slate-500"><summary className="cursor-pointer font-medium text-slate-600">Riwayat ({task.events?.length || 0})</summary><div className="mt-2 space-y-1">{task.events?.map((event) => <p key={event.id}>{STATUS_LABELS[event.status] || event.status} | {event.actorName || 'Sistem'} | {formatDataTime(event.createdAt)}{event.note ? ` | ${event.note}` : ''}</p>)}</div></details></td><td className="px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-1 font-semibold ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM}`}>{task.priority === 'HIGH' ? 'Tinggi' : task.priority === 'LOW' ? 'Rendah' : 'Sedang'}</span></td><td className="px-4 py-3 text-slate-600">{formatSource(task.source)}</td><td className="px-4 py-3 text-slate-600"><span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{task.updatedByName || task.createdByName || 'Belum ditetapkan'}</span><p className="mt-1 text-[11px] text-slate-500">{formatDataTime(task.updatedAt)}</p></td><td className="px-5 py-3 text-right"><TaskStatusSelect task={task} onChange={update} pending={updating === task.id} /></td></tr>)}
        </tbody></table></div>}
      </section>
    </div>
  );
}
