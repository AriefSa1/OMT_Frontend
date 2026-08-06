'use client';

/**
 * Primitif skeleton — kerangka abu-abu ber-shimmer yang tampil selagi data dimuat.
 * Dipakai menggantikan spinner: bentuknya menyerupai konten akhir sehingga tak ada
 * "loncatan" layout saat data tiba, dan pengguna langsung paham bagian mana yang datang.
 * Kelas `.skeleton` (animasi shimmer) didefinisikan di globals.css.
 */

export function SkeletonLine({ className = '', width }) {
  return <span className={`skeleton block h-3.5 ${className}`} style={width ? { width } : undefined} />;
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SkeletonLine width="55%" className="h-2.5" />
          <SkeletonLine width="70%" className="mt-3 h-6" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <SkeletonLine width="30%" className="h-3" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLine key={c} className="flex-1" width={c === 0 ? '100%' : `${40 + ((r + c) % 3) * 15}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 2 }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <SkeletonLine width="45%" className="h-4" />
            <SkeletonLine width="90px" className="h-5 rounded-full" />
          </div>
          <SkeletonLine width="100%" className="mt-4 h-8 rounded-lg" />
          <div className="mt-3 flex gap-2">
            <SkeletonLine className="h-16 flex-1 rounded-lg" />
            <SkeletonLine className="h-16 flex-1 rounded-lg" />
            <SkeletonLine className="h-16 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonLine;
