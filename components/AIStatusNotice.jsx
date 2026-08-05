'use client';

import Link from 'next/link';
import { Settings, TriangleAlert } from 'lucide-react';

/**
 * Shown in place of an AI panel's results whenever the response is not a live model
 * result. Previously these panels rendered canned advice for the unconfigured case,
 * which was indistinguishable on screen from real analysis.
 *
 * Pass the whole response object; it reads `provider` and `message`.
 */
export default function AIStatusNotice({ result, className = '' }) {
  if (!result || result.success) return null;

  const provider = result.provider;
  const message = result.message || result.error || 'Permintaan AI tidak berhasil.';
  const needsKey = provider === 'NOT_CONFIGURED';

  return (
    <div className={`rounded-md border border-slate-200 bg-slate-50 p-4 ${className}`} role="status">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">
            {needsKey
              ? 'Fitur AI belum dikonfigurasi'
              : provider === 'MISSING_INPUT'
                ? 'Data masukan belum lengkap'
                : 'Analisis AI tidak tersedia'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{message}</p>
          {needsKey && (
            <Link
              href="/settings"
              className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Buka Pengaturan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
