'use client';

import { useState } from 'react';
import { Boxes, Sparkles, RefreshCw, AlertTriangle, Calendar, TrendingDown, CheckCircle, PackagePlus, Zap } from 'lucide-react';
import { fetchAIPredictiveRestock, createTask } from '../lib/api';
import { formatNumber } from '../lib/utils';

export default function ProductRestockPredictor({ product, warehouseStock = 0 }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [taskMsg, setTaskMsg] = useState('');

  const handlePredict = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await fetchAIPredictiveRestock({
        name: product.name,
        sku: product.sku || product.shopeeItemId,
        stock: product.stock || 0,
        salesCount: product.salesCount || 0,
        warehouseStock: warehouseStock || 0,
        leadTimeDays: Number(leadTimeDays) || 7,
        category: product.category || 'Fashion',
      });
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.warn('Failed to calculate predictive restock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestockTask = async () => {
    if (!product || !data) return;
    const isDeadstock = data.metrics?.urgency === 'DEADSTOCK';
    const response = await createTask({
      id: `AI-RESTOCK-${product.shopeeItemId}`,
      type: isDeadstock ? 'INVENTORY_RECONCILIATION' : 'PRODUCT_REVIEW',
      title: isDeadstock ? `Likuidasi Deadstock: ${product.name}` : `Restock ${data.metrics?.suggestedBatchReorder || 50} unit: ${product.name}`,
      description: data.restockRecommendation || 'Tindak lanjuti rekomendasi AI restock & persediaan.',
      source: 'GUDANG_INTERNAL',
      entityType: 'PRODUCT',
      entityId: product.shopeeItemId,
      priority: data.metrics?.urgency === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    });
    setTaskMsg(response.message || response.error || 'Tugas restock berhasil dibuat!');
  };

  const metrics = data?.metrics;
  const playbook = data?.liquidationPlaybook;

  return (
    <section className="surface overflow-hidden border border-slate-200 shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-600 text-white">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI Predictive Restock & Deadstock Playbook</h2>
            <p className="text-xs text-slate-500">Estimasi habisnya stok (DOIR), rekomendasi reorder, & strategi likuidasi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Lead time (hari):</span>
            <input
              type="number"
              min="1"
              max="60"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className="h-8 w-16 rounded border border-slate-300 px-2 text-center text-xs"
            />
          </label>
          <button
            type="button"
            onClick={handlePredict}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-60 transition"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{loading ? 'Menghitung...' : data ? 'Hitung Ulang' : 'Analisis Stok'}</span>
          </button>
        </div>
      </div>

      <div className="p-5">
        {!data ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center bg-slate-50/40">
            <Boxes className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Analisis stok belum dijalankan</p>
            <p className="mt-1 text-[11px] text-slate-500 max-w-sm">
              Klik &quot;Analisis Stok&quot; untuk memproyeksikan laju penjualan harian dan tanggal habisnya persediaan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPI Run-Rate Strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Total Stok Fisik</p>
                <p className="mt-1 text-base font-bold text-slate-900">{formatNumber(metrics?.currentStock)} unit</p>
                <p className="text-[10px] text-slate-400">Shopee + Gudang</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Laju Penjualan (Daily)</p>
                <p className="mt-1 text-base font-bold text-slate-900">{metrics?.dailyVelocity} unit/hari</p>
                <p className="text-[10px] text-slate-400">Rata-rata 30 hari</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Sisa Hari Stok (DOIR)</p>
                <p className={`mt-1 text-base font-bold ${
                  metrics?.urgency === 'CRITICAL' ? 'text-rose-600' : metrics?.urgency === 'WARNING' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {metrics?.daysOfInventory} hari
                </p>
                <p className="text-[10px] text-slate-400">Habis ~ {metrics?.predictedRunoutDate}</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">Rekomendasi Reorder</p>
                <p className="mt-1 text-base font-bold text-blue-600">+{formatNumber(metrics?.suggestedBatchReorder)} unit</p>
                <p className="text-[10px] text-slate-400">Buffer aman 30 hari</p>
              </div>
            </div>

            {/* AI Recommendation Message */}
            <div className={`rounded-lg p-3.5 border text-xs leading-relaxed ${
              metrics?.urgency === 'CRITICAL'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : metrics?.urgency === 'DEADSTOCK'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-start gap-2">
                {metrics?.urgency === 'CRITICAL' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">Status: {metrics?.urgency}</p>
                  <p className="mt-0.5">{data.restockRecommendation}</p>
                </div>
              </div>
            </div>

            {/* Deadstock Liquidation Playbook if applicable */}
            {playbook && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>{playbook.isDeadstock ? 'Deadstock Liquidation Playbook (Pencairan Modal)' : 'Optimasi Perputaran Stok'}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded bg-slate-50 p-2.5 border border-slate-100">
                    <span className="font-semibold text-slate-700">Saran Diskon Clearance:</span>
                    <p className="mt-1 text-rose-600 font-bold">{playbook.clearanceDiscountSuggested || 'N/A'}</p>
                  </div>
                  <div className="rounded bg-slate-50 p-2.5 border border-slate-100">
                    <span className="font-semibold text-slate-700">Taktik Flash Sale Shopee:</span>
                    <p className="mt-1 text-slate-600">{playbook.flashSaleStrategy || 'Gunakan promo puncak'}</p>
                  </div>
                </div>

                {playbook.bundlingIdea && (
                  <div className="rounded bg-slate-50 p-2.5 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">Ide Bundling / Kombo Hemat:</span>
                    <p className="mt-1 text-slate-600">{playbook.bundlingIdea}</p>
                  </div>
                )}

                {playbook.actionSteps && playbook.actionSteps.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-700">Langkah Aksi:</span>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                      {playbook.actionSteps.map((step, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Task Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{taskMsg || 'Buat tugas untuk melacak proses eksekusi tim.'}</span>
              <button
                type="button"
                onClick={handleCreateRestockTask}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                <PackagePlus className="h-3.5 w-3.5" />
                <span>Buat Tugas Restock / Likuidasi</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
