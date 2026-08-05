import Link from 'next/link';
import { ArrowRight, Megaphone, Package, Store } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const SECTIONS = [
  {
    href: '/optimization/product',
    title: 'Optimasi produk',
    description: 'Rekomendasi listing dari snapshot katalog: CTR rendah, hambatan checkout, dan risiko kehabisan stok.',
    icon: Package,
  },
  {
    href: '/optimization/store',
    title: 'Optimasi toko',
    description: 'Rekomendasi operasional dari rekonsiliasi stok Shopee dan gudang.',
    icon: Store,
  },
  {
    href: '/optimization/ads',
    title: 'Optimasi iklan',
    description: 'Rekomendasi kampanye dari snapshot iklan: CTR rendah dan ROAS di bawah ambang.',
    icon: Megaphone,
  },
];

export default function OptimizationHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimasi"
        description="Tiga sudut pandang atas snapshot yang sama. Rekomendasi hanya muncul bila metriknya tersimpan; sistem tidak membuat perubahan otomatis ke Seller Center."
        actions={<Link href="/actions" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Pusat Tindakan</Link>}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SECTIONS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="surface flex flex-col justify-between p-5 transition-colors hover:border-rose-200 hover:bg-rose-50/40">
            <div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></span>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">Buka <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
