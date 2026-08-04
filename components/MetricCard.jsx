'use client';

export default function MetricCard({ title, value, icon: Icon, subtitle, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <section className="surface min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-600">{title}</p>
        {Icon && <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone] || tones.slate}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-4 truncate text-2xl font-semibold text-slate-900">{value}</p>
      {subtitle && <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>}
    </section>
  );
}
