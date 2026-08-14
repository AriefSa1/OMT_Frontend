'use client';

import { useMemo, useState } from 'react';
import { Calculator, CircleAlert, Target } from 'lucide-react';
import { formatIDR, formatPercent } from '../lib/utils';

function parseAmount(value) {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function hasMeasuredAmount(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function AmountField({ label, value, onChange, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <span className="relative mt-1 block">
        <span className="pointer-events-none absolute left-3 top-2.5 text-xs font-semibold text-slate-400">Rp</span>
        <input type="number" min="0" step="1000" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Belum diisi" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none" />
      </span>
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span>}
    </label>
  );
}

export default function AdsAIOptimizerCard({ adsData }) {
  const campaigns = Array.isArray(adsData?.topCampaigns) ? adsData.topCampaigns : [];
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]?.name || 'Semua kampanye');
  const [hpp, setHpp] = useState('');
  const [revenue, setRevenue] = useState('');
  const [adminFee, setAdminFee] = useState('');

  const effectiveSelectedCampaign = campaigns.some((item) => item.name === selectedCampaign)
    ? selectedCampaign
    : campaigns[0]?.name || selectedCampaign;
  const campaign = campaigns.find((item) => item.name === effectiveSelectedCampaign) || {
    name: selectedCampaign,
    spend: adsData?.totalSpend,
    sales: adsData?.totalSalesGenerated,
    roas: adsData?.roas,
  };

  const calculation = useMemo(() => {
    const measuredSpend = Number(campaign?.spend);
    const hppValue = parseAmount(hpp);
    const revenueValue = parseAmount(revenue);
    const adminFeeValue = parseAmount(adminFee);
    if (hppValue === null || revenueValue === null || adminFeeValue === null || !hasMeasuredAmount(campaign?.spend)) return null;
    const contributionBeforeAds = revenueValue - hppValue - adminFeeValue;
    const profitAfterAds = contributionBeforeAds - measuredSpend;
    return {
      contributionBeforeAds,
      profitAfterAds,
      marginPercent: revenueValue > 0 ? (profitAfterAds / revenueValue) * 100 : null,
      breakEvenRoas: contributionBeforeAds > 0 ? revenueValue / contributionBeforeAds : null,
      profitable: profitAfterAds >= 0,
    };
  }, [campaign, hpp, revenue, adminFee]);

  const measuredSpendAvailable = hasMeasuredAmount(campaign?.spend);

  return (
    <section className="surface overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 text-white"><Calculator className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Kalkulator Profit Iklan</h2>
            <p className="text-xs text-slate-500">Uji apakah penjualan masih untung setelah HPP, biaya admin, dan biaya iklan terukur.</p>
          </div>
        </div>
        {campaigns.length > 0 && (
          <select value={effectiveSelectedCampaign} onChange={(event) => { const next = event.target.value; setSelectedCampaign(next); const selected = campaigns.find((item) => item.name === next); setRevenue(Number.isFinite(Number(selected?.sales)) ? String(selected.sales) : ''); }} aria-label="Pilih kampanye untuk kalkulator profit" className="ui-select h-9 max-w-64 truncate rounded-md px-2 text-xs font-medium text-slate-700">
            {campaigns.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AmountField label="HPP total" value={hpp} onChange={setHpp} hint="Total harga pokok untuk omzet pada periode yang sama." />
            <AmountField label="Omzet" value={revenue} onChange={setRevenue} hint="Isi omzet produk/kampanye pada periode laporan." />
            <AmountField label="Biaya admin marketplace" value={adminFee} onChange={setAdminFee} hint="Gunakan nilai nominal, bukan persentase." />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Biaya iklan terukur</p><p className="mt-1 text-base font-semibold text-slate-900">{measuredSpendAvailable ? formatIDR(Number(campaign.spend)) : 'Belum tersedia'}</p><p className="mt-1 text-[11px] text-slate-500">Sumber: snapshot kampanye, bukan input AI.</p></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">ROAS kampanye</p><p className="mt-1 text-base font-semibold text-slate-900">{hasMeasuredAmount(campaign?.roas) ? `${Number(campaign.roas).toFixed(2)}x` : 'Belum tersedia'}</p><p className="mt-1 text-[11px] text-slate-500">ROAS saja belum membuktikan profit tanpa HPP dan biaya admin.</p></div>
          </div>
        </div>

        {!measuredSpendAvailable ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>Biaya iklan kampanye belum terukur. Kalkulasi profit tidak dibuat agar sistem tidak mengganti data yang hilang dengan nol.</p></div>
        ) : !calculation ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center"><Target className="h-7 w-7 text-slate-400" /><p className="mt-2 text-xs font-semibold text-slate-700">Lengkapi tiga nilai biaya</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Hasil dihitung langsung di browser dan tidak memakai kuota AI.</p></div>
        ) : (
          <div className={`rounded-lg border p-4 ${calculation.profitable ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${calculation.profitable ? 'text-emerald-700' : 'text-rose-700'}`}>{calculation.profitable ? 'Masih menghasilkan laba' : 'Merugi setelah biaya iklan'}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatIDR(calculation.profitAfterAds)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-slate-500">Margin bersih</p><p className="mt-0.5 font-semibold text-slate-800">{calculation.marginPercent === null ? 'Tidak dapat dihitung' : formatPercent(calculation.marginPercent)}</p></div>
              <div><p className="text-slate-500">Margin sebelum iklan</p><p className="mt-0.5 font-semibold text-slate-800">{formatIDR(calculation.contributionBeforeAds)}</p></div>
              <div><p className="text-slate-500">Batas biaya iklan</p><p className="mt-0.5 font-semibold text-slate-800">{calculation.contributionBeforeAds >= 0 ? formatIDR(calculation.contributionBeforeAds) : 'Tidak ada'}</p></div>
              <div><p className="text-slate-500">ROAS impas</p><p className="mt-0.5 font-semibold text-slate-800">{calculation.breakEvenRoas === null ? 'Tidak dapat dicapai' : `${calculation.breakEvenRoas.toFixed(2)}x`}</p></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
