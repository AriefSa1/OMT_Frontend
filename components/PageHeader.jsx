'use client';

export default function PageHeader({ title, description, actions, children }) {
  return (
    <section className="page-header flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="page-header-title text-xl font-bold tracking-[-0.035em] text-slate-950 sm:text-3xl">{title}</h1>
        {children && <div className="page-header-children">{children}</div>}
        {description && <p className="page-header-description mt-1 max-w-3xl text-[13px] leading-5 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}
