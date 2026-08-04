'use client';

import { useState } from 'react';
import { Target, Sparkles, RefreshCw, Copy, Check, TrendingDown, ArrowUpRight, ArrowDownRight, ShieldAlert, Zap, Layers } from 'lucide-react';
import { optimizeAIAdsKeywords } from '../lib/api';
import { formatIDR, formatPercent } from '../lib/utils';

export default function AdsAIOptimizerCard({ adsData }) {
  const [selectedCampaign, setSelectedCampaign] = useState(adsData?.topCampaigns?.[0]?.name || 'Semua Kampanye Iklan');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  const currentCamp = adsData?.topCampaigns?.find((c) => c.name === selectedCampaign) || {
    name: selectedCampaign,
    spend: adsData?.totalSpend || 0,
    sales: adsData?.totalSalesGenerated || 0,
    roas: adsData?.roas || 0,
    ctr: adsData?.ctr || 0,
  };

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const res = await optimizeAIAdsKeywords({
        campaignName: currentCamp.name,
        spend: currentCamp.spend,
        sales: currentCamp.sales,
        roas: currentCamp.roas,
        ctr: currentCamp.ctr,
        category: 'Fashion & Apparel',
      });
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.warn('Failed to optimize ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyNegativeKeywords = () => {
    if (!data?.negativeKeywordsToExclude) return;
    navigator.clipboard.writeText(data.negativeKeywordsToExclude.join(', '));
    setCopiedKey('neg');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <section className="surface overflow-hidden border border-slate-200 shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-600 text-white">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI Ads Negative Keyword & Bid Optimizer</h2>
            <p className="text-xs text-slate-500">Deteksi pemborosan iklan, rekomendasi kata kunci negatif, & penyesuaian bid</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {adsData?.topCampaigns?.length > 0 && (
            <select
              value={selectedCampaign}
              onChange={(e) => {
                setSelectedCampaign(e.target.value);
                setData(null);
              }}
              className="ui-select h-8 max-w-48 truncate rounded-md px-2 text-xs font-medium text-slate-700"
            >
              {adsData.topCampaigns.map((c, i) => (
                <option key={i} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleOptimize}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-60 transition"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{loading ? 'Menganalisis...' : data ? 'Analisis Ulang' : 'Optimasi Iklan'}</span>
          </button>
        </div>
      </div>

      <div className="p-5">
        {!data ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center bg-slate-50/40">
            <Target className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Analisis kata kunci belum dijalankan</p>
            <p className="mt-1 text-[11px] text-slate-500 max-w-md">
              Pilih kampanye dan klik &quot;Optimasi Iklan&quot; untuk menemukan kata kunci boncos dan strategi bid optimal di Shopee Ads.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Overview Banner */}
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800">{data.summary}</p>
              {data.wastedSpendEstimate > 0 && (
                <div className="mt-2 flex items-center gap-2 text-rose-700 font-bold">
                  <TrendingDown className="h-4 w-4" />
                  <span>Estimasi Biaya Boncos / Terbuang: {formatIDR(data.wastedSpendEstimate)}</span>
                </div>
              )}
            </div>

            {/* Negative Keywords Exclude */}
            {data.negativeKeywordsToExclude && data.negativeKeywordsToExclude.length > 0 && (
              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-900">Kata Kunci Negatif yang Disarankan untuk Diblokir:</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyNegativeKeywords}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800"
                  >
                    {copiedKey === 'neg' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey === 'neg' ? 'Tersalin!' : 'Salin Semua Kata Kunci'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.negativeKeywordsToExclude.map((kw, i) => (
                    <span key={i} className="rounded-md bg-white border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-800 shadow-2xs">
                      - {kw}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Tambahkan kata kunci di atas ke pengaturan Kata Kunci Negatif di Shopee Seller Center untuk menghentikan klik yang tidak menghasilkan pesanan.
                </p>
              </div>
            )}

            {/* Bid Adjustment Rules */}
            {data.bidAdjustments && data.bidAdjustments.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900">Rekomendasi Penyesuaian Nilai Bid:</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {data.bidAdjustments.map((adj, idx) => (
                    <div key={idx} className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{adj.keywordType}</span>
                        <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          adj.action === 'NAIKKAN_BID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {adj.action === 'NAIKKAN_BID' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {adj.recommendedAdjustment}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{adj.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scale Keywords Recommended */}
            {data.scaleKeywordsRecommended && data.scaleKeywordsRecommended.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900">Kata Kunci Potensial untuk Scaling:</span>
                <div className="table-scroll">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-medium">Kata Kunci</th>
                        <th className="px-3 py-2 font-medium">Tipe Pencocokan</th>
                        <th className="px-3 py-2 font-medium">Saran Bid (Rp)</th>
                        <th className="px-3 py-2 font-medium">Volume Pencarian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.scaleKeywordsRecommended.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-800">{item.keyword}</td>
                          <td className="px-3 py-2 text-slate-600">{item.matchType}</td>
                          <td className="px-3 py-2 font-medium text-emerald-600">{formatIDR(item.suggestedBid)}</td>
                          <td className="px-3 py-2 text-slate-500">{item.estimatedSearchVolume}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Daily budget strategy */}
            {data.dailyBudgetStrategy && (
              <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100 text-xs text-blue-900">
                <span className="font-bold">Strategi Anggaran Harian: </span>
                <span>{data.dailyBudgetStrategy}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
