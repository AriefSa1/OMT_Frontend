'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw, Wand2, Layers, Tag, ChevronRight } from 'lucide-react';
import { generateAIABCopy } from '../lib/api';
import AIStatusNotice from './AIStatusNotice';

export default function ProductABCopywriter({ product }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedKey, setCopiedKey] = useState('');
  const [targetAudience, setTargetAudience] = useState('Wanita Muda & Dewasa (Shopee Hunter)');

  const handleGenerate = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await generateAIABCopy({
        name: product.name,
        category: product.category || '',
        price: product.price,
        description: product.description || '',
        targetAudience,
      });
      setData(res || null);
      setActiveTab(0);
    } catch (err) {
      console.warn('Failed to generate A/B copy:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const currentVariant = data?.variations?.[activeTab];

  return (
    <section className="surface overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-600 text-white">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI Copywriter & A/B Testing Variations</h2>
            <p className="text-xs text-slate-500">Buat 3 variasi copywriting dengan fokus SEO, Promo Urgensi, & Emosional</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 transition"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{loading ? 'Menghasilkan Copy...' : data ? 'Regenerasi Copy' : 'Generate 3 Variasi'}</span>
        </button>
      </div>

      <div className="p-5">
        {!data ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center bg-slate-50/40">
            <Layers className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Belum ada variasi copy yang digenerate</p>
            <p className="mt-1 text-[11px] text-slate-500 max-w-sm">
              Klik tombol di atas untuk membuat 3 set judul dan deskripsi siap pakai untuk listing Shopee Anda.
            </p>
          </div>
        ) : !data.success || !data.variations?.length ? (
          <AIStatusNotice result={data} />
        ) : (
          <div className="space-y-4">
            {/* Tabs for variations */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              {data.variations.map((variant, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === idx
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{variant.variantLabel || `Variasi ${idx + 1}`}</span>
                </button>
              ))}
            </div>

            {currentVariant && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                {/* Variant Tagline */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 italic">{currentVariant.tagline}</span>
                  {data.confidenceScore && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Skor Konversi: {data.confidenceScore}%
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                    <span>Judul Listing Rekomendasi:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentVariant.title, 'title')}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-[11px]"
                    >
                      {copiedKey === 'title' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === 'title' ? 'Tersalin!' : 'Salin Judul'}</span>
                    </button>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 border border-slate-200">
                    {currentVariant.title}
                  </div>
                </div>

                {/* Bullets / Selling Points */}
                {currentVariant.bullets && currentVariant.bullets.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                      <span>Poin Keunggulan Utama (Bullet Points):</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentVariant.bullets.join('\n'), 'bullets')}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-[11px]"
                      >
                        {copiedKey === 'bullets' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedKey === 'bullets' ? 'Tersalin!' : 'Salin Poin'}</span>
                      </button>
                    </div>
                    <ul className="space-y-1.5 rounded-md bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700">
                      {currentVariant.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Short Copy */}
                {currentVariant.shortCopy && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                      <span>Deskripsi Ringkas:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentVariant.shortCopy, 'copy')}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-[11px]"
                      >
                        {copiedKey === 'copy' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedKey === 'copy' ? 'Tersalin!' : 'Salin Deskripsi'}</span>
                      </button>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-700 leading-relaxed border border-slate-200">
                      {currentVariant.shortCopy}
                    </div>
                  </div>
                )}

                {/* Recommended Tags */}
                {currentVariant.recommendedTags && currentVariant.recommendedTags.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <Tag className="h-3 w-3 text-slate-400" />
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Hashtags:</span>
                    {currentVariant.recommendedTags.map((tag, i) => (
                      <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
