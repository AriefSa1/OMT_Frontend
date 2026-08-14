'use client';

import { LineChart } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import MarketplacePerformancePanel from '../../../components/MarketplacePerformancePanel';

export default function MarketplacePerformancePage() {
  return (
    <div className="space-y-4 animate-fade-in pb-6">
      <PageHeader
        title="Performa Marketplace"
        description="Analisis penjualan, profitabilitas, dan retur berdasarkan data gudang."
        icon={LineChart}
      />

      {/* Satu tampilan gabungan: panel Gudang (date range picker + tab kanal + ringkasan)
          dengan tabel bergaya "Detail Performa Toko" berkolom lengkap (HPP, Retur, dll). */}
      <MarketplacePerformancePanel />
    </div>
  );
}
