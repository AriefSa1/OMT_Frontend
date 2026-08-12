'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CalendarDays, CircleAlert, CircleCheck, Info, LoaderCircle, RefreshCw, Send, ShieldCheck, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { analyzeHermes, fetchHermesStatus, sendHermesChat, validateHermesAnalysis } from '../../lib/api';

const INTENT_OPTIONS = [
  { value: 'IKLAN', label: 'Iklan', description: 'Spend, sales, ROAS, CTR, dan kampanye' },
  { value: 'PERFORMA_TOKO', label: 'Performa Toko', description: 'GMV, order, AOV, pembatalan, dan retur' },
  { value: 'PERFORMA_PRODUK', label: 'Performa Produk', description: 'Produk terukur, penjualan, order, dan funnel' },
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

function QualityPanel({ validation, loading, analysisLoading, onAnalyze }) {
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
  return (
    <div className="space-y-4">
      <div className={`flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${qualityTone(quality.status)}`}>
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Data {quality.status || 'UNKNOWN'}</div>
            <p className="mt-1 text-xs leading-5">{quality.reason || 'Status kualitas data belum tersedia.'}</p>
          </div>
        </div>
        {validation.canCallHermes ? (
          <button type="button" onClick={onAnalyze} disabled={analysisLoading} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-400">
            {analysisLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
            {analysisLoading ? 'Menganalisa...' : 'Kirim konteks ke Hermes'}
          </button>
        ) : (
          <span className="text-[11px] font-semibold">Pengiriman dihentikan</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Rentang analisa</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{validation.period?.startDate || 'Belum tersedia'} — {validation.period?.endDate || 'Belum tersedia'}</div>
          <p className="mt-1 text-[11px] text-slate-500">{validation.period?.days || 'Belum tersedia'} hari kalender{validation.period?.defaultRange ? ' · default 30 hari terakhir' : validation.period?.defaulted ? ' · tanggal otomatis' : ''}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 sm:min-w-44">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mode</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{quality.analysisMode || 'Belum tersedia'}</div>
          <p className="mt-1 text-[11px] text-slate-500">Klaim dibatasi oleh data trusted</p>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Sumber yang diperiksa</div>
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
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batasan yang akan dibawa ke Hermes</div>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
            {gaps.map((gap, index) => <li key={`${gap}-${index}`} className="flex gap-2"><span className="text-amber-500">•</span><span>{gap}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnalysisResult({ result }) {
  if (!result) return null;
  const analysis = result.analysis || {};
  const findings = Array.isArray(analysis.criticalFindings) ? analysis.criticalFindings : [];
  const rootCauses = Array.isArray(analysis.rootCauseAnalysis) ? analysis.rootCauseAnalysis : [];
  const actions = Array.isArray(analysis.prioritizedActions) ? analysis.prioritizedActions : [];
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
        <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm leading-6 text-slate-700">{analysis.executiveVerdict || 'Hermes tidak memberikan executive verdict.'}</div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Temuan kritis</h3>
          {findings.length ? (
            <div className="mt-2 space-y-2">
              {findings.map((finding, index) => (
                <div key={`${finding.title || 'finding'}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-800">{finding.title || 'Temuan tanpa judul'}</span>{finding.severity && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{finding.severity}</span>}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{finding.description || 'Deskripsi belum tersedia.'}</p>
                  {Array.isArray(finding.evidence) && finding.evidence.length > 0 && <div className="mt-2 space-y-1 text-[11px] text-slate-500">{finding.evidence.map((evidence, evidenceIndex) => <div key={`${evidence.metric || 'metric'}-${evidenceIndex}`}>{evidence.metric || 'Metrik'}: <span className="font-semibold text-slate-700">{displayValue(evidence.value, evidence.unit)}</span>{evidence.period ? ` · ${evidence.period}` : ''}</div>)}</div>}
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">Tidak ada temuan terstruktur yang dikembalikan.</p>}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hipotesis akar masalah</h3>
            {rootCauses.length ? <div className="mt-2 space-y-2">{rootCauses.map((cause, index) => <div key={`${cause.hypothesis || 'cause'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">{cause.hypothesis || 'Hipotesis belum tersedia.'}</span>{Array.isArray(cause.supportingEvidence) && cause.supportingEvidence.length > 0 && <ul className="mt-1 list-disc pl-4">{cause.supportingEvidence.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>}</div>)}</div> : <p className="mt-2 text-xs text-slate-500">Tidak ada hipotesis terstruktur yang dikembalikan.</p>}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Prioritas tindakan</h3>
            {actions.length ? <ol className="mt-2 space-y-2">{actions.map((action, index) => <li key={`${action.action || 'action'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs leading-5 text-slate-600"><span className="font-bold text-violet-700">#{action.priority || index + 1}</span> <span className="font-semibold text-slate-800">{action.action || 'Tindakan belum tersedia.'}</span>{action.reason && <span className="block mt-1">{action.reason}</span>}{action.expectedMeasurement && <span className="mt-1 block text-slate-500">Ukur: {action.expectedMeasurement}</span>}</li>)}</ol> : <p className="mt-2 text-xs text-slate-500">Tidak ada tindakan terstruktur yang dikembalikan.</p>}
          </div>
        </div>
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
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Perbarui status
        </button>
      </div>
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Endpoint</div><div className="mt-1 break-all font-medium text-slate-700">{status?.baseUrl || 'Belum tersedia'}</div></div>
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Model default</div><div className="mt-1 break-all font-medium text-slate-700">{status?.model || 'Belum tersedia'}</div></div>
        <div><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ketersediaan</div><div className="mt-1 font-medium text-slate-700">{availability === 'NOT_CHECKED' ? 'Belum diprobe' : availability}</div></div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>Status di atas membaca konfigurasi backend. Request chat di bawah adalah uji koneksi dan generation yang sesungguhnya.</span>
      </div>
    </section>
  );
}

export default function HermesExperimentPage() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    const response = await fetchHermesStatus();
    setStatus(response);
    setStatusLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const canSend = useMemo(() => Boolean(draft.trim()) && !sending, [draft, sending]);

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
    if (!selectedIntent || !validation?.canCallHermes || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    const response = await analyzeHermes({ intent: selectedIntent });
    if (response.success) setAnalysis(response);
    else setAnalysisError({ errorCode: response.errorCode, message: response.message || response.error || 'Analisa Hermes gagal.' });
    setAnalysisLoading(false);
  };

  const send = async (event) => {
    event?.preventDefault?.();
    const content = draft.trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setDraft('');
    setError(null);
    setSending(true);

    const response = await sendHermesChat(nextMessages);
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

      <section className="surface p-5" aria-labelledby="hermes-analysis-title">
        <div>
          <h2 id="hermes-analysis-title" className="text-sm font-semibold text-slate-900">Analisa berbasis data aplikasi</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Pilih fokus dengan bahasa yang sama seperti perintah pengguna. Default yang dipakai backend adalah tepat 30 hari kalender terakhir; data akan divalidasi sebelum dikirim ke Hermes.</p>
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
          {validationLoading ? <div className="inline-flex items-center gap-2 text-xs text-slate-500" role="status"><LoaderCircle className="h-4 w-4 animate-spin text-violet-600" aria-hidden="true" /> Memeriksa sumber dan kriteria data...</div> : <QualityPanel validation={validation} loading={validationLoading} analysisLoading={analysisLoading} onAnalyze={runAnalysis} />}
        </div>
        {analysisError && <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800" role="alert"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" /><div><p className="font-semibold">Analisa Hermes gagal{analysisError.errorCode ? ` (${analysisError.errorCode})` : ''}</p><p className="mt-1 leading-5">{analysisError.message}</p></div></div>}
      </section>

      <AnalysisResult result={analysis} />

      <section className="surface overflow-hidden" aria-labelledby="hermes-chat-title">
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

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 sm:mx-6" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div><p className="font-semibold">Generation Hermes gagal{error.errorCode ? ` (${error.errorCode})` : ''}</p><p className="mt-1 leading-5">{error.message}</p></div>
          </div>
        )}

        <form onSubmit={send} className="border-t border-slate-200 bg-white p-4 sm:p-6">
          <label htmlFor="hermes-message" className="sr-only">Pesan untuk Hermes Agent</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              id="hermes-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={3}
              maxLength={10000}
              placeholder="Tulis pesan untuk Hermes Agent..."
              className="ui-input min-h-20 flex-1 resize-y rounded-lg px-3 py-2.5 text-sm leading-6"
            />
            <button type="submit" disabled={!canSend} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-28">
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {sending ? 'Mengirim' : 'Kirim'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Enter untuk mengirim · Shift+Enter untuk baris baru · Maksimal 10.000 karakter per pesan</p>
        </form>
      </section>
    </div>
  );
}
