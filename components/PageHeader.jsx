'use client';

export default function PageHeader({ title, description, actions, children }) {
  return (
    <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}
