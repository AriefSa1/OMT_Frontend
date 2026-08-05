'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import EmptyState from './EmptyState';
import { formatSource } from './StatusBadge';
import { createTask } from '../lib/api';

const PRIORITY_STYLES = {
  HIGH: 'text-rose-700 bg-rose-50 border-rose-200',
  MEDIUM: 'text-amber-800 bg-amber-50 border-amber-200',
  LOW: 'text-slate-700 bg-slate-50 border-slate-200',
};

const PRIORITY_LABELS = { HIGH: 'Tinggi', MEDIUM: 'Sedang', LOW: 'Rendah' };

/**
 * Renders verified recommendations and lets the user turn one into a task.
 * Nothing here invents a recommendation: an empty list is shown as an empty state
 * carrying the reason supplied by the backend snapshot.
 */
export default function RecommendationList({
  items = [],
  loading = false,
  emptyTitle = 'Belum ada rekomendasi',
  emptyMessage,
  allowTaskCreation = true,
}) {
  const [pendingId, setPendingId] = useState('');
  const [createdIds, setCreatedIds] = useState(() => new Set());
  const [message, setMessage] = useState('');

  const create = async (recommendation) => {
    setPendingId(recommendation.id);
    const response = await createTask(recommendation);
    setMessage(response.message || response.error || (response.success
      ? 'Tugas dibuat dari rekomendasi ini. Tidak ada perubahan otomatis ke Seller Center.'
      : 'Tugas tidak dapat dibuat.'));
    if (response.success) setCreatedIds((current) => new Set(current).add(recommendation.id));
    setPendingId('');
  };

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-20 rounded-md" />)}</div>;
  }

  if (!items.length) return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="space-y-3">
      {message && (
        <div className="surface-muted flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-700">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="font-semibold text-rose-700">Tutup</button>
        </div>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.MEDIUM}`}>
                  {PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.MEDIUM}
                </span>
                <span className="text-[11px] text-slate-500">{formatSource(item.source)}</span>
                {item.entityId && <span className="text-[11px] text-slate-500">{item.entityType}: {item.entityId}</span>}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{item.description}</p>
              {item.entityType === 'PRODUCT' && item.entityId && (
                <Link href={`/product/${item.entityId}`} className="mt-2 inline-flex text-xs font-semibold text-rose-700">Buka produk</Link>
              )}
            </div>
            {allowTaskCreation && (
              <button
                type="button"
                onClick={() => create(item)}
                disabled={pendingId === item.id || createdIds.has(item.id)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <Plus className="h-3.5 w-3.5" />
                {createdIds.has(item.id) ? 'Sudah dibuat' : pendingId === item.id ? 'Membuat' : 'Buat tugas'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
