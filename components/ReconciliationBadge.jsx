'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ReconciliationBadge({ status, variance }) {
  if (status === 'MATCHED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
        Synced (0)
      </span>
    );
  }

  if (status === 'CRITICAL') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 animate-pulse">
        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
        Critical ({variance > 0 ? `+${variance}` : variance})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
      Variance ({variance > 0 ? `+${variance}` : variance})
    </span>
  );
}
