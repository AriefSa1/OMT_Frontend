'use client';

import { useState, useEffect } from 'react';
import { Calculator, Sparkles, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, ShieldAlert, DollarSign } from 'lucide-react';
import { simulateAIDynamicPricing } from '../lib/api';
import { formatIDR, formatPercent } from '../lib/utils';
import AIStatusNotice from './AIStatusNotice';

export default function ProductPricingSimulator({ product, initialEconomics = null, competitorPrice = 0 }) {
  const [testPrice, setTestPrice] = useState(product?.price || 0);
  const [unitCost, setUnitCost] = useState(initialEconomics?.unitCost ?? 0);
  const [unitAdCost, setUnitAdCost] = useState(initialEconomics?.unitAdCost ?? 0);
  const [shippingCost, setShippingCost] = useState(initialEconomics?.shippingCost ?? 0);
  // No 6.5% default: the fee drives margin, breakeven and safety floor, so assuming it
  // produced figures that looked measured but rested on a guess.
  const [platformFeePercent, setPlatformFeePercent] = useState(initialEconomics?.platformFeePercent ?? '');
  const [compPrice, setCompPrice] = useState(competitorPrice || 0);

  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product?.price && !testPrice) {
      setTestPrice(product.price);
    }
  }, [product?.price, testPrice]);

  const runSimulation = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await simulateAIDynamicPricing({
        name: product.name,
        currentPrice: product.price || 0,
        targetPrice: Number(testPrice) || 0,
        unitCost: Number(unitCost) || 0,
        unitAdCost: Number(unitAdCost) || 0,
        shippingCost: Number(shippingCost) || 0,
        platformFeePercent: platformFeePercent === '' ? null : Number(platformFeePercent),
        competitorPrice: Number(compPrice) || 0,
      });
      setSimulation(res || null);
    } catch (err) {
      console.warn('Failed to run pricing simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  // calculations is backend arithmetic and stays visible; aiAdvice is model prose and
  // only exists on a live result.
  const calc = simulation?.calculations;
  const advice = simulation?.success ? simulation.aiAdvice : null;

  return (
    <section className="surface overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI Dynamic Pricing & Profit-Margin Simulator</h2>
            <p className="text-xs text-slate-500">Uji skenario harga, simulasi margin bersih, & kalkulasi harga batas aman (safety floor)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={runSimulation}
          disabled={loading || !testPrice}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{loading ? 'Simulasi Berjalan...' : simulation ? 'Uji Ulang Skenario' : 'Jalankan Simulasi'}</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Input Parameters Grid */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-700">Harga Uji Coba (Rp)</span>
            <input
              type="number"
              min="0"
              value={testPrice}
              onChange={(e) => setTestPrice(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2.5 text-xs font-semibold text-slate-900"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-700">COGS/Modal Produk (Rp)</span>
            <input
              type="number"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-700">Biaya Iklan/Unit (Rp)</span>
            <input
              type="number"
              min="0"
              value={unitAdCost}
              onChange={(e) => setUnitAdCost(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-700">Ongkir Subsidi (Rp)</span>
            <input
              type="number"
              min="0"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-700">Shopee Fee (%)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={platformFeePercent}
              onChange={(e) => setPlatformFeePercent(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-700">Harga Kompetitor (Rp)</span>
            <input
              type="number"
              min="0"
              value={compPrice}
              onChange={(e) => setCompPrice(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </label>
        </div>

        {/* Results section */}
        {!simulation ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-6 text-center bg-slate-50/40">
            <DollarSign className="h-7 w-7 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Masukkan nilai biaya dan jalankan simulasi</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Sistem akan menghitung margin bersih riil, harga impas (breakeven), dan batas harga aman.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Margin arithmetic still renders below; only the model's prose is withheld.
                AIStatusNotice renders nothing on a successful result. */}
            <AIStatusNotice result={simulation} />
            {/* Calculation Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Potongan Fee Shopee</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatIDR(calc?.platformFeeAmount)}</p>
                <p className="text-[10px] text-slate-400">{platformFeePercent}% dari harga jual</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Total Beban Biaya</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatIDR(calc?.totalCost)}</p>
                <p className="text-[10px] text-slate-400">COGS + Iklan + Fee</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Margin Bersih/Unit</p>
                <p className={`mt-1 text-sm font-bold ${calc?.grossMarginAmount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatIDR(calc?.grossMarginAmount)}
                </p>
                <p className="text-[10px] font-semibold text-slate-500">{formatPercent(calc?.grossMarginPercent)} margin</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Harga Impas (Breakeven)</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatIDR(calc?.breakevenPrice)}</p>
                <p className="text-[10px] text-slate-400">Margin 0%</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Batas Aman (Floor)</p>
                <p className="mt-1 text-sm font-bold text-amber-600">{formatIDR(calc?.safetyFloorPrice)}</p>
                <p className="text-[10px] text-slate-400">Min. buffer 15%</p>
              </div>
            </div>

            {/* AI Advisor Card */}
            {advice && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Rekomendasi AI Pricing Strategist</span>
                  </div>
                  {advice.optimalPrice && (
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                      Harga Optimal: {formatIDR(advice.optimalPrice)}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs leading-relaxed text-slate-700">
                  <div className="rounded bg-slate-50 p-2.5 border border-slate-100">
                    <p className="font-semibold text-slate-800">Analisis Elastisitas:</p>
                    <p className="mt-0.5 text-slate-600">{advice.elasticityAnalysis}</p>
                  </div>

                  {advice.competitorBenchmarking && (
                    <div className="rounded bg-slate-50 p-2.5 border border-slate-100">
                      <p className="font-semibold text-slate-800">Benchmarking Kompetitor:</p>
                      <p className="mt-0.5 text-slate-600">{advice.competitorBenchmarking}</p>
                    </div>
                  )}

                  {advice.promotionalDiscountBudget > 0 && (
                    <div className="rounded bg-amber-50/60 p-2.5 border border-amber-100 text-amber-900">
                      <p className="font-semibold">Maksimal Budget Voucher Diskon / Flash Sale:</p>
                      <p className="mt-0.5 font-bold text-amber-800">{formatIDR(advice.promotionalDiscountBudget)} per unit</p>
                    </div>
                  )}

                  {advice.actionStrategy && (
                    <p className="pt-1 text-[11px] text-slate-500 italic">
                      Strategi: {advice.actionStrategy}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
