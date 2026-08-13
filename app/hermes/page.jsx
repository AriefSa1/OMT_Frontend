'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, CalendarDays, CircleAlert, CircleCheck, Info, LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import ChatInput from '../../components/ui/ChatInput';
import { analyzeHermes, deleteHermesAction, evaluateHermesAction, fetchHermesMemories, fetchHermesModels, fetchHermesStatus, sendHermesChat, submitHermesFeedback, trackHermesAction, updateHermesAction, validateHermesAnalysis } from '../../lib/api';

const INTENT_OPTIONS = [
  { value: 'IKLAN', label: 'Iklan', description: 'Spend, sales, ROAS, CTR, dan kampanye' },
  { value: 'PERFORMA_TOKO', label: 'Performa Toko', description: 'GMV, order, AOV, pembatalan, dan retur' },
  { value: 'PERFORMA_PRODUK', label: 'Performa Produk', description: 'Produk terukur, penjualan, order, dan funnel' },
];

const CHAT_MODE_OPTIONS = [
  {
    value: 'EXPLORATORY',
    label: 'Chat eksploratif',
    description: 'Untuk bertanya, brainstorming, dan riset umum. Tidak membawa data dashboard.',
  },
  {
    value: 'GROUNDED_ANALYSIS',
    label: 'Chat terarah',
    description: 'Untuk pertanyaan yang harus merujuk konteks terukur. Analisa bisnis tetap gunakan kartu intent.',
  },
];

const FEEDBACK_REASON_OPTIONS = [
  { value: 'DATA_MISMATCH', label: 'Data tidak sesuai dashboard' },
  { value: 'ANALYSIS_TOO_GENERAL', label: 'Analisa terlalu umum' },
  { value: 'RECOMMENDATION_NOT_EXECUTABLE', label: 'Rekomendasi sulit dijalankan' },
  { value: 'NUMBERS_CORRECT_INTERPRETATION_WRONG', label: 'Angka benar, interpretasi keliru' },
  { value: 'INSUFFICIENT_DATA', label: 'Data belum cukup' },
  { value: 'ACTION_WORKED', label: 'Tindakan memberikan hasil' },
  { value: 'OUTCOME_NOT_IMPROVED', label: 'Outcome belum membaik' },
];

function displayValue(value, unit = '') {
  if (value === null || value === undefined || value === '') return 'Belum tersedia';
  if (typeof value === 'number') return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}${unit ? ` ${unit}` : ''}`;
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function qualityTone(status) {
  if (status === 'SAFE') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'LIMITED') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}

const STATUS_LABELS = {
  PLANNED: 'Belum dimulai',
  IN_PROGRESS: 'Sedang dikerjakan',
  COMPLETED: 'Selesai',
  SKIPPED: 'Dilewati',
  CANCELLED: 'Dibatalkan',
};

const SEVERITY_LABELS = {
  HIGH: 'Penting',
  MEDIUM: 'Perlu diperhatikan',
  LOW: 'Catatan',
};

const METRIC_LABELS = {
  confirmedSales: 'Penjualan terkonfirmasi',
  confirmedGmv: 'GMV terkonfirmasi',
  confirmedOrders: 'Pesanan terkonfirmasi',
  confirmedUnits: 'Unit terjual',
  confirmedBuyers: 'Pembeli',
  totalSpend: 'Biaya iklan',
  totalSales: 'Penjualan dari iklan',
  roas: 'ROAS',
  ctr: 'CTR',
  averageConversionRate: 'Rata-rata konversi',
  conversionRate: 'Konversi',
  views: 'Dilihat',
  visitors: 'Pengunjung',
  addToCartRate: 'Tambah ke keranjang',
  bounceRate: 'Bounce rate',
};

function humanize(value, fallback = 'Belum tersedia') {
  if (!value) return fallback;
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function metricLabel(value) {
  return METRIC_LABELS[value] || humanize(value);
}

function statusLabel(value) {
  return STATUS_LABELS[value] || humanize(value);
}

function modelDisplayName(modelId) {
  const [provider, ...rest] = String(modelId || '').split('/');
  const modelName = rest.join('/') || provider;
  return `${provider} · ${modelName}`;
}

function modelProvider(modelId) {
  return String(modelId || '').split('/')[0] || 'other';
}

function QualityPanel({ validation, loading, analysisLoading, onAnalyze, modelReady }) {
  if (!validation) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-xs leading-5 text-slate-500">
        Pilih salah satu fokus di atas. Backend akan memeriksa rentang data, coverage, freshness, dan field wajib sebelum ada konteks yang dikirim ke Hermes.
      </div>
    );
  }

  if (!validation.success) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{validation.message || validation.error || 'Validasi data gagal.'}</div>;
  }

  const quality = validation.quality || {};
  const sources = quality.sources || [];
  const gaps = validation.dataGaps || quality.dataGaps || [];
  const evidence = validation.trustedContextPreview?.evidence || [];
  const effectivePeriod = validation.trustedContextPreview?.effectivePeriod;
  return (
    <div className="space-y-4">
      <div className={`flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${qualityTone(quality.status)}`}>
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Kualitas data: {humanize(quality.status, 'Belum diketahui')}</div>
            <p className="mt-1 text-xs leading-5">{quality.reason || 'Status kualitas data belum tersedia.'}</p>
          </div>
        </div>
        {validation.canCallHermes && modelReady ? (
          <button type="button" onClick={onAnalyze} disabled={analysisLoading} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-400">
            {analysisLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
            {analysisLoading ? 'Sedang menganalisa...' : 'Mulai analisa'}
          </button>
        ) : (
          <span className="text-[11px] font-semibold">{validation.canCallHermes && !modelReady ? 'Pilih model yang terdeteksi' : 'Pengiriman dihentikan'}</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Periode yang dipakai</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{validation.period?.startDate || 'Belum tersedia'} — {validation.period?.endDate || 'Belum tersedia'}</div>
          <p className="mt-1 text-[11px] text-slate-500">{validation.period?.days || 'Belum tersedia'} hari kalender{validation.period?.defaultRange ? ' · default 30 hari terakhir' : validation.period?.defaulted ? ' · tanggal otomatis' : ''}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 sm:min-w-44">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batas analisa</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{humanize(quality.analysisMode)}</div>
          <p className="mt-1 text-[11px] text-slate-500">Hermes hanya boleh memakai angka yang terukur</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sumber data</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{quality.sourceMode || 'SNAPSHOT'}</div>
          <p className="mt-1 text-[11px] text-slate-500">Data yang dipakai untuk kesimpulan</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evidence ledger</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{evidence.length} bukti</div>
          <p className="mt-1 text-[11px] text-slate-500">Setiap angka harus bisa dilacak</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal data aktual</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{effectivePeriod?.native || 'Sesuai permintaan'}</div>
          <p className="mt-1 text-[11px] text-slate-500">{effectivePeriod?.measured?.startDate && effectivePeriod?.measured?.endDate ? `${effectivePeriod.measured.startDate} — ${effectivePeriod.measured.endDate}` : 'Belum tersedia'}</p>
        </div>
      </div>

      {quality.reconciliation?.status && quality.reconciliation.status !== 'NOT_REQUIRED' && (
        <div className={`rounded-lg border px-4 py-3 text-xs ${quality.reconciliation.status === 'MATCH' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          <span className="font-bold">Rekonsiliasi core: {quality.reconciliation.status}</span>
          {quality.reconciliation.against && <span> · terhadap {quality.reconciliation.against}</span>}
        </div>
      )}

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Data yang diperiksa</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((source) => (
            <div key={source.name} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
              <div className="font-semibold text-slate-700">{source.name}</div>
              <div className="mt-1 text-slate-500">{source.rows ? `${source.rows} baris terukur` : 'Tidak ada baris terukur'} · coverage {source.coverage ? `${(source.coverage.coverageRatio * 100).toFixed(0)}%` : 'tidak tersedia'}</div>
            </div>
          ))}
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hal yang perlu diingat saat membaca hasil</div>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
            {gaps.map((gap, index) => <li key={`${gap}-${index}`} className="flex gap-2"><span className="text-amber-500">•</span><span>{gap}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ModelSelectionPanel({ status, models, selectedModel, modelLoading, modelError, onSelect, onRefresh }) {
  const groupedModels = models.reduce((groups, model) => {
    const provider = modelProvider(model.id);
    if (!groups[provider]) groups[provider] = [];
    groups[provider].push(model);
    return groups;
  }, {});
  const configuredModelAvailable = status?.model && models.some((model) => model.id === status.model);

  return (
    <section className="surface p-5" aria-labelledby="hermes-model-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="hermes-model-title" className="text-sm font-semibold text-slate-900">Model dan mode kerja</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Daftar model dibaca langsung dari endpoint Hermes `/v1/models`. Pilihan ini dikirim per request dan tidak mengubah konfigurasi provider di PC.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={modelLoading} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${modelLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Muat model
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <label htmlFor="hermes-model-select" className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Model yang dipakai</label>
          <select id="hermes-model-select" value={selectedModel} onChange={(event) => onSelect(event.target.value)} disabled={modelLoading || !models.length} className="ui-input mt-1 h-10 w-full rounded-lg px-3 text-xs">
            {!models.length && <option value="">{modelLoading ? 'Membaca daftar model...' : 'Model belum tersedia'}</option>}
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <optgroup key={provider} label={provider}>
                {providerModels.map((model) => <option key={model.id} value={model.id}>{modelDisplayName(model.id)}</option>)}
              </optgroup>
            ))}
          </select>
          {configuredModelAvailable === false && status?.model && (
            <p className="mt-1 text-[11px] leading-5 text-amber-700">Model default backend `{status.model}` tidak muncul dari Hermes. Pilih model yang terdeteksi di daftar.</p>
          )}
          {modelError && <p className="mt-1 text-[11px] leading-5 text-rose-700">{modelError}</p>}
          {models.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{models.length} model terdeteksi dari Hermes.</p>}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mode penggunaan</div>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {CHAT_MODE_OPTIONS.map((option) => (
              <div key={option.value} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-600">
                <div className="font-semibold text-slate-800">{option.label}</div>
                <div className="mt-0.5">{option.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalysisResult({ result, onFeedback, onTrackAction, trackedActions = {}, feedbackBusy, memoryUnavailableReason }) {
  const [feedbackReasons, setFeedbackReasons] = useState([]);
  if (!result) return null;
  const analysis = result.analysis || {};
  const findings = Array.isArray(analysis.criticalFindings) ? analysis.criticalFindings : [];
  const rootCauses = Array.isArray(analysis.rootCauseAnalysis) ? analysis.rootCauseAnalysis : [];
  const actions = Array.isArray(analysis.prioritizedActions) ? analysis.prioritizedActions : [];
  const evidenceById = new Map((result.evidence || []).map((item) => [item.id, item]));
  const evidenceFor = (ids) => (Array.isArray(ids) ? ids : []).map((id) => evidenceById.get(id)).filter(Boolean);
  const toggleFeedbackReason = (value) => setFeedbackReasons((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  return (
    <section className="surface overflow-hidden" aria-labelledby="hermes-analysis-result-title">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="hermes-analysis-result-title" className="text-sm font-semibold text-slate-900">Hasil analisa Hermes</h2>
            <p className="mt-1 text-xs text-slate-500">Berbasis {result.period?.startDate} — {result.period?.endDate} · status data {result.quality?.status}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${qualityTone(result.quality?.status)}`}>{result.quality?.analysisMode || 'LIMITED'}</span>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Kesimpulan singkat</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.executiveVerdict || 'Hermes tidak memberikan kesimpulan.'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          <div className="font-semibold text-slate-800">Cara membaca hasil ini</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3"><div><span className="font-semibold text-violet-700">1. Temuan:</span> apa yang terjadi menurut data.</div><div><span className="font-semibold text-violet-700">2. Penyebab:</span> dugaan yang masih perlu dicek.</div><div><span className="font-semibold text-violet-700">3. Tindakan:</span> langkah kerja yang bisa dicatat.</div></div>
        </div>
        {result.memoryId ? (
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span>Apakah analisa ini membantu dan cukup dapat dipercaya untuk ditindaklanjuti?</span>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                {FEEDBACK_REASON_OPTIONS.map((reason) => <label key={reason.value} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><input type="checkbox" checked={feedbackReasons.includes(reason.value)} onChange={() => toggleFeedbackReason(reason.value)} className="rounded border-slate-300 text-violet-600" />{reason.label}</label>)}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={feedbackBusy} onClick={() => onFeedback('HELPFUL', feedbackReasons)} className="rounded-md border border-emerald-200 px-2.5 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">{feedbackBusy ? 'Mengirim...' : 'Membantu'}</button>
              <button type="button" disabled={feedbackBusy} onClick={() => onFeedback('PARTIALLY_HELPFUL', feedbackReasons)} className="rounded-md border border-amber-200 px-2.5 py-1.5 font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">Sebagian</button>
              <button type="button" disabled={feedbackBusy} onClick={() => onFeedback('NOT_HELPFUL', feedbackReasons)} className="rounded-md border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Tidak membantu</button>
              <button type="button" disabled={feedbackBusy} onClick={() => onFeedback('INACCURATE', feedbackReasons)} className="rounded-md border border-rose-200 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Tidak akurat</button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"><span className="font-semibold">Feedback sementara belum aktif.</span> Hasil analisa belum tersimpan ke memori. {memoryUnavailableReason || 'Pastikan database backend aktif, lalu jalankan analisa ulang.'}</div>
        )}

        <div>
          <div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">1. Apa yang terjadi?</h3><p className="mt-1 text-xs text-slate-500">Fakta utama dari data yang sudah diperiksa.</p></div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temuan</span></div>
          {findings.length ? (
            <div className="mt-2 space-y-2">
              {findings.map((finding, index) => (
                <div key={`${finding.title || 'finding'}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-800">{finding.title || 'Temuan tanpa judul'}</span>{finding.severity && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{SEVERITY_LABELS[finding.severity] || humanize(finding.severity)}</span>}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{finding.description || 'Deskripsi belum tersedia.'}</p>
                  {evidenceFor(finding.evidenceIds).length > 0 && <div className="mt-2 space-y-1 text-[11px] text-slate-500">{evidenceFor(finding.evidenceIds).map((item) => <div key={item.id}><span className="font-medium">{item.metric || 'Metrik'}</span>: <span className="font-semibold text-slate-700">{displayValue(item.value, item.unit)}</span>{item.source ? ` · ${item.source}` : ''}</div>)}</div>}
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">Tidak ada temuan terstruktur yang dikembalikan.</p>}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">2. Mengapa ini bisa terjadi?</h3><p className="mt-1 text-xs text-slate-500">Dugaan penyebab yang masih perlu dicek, bukan fakta final.</p>
            {rootCauses.length ? <div className="mt-2 space-y-2">{rootCauses.map((cause, index) => <div key={`${cause.hypothesis || 'cause'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">{cause.hypothesis || 'Hipotesis belum tersedia.'}</span>{evidenceFor(cause.supportingEvidenceIds).length > 0 && <div className="mt-1 text-[11px] text-slate-500">Bukti: {evidenceFor(cause.supportingEvidenceIds).map((item) => `${item.metric}=${displayValue(item.value, item.unit)}`).join(' · ')}</div>}{cause.howToTest && <div className="mt-1 text-[11px] text-slate-500">Uji: {cause.howToTest}</div>}</div>)}</div> : <p className="mt-2 text-xs text-slate-500">Tidak ada hipotesis terstruktur yang dikembalikan.</p>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">3. Apa yang harus dilakukan?</h3><p className="mt-1 text-xs text-slate-500">Langkah kerja yang bisa diikuti dan diukur.</p>
            {actions.length ? <ol className="mt-2 space-y-2">{actions.map((action, index) => <li key={`${action.action || 'action'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs leading-5 text-slate-600"><span className="font-bold text-violet-700">#{action.priority || index + 1}</span> <span className="font-semibold text-slate-800">{action.action || 'Tindakan belum tersedia.'}</span>{action.reason && <span className="block mt-1">{action.reason}</span>}{action.expectedMeasurement && <span className="mt-1 block text-slate-500">Ukur: {action.expectedMeasurement}</span>}{evidenceFor(action.evidenceIds).length > 0 && <div className="mt-1 text-[11px] text-slate-500">Bukti: {evidenceFor(action.evidenceIds).map((item) => `${item.metric}=${displayValue(item.value, item.unit)}`).join(' · ')}</div>}{(action.baseline || action.target) && <div className="mt-1 text-[11px] text-slate-500">Baseline: {action.baseline ? displayValue(action.baseline.value, action.baseline.unit) : '—'} · Target: {action.target ? displayValue(action.target.value, action.target.unit) : '—'}</div>}{result.memoryId && <button type="button" onClick={() => onTrackAction(index)} disabled={trackedActions[index]} className="mt-2 rounded-md border border-violet-200 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60">{trackedActions[index] ? 'Tindakan dicatat' : 'Catat tindakan nyata'}</button>}</li>)}</ol> : <p className="mt-2 text-xs text-slate-500">Tidak ada tindakan terstruktur yang dikembalikan.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function LearningPanel({ memories, onRefresh, onMessage }) {
  const [busyId, setBusyId] = useState(null);
  const actions = memories.flatMap((memory) => (memory.actions || []).map((action) => ({ ...action, intent: memory.intent, memoryId: memory.id })));

  const updateStatus = async (action, status) => {
    setBusyId(action.id);
    const response = await updateHermesAction(action.id, { status });
    setBusyId(null);
    onMessage(response.success ? `Status tindakan diperbarui menjadi ${status}.` : (response.message || 'Status tindakan gagal diperbarui.'));
    if (response.success) onRefresh();
  };

  const removeAction = async (action) => {
    if (typeof window !== 'undefined' && !window.confirm('Hapus tindakan yang belum dimulai ini?')) return;
    setBusyId(`delete-${action.id}`);
    const response = await deleteHermesAction(action.id);
    setBusyId(null);
    onMessage(response.success ? 'Tindakan yang belum dimulai berhasil dihapus.' : (response.message || 'Tindakan gagal dihapus.'));
    if (response.success) onRefresh();
  };

  const evaluate = async (action, windowDays) => {
    setBusyId(`${action.id}-${windowDays}`);
    const response = await evaluateHermesAction(action.id, windowDays);
    setBusyId(null);
    onMessage(response.message || (response.success ? `Evaluasi ${windowDays} hari selesai.` : 'Evaluasi gagal.'));
    if (response.success) onRefresh();
  };

  return (
    <section className="surface overflow-hidden" aria-labelledby="hermes-learning-title">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 id="hermes-learning-title" className="text-sm font-semibold text-slate-900">Memori & pembelajaran dari tindakan nyata</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Di sini tim dapat melihat feedback, memulai tindakan, menandai tindakan selesai, lalu memeriksa hasilnya setelah 7 atau 30 hari. Tindakan yang belum dimulai dapat dihapus.</p>
      </div>
      <div className="p-5">
        {!actions.length ? (
          <p className="text-xs text-slate-500">Belum ada tindakan yang dicatat dari analisa Hermes.</p>
        ) : (
          <div className="space-y-3">
            {actions.slice(0, 12).map((action) => (
              <div key={action.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{action.actionText}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{action.intent} · status {action.status}{action.metricKey ? ` · ukur ${action.metricKey}` : ' · belum terukur'}</div>
                  </div>
                  <div className="flex gap-2">
                    {action.status === 'PLANNED' && <button type="button" disabled={busyId === action.id} onClick={() => updateStatus(action, 'IN_PROGRESS')} className="rounded-md border border-violet-200 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">Mulai</button>}
                    {action.status === 'IN_PROGRESS' && <button type="button" disabled={busyId === action.id} onClick={() => updateStatus(action, 'COMPLETED')} className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Tandai selesai</button>}
                    {action.status === 'PLANNED' && <button type="button" disabled={busyId === `delete-${action.id}`} onClick={() => removeAction(action)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3 w-3" aria-hidden="true" /> Hapus</button>}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">Arti status: {statusLabel(action.status)}{action.metricKey ? ` · diukur dengan ${metricLabel(action.metricKey)}` : ' · belum ada ukuran keberhasilan yang tervalidasi'}</div>
                </div>
                {action.evaluations?.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{action.evaluations.map((evaluation) => <div key={evaluation.id} className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><div className="flex items-center justify-between gap-2"><span className="font-semibold">Evaluasi {evaluation.windowDays} hari</span><span className="font-bold text-slate-500">{evaluation.status}</span></div>{evaluation.periodStatus && evaluation.periodStatus !== 'NOT_CHECKED' && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Periode: {evaluation.periodStatus}</div>}{evaluation.verdict && <div className="mt-1 font-semibold text-violet-700">{evaluation.verdict} · aktual {displayValue(evaluation.actualValue, action.unit)}</div>}{evaluation.notes && <div className="mt-1 leading-5">{evaluation.notes}</div>}{action.status === 'COMPLETED' && <button type="button" disabled={busyId === `${action.id}-${evaluation.windowDays}`} onClick={() => evaluate(action, evaluation.windowDays)} className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Perbarui evaluasi</button>}</div>)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function messageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => (typeof part === 'string' ? part : part?.text || ''))
    .filter(Boolean)
    .join('\n');
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[76%] ${isUser ? 'rounded-br-md bg-rose-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'}`}>
        <div className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${isUser ? 'text-rose-100' : 'text-slate-400'}`}>
          {isUser ? 'Anda' : 'Hermes Agent'}
        </div>
        <p className="whitespace-pre-wrap break-words">{messageText(message.content)}</p>
      </div>
    </div>
  );
}

function StatusPanel({ status, loading, onRefresh }) {
  const configured = status?.configured === true;
  const availability = status?.availability || 'NOT_CHECKED';
  const missingConfiguration = Array.isArray(status?.missingConfiguration)
    ? status.missingConfiguration
    : [];
  const missingLabels = {
    HERMES_AGENT_ENABLED: 'fitur Hermes diaktifkan',
    HERMES_AGENT_API_KEY: 'API key Hermes di backend',
  };
  return (
    <section className="surface p-5" aria-labelledby="hermes-status-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${configured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {configured ? <CircleCheck className="h-5 w-5" aria-hidden="true" /> : <CircleAlert className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div>
            <h2 id="hermes-status-title" className="text-sm font-semibold text-slate-900">Konfigurasi Hermes</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{status?.message || 'Status Hermes belum dimuat.'}</p>
            {missingConfiguration.length > 0 && (
              <p className="mt-1 text-xs leading-5 text-amber-700">
                Yang masih kurang: {missingConfiguration.map((key) => missingLabels[key] || key).join(', ')}.
              </p>
            )}
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Perbarui status
        </button>
      </div>
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Endpoint backend</div><div className="mt-1 break-all font-medium text-slate-700">{status?.baseUrl || 'Belum tersedia'}</div></div>
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Model default</div><div className="mt-1 break-all font-medium text-slate-700">{status?.model || 'Belum tersedia'}</div></div>
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ketersediaan</div><div className="mt-1 font-medium text-slate-700">{availability === 'NOT_CHECKED' ? 'Belum diprobe' : availability}</div></div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>Status di atas membaca konfigurasi backend. Request chat di bawah adalah uji koneksi dan generation yang sesungguhnya.</span>
      </div>
      {status?.memory && status.memory.available === false && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>Penyimpanan memori tidak aktif: analisa tetap berjalan, tetapi feedback, pencatatan tindakan, dan evaluasi outcome 7/30 hari dinonaktifkan.</span>
        </div>
      )}
    </section>
  );
}

export default function HermesExperimentPage() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [chatMode, setChatMode] = useState('EXPLORATORY');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [memories, setMemories] = useState([]);
  const [trackedActions, setTrackedActions] = useState({});
  const [learningMessage, setLearningMessage] = useState(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    const response = await fetchHermesStatus();
    setStatus(response);
    setStatusLoading(false);
  }, []);

  const loadModels = useCallback(async (refresh = false) => {
    setModelLoading(true);
    setModelError(null);
    const response = await fetchHermesModels({ refresh });
    if (response.success) {
      const discoveredModels = response.models || [];
      setModels(discoveredModels);
      setSelectedModel((current) => {
        if (current && discoveredModels.some((model) => model.id === current)) return current;
        if (response.defaultModel && discoveredModels.some((model) => model.id === response.defaultModel)) return response.defaultModel;
        const configuredWithoutFree = String(response.defaultModel || '').replace(/:free$/, '');
        if (configuredWithoutFree && discoveredModels.some((model) => model.id === configuredWithoutFree)) return configuredWithoutFree;
        const preferred = ['upstage/solar-pro4', 'deepseek/deepseek-v4-pro', 'anthropic/claude-sonnet-4.6', 'google/gemini-3.1-pro-preview'];
        return preferred.find((candidate) => discoveredModels.some((model) => model.id === candidate)) || discoveredModels[0]?.id || '';
      });
    } else {
      setModels([]);
      setSelectedModel('');
      setModelError(response.message || response.error || 'Daftar model Hermes belum dapat dibaca.');
    }
    setModelLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status?.configured) loadModels();
  }, [loadModels, status?.configured]);

  const loadMemories = useCallback(async () => {
    const response = await fetchHermesMemories({ limit: 20 });
    if (response.success) setMemories(response.memories || []);
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const modelReady = Boolean(selectedModel && models.some((model) => model.id === selectedModel));

  const validateIntent = async (intent) => {
    setSelectedIntent(intent);
    setValidationLoading(true);
    setValidation(null);
    setAnalysis(null);
    setAnalysisError(null);
    const response = await validateHermesAnalysis({ intent });
    setValidation(response);
    setValidationLoading(false);
  };

  const runAnalysis = async () => {
    if (!selectedIntent || !validation?.canCallHermes || !modelReady || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    const response = await analyzeHermes({ intent: selectedIntent, model: selectedModel });
    if (response.success) {
      setAnalysis(response);
      setTrackedActions({});
      loadMemories();
    }
    else setAnalysisError({
      errorCode: response.errorCode,
      message: response.message || response.error || 'Analisa Hermes gagal.',
      details: response.validationErrors || [],
      warnings: response.validationWarnings || [],
      diagnostic: response.diagnostic || null,
      requestId: response.requestId || response.diagnostic?.requestId || null,
    });
    setAnalysisLoading(false);
  };

  const sendFeedback = async (rating, reasons = [], comment = null) => {
    if (!analysis?.memoryId || feedbackBusy) return { success: false, errorCode: 'MEMORY_NOT_FOUND' };
    setFeedbackBusy(true);
    const response = await submitHermesFeedback(analysis.memoryId, { rating, reasons, comment });
    setFeedbackBusy(false);
    setLearningMessage(response.success
      ? 'Feedback tersimpan. Hermes akan menggunakan sinyal ini untuk evaluasi berikutnya.'
      : `Feedback belum tersimpan${response.errorCode ? ` (${response.errorCode})` : ''}: ${response.message || 'periksa koneksi backend dan database.'}`);
    if (response.success) loadMemories();
    return response;
  };

  const trackAction = async (recommendationIndex) => {
    if (!analysis?.memoryId) return;
    const response = await trackHermesAction(analysis.memoryId, recommendationIndex);
    if (response.success) {
      setTrackedActions((current) => ({ ...current, [recommendationIndex]: true }));
      setLearningMessage(response.trackingConfigured
        ? 'Tindakan dicatat. Hermes akan menunggu jendela evaluasi 7/30 hari.'
        : 'Tindakan dicatat, tetapi belum bisa diukur karena baseline/metricKey belum lengkap.');
      loadMemories();
    } else setLearningMessage(response.message || 'Tindakan gagal dicatat.');
  };

  const send = async (content) => {
    const text = String(content || '').trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setError(null);
    setSending(true);

    const response = await sendHermesChat(nextMessages, chatMode, selectedModel);
    if (response.success) {
      const assistantContent = response.response?.choices?.[0]?.message?.content;
      if (assistantContent === undefined) {
        setError({ errorCode: 'INVALID_RESPONSE', message: 'Hermes mengembalikan response tanpa isi pesan yang dapat ditampilkan.' });
      } else {
        setMessages([...nextMessages, { role: 'assistant', content: assistantContent }]);
      }
    } else {
      setError({ errorCode: response.errorCode, message: response.message || response.error || 'Hermes tidak mengembalikan jawaban.' });
    }
    setSending(false);
  };

  const clearConversation = () => {
    if (sending) return;
    setMessages([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eksperimen Hermes Agent"
        description="Ruang uji terpisah untuk Hermes Agent lokal. Percakapan ini tidak mengubah panel AI/Gemini dan tidak menyimpan riwayat ke database."
        actions={(
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" /> Eksperimen lokal
          </span>
        )}
      />

      <StatusPanel status={status} loading={statusLoading} onRefresh={loadStatus} />

      <ModelSelectionPanel
        status={status}
        models={models}
        selectedModel={selectedModel}
        modelLoading={modelLoading}
        modelError={modelError}
        onSelect={setSelectedModel}
        onRefresh={() => loadModels(true)}
      />

      <section className="surface p-5" aria-labelledby="hermes-analysis-title">
        <div>
          <h2 id="hermes-analysis-title" className="text-sm font-semibold text-slate-900">Analisa berbasis data aplikasi</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Pilih topik yang ingin dipahami. Hermes akan memeriksa data terlebih dahulu, lalu menjelaskan apa yang terjadi, kemungkinan penyebabnya, dan langkah kerja yang bisa dilakukan tim.</p>
          <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-600 sm:grid-cols-3"><div><span className="font-semibold text-slate-800">Temuan</span><br />Fakta yang terlihat di data.</div><div><span className="font-semibold text-slate-800">Penyebab</span><br />Dugaan yang perlu diverifikasi.</div><div><span className="font-semibold text-slate-800">Tindakan</span><br />Langkah praktis dan cara mengukurnya.</div></div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {INTENT_OPTIONS.map((option) => {
            const active = selectedIntent === option.value;
            return (
              <button key={option.value} type="button" onClick={() => validateIntent(option.value)} disabled={validationLoading || analysisLoading} className={`rounded-lg border px-3 py-3 text-left transition ${active ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'} disabled:cursor-not-allowed disabled:opacity-60`}>
                <div className="text-xs font-bold text-slate-800">{option.label}</div>
                <div className="mt-1 text-[11px] leading-5 text-slate-500">{option.description}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          {validationLoading ? <div className="inline-flex items-center gap-2 text-xs text-slate-500" role="status"><LoaderCircle className="h-4 w-4 animate-spin text-violet-600" aria-hidden="true" /> Memeriksa sumber dan kriteria data...</div> : <QualityPanel validation={validation} loading={validationLoading} analysisLoading={analysisLoading} onAnalyze={runAnalysis} modelReady={modelReady} />}
        </div>
        {analysisError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">Analisa Hermes gagal{analysisError.errorCode ? ` (${analysisError.errorCode})` : ''}</p>
              <p className="mt-1 leading-5">{analysisError.message}</p>
              {analysisError.requestId && <p className="mt-1 font-mono text-[10px] text-rose-600">requestId: {analysisError.requestId}</p>}
              {analysisError.details?.length > 0 && (
                <div className="mt-2 rounded-md border border-rose-200 bg-white/60 px-3 py-2">
                  <p className="font-semibold text-rose-900">Detail validator</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {analysisError.details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
                  </ul>
                </div>
              )}
              {analysisError.warnings?.length > 0 && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  <p className="font-semibold">Warning validator</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {analysisError.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                  </ul>
                </div>
              )}
              {analysisError.diagnostic && (
                <p className="mt-2 text-[10px] text-rose-600">Tahap: {analysisError.diagnostic.stage || 'unknown'} · Detail lengkap tersedia di terminal backend.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <AnalysisResult result={analysis} onFeedback={sendFeedback} onTrackAction={trackAction} trackedActions={trackedActions} feedbackBusy={feedbackBusy} memoryUnavailableReason={status?.memory?.available === false ? 'Backend melaporkan penyimpanan memori belum tersedia.' : null} />
      {learningMessage && <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-800" role="status">{learningMessage}</div>}
      <LearningPanel memories={memories} onRefresh={loadMemories} onMessage={setLearningMessage} />

      <section className="surface" aria-labelledby="hermes-chat-title">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="hermes-chat-title" className="text-sm font-semibold text-slate-900">Hermes Chat</h2>
            <p className="mt-1 text-xs text-slate-500">Riwayat dikirim ulang sebagai `messages` pada setiap request karena jalur chat ini bersifat stateless.</p>
          </div>
          <button type="button" onClick={clearConversation} disabled={!messages.length || sending} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Bersihkan
          </button>
        </div>

        <div className="min-h-[360px] space-y-4 bg-slate-50/60 p-4 sm:p-6">
          {!messages.length && !sending ? (
            <EmptyState title="Belum ada percakapan" message="Tulis pertanyaan pertama untuk menguji generation Hermes Agent." icon={Bot} />
          ) : (
            <>
              {messages.map((message, index) => <ChatBubble key={`${message.role}-${index}`} message={message} />)}
              {sending && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm" role="status" aria-live="polite">
                    <LoaderCircle className="h-4 w-4 animate-spin text-violet-600" aria-hidden="true" /> Hermes sedang memproses...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800 sm:mx-6">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{chatMode === 'EXPLORATORY' ? 'Mode eksploratif tidak otomatis memakai data dashboard.' : 'Mode terarah menandai permintaan sebagai konteks yang harus dijawab lebih grounded, tetapi tetap tidak mengambil data dashboard secara otomatis.'} Untuk analisa bisnis berbasis bukti, gunakan tombol analisa pada intent di atas.</span>
        </div>

        <div className="mx-4 mt-4 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:mx-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mode chat</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CHAT_MODE_OPTIONS.map((option) => (
              <label key={option.value} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-xs transition ${chatMode === option.value ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200' : 'border-slate-200 hover:border-violet-200'}`}>
                <input type="radio" name="hermes-chat-mode" value={option.value} checked={chatMode === option.value} onChange={(event) => setChatMode(event.target.value)} className="sr-only" />
                <span className="font-semibold text-slate-800">{option.label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-slate-500">{option.description}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 sm:mx-6" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div><p className="font-semibold">Generation Hermes gagal{error.errorCode ? ` (${error.errorCode})` : ''}</p><p className="mt-1 leading-5">{error.message}</p></div>
          </div>
        )}

        <ChatInput
          onSend={send}
          sending={sending}
          disabled={!modelReady}
          maxLength={10000}
          placeholder="Tulis pesan untuk Hermes Agent..."
          helperText={`Model terpilih: ${selectedModel || 'belum ada'} · Enter untuk mengirim · Shift+Enter baris baru`}
          className="rounded-b-lg"
        />
      </section>
    </div>
  );
}
