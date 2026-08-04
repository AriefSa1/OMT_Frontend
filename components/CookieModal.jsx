'use client';

import React, { useEffect, useState } from 'react';
import { Cookie, Key, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { updateShopeeCookie } from '../lib/api';

export default function CookieModal({ isOpen, onClose, currentSession, onSaveSuccess }) {
  const [rawCookie, setRawCookie] = useState('');
  const [storeName, setStoreName] = useState(currentSession?.storeName || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setRawCookie('');
    setStoreName(currentSession?.storeName || '');
    setResult(null);
  }, [isOpen, currentSession?.storeName]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await updateShopeeCookie(rawCookie, storeName);
    setLoading(false);
    setResult(res);

    if (res.success && onSaveSuccess) {
      setTimeout(() => {
        onSaveSuccess();
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card rounded-4xl max-w-xl w-full p-7 shadow-cute-lg relative border-2 border-pink-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-pink-100/60 flex items-center justify-center text-pink-600 hover:bg-pink-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-2xl gradient-btn-pink flex items-center justify-center text-white shadow-md">
            <Cookie className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
              Shopee Store Session & API Vault <Sparkles className="w-4 h-4 text-pink-500" />
            </h3>
            <p className="text-xs text-slate-500 font-medium">Input active Seller Center cookies to connect live store metrics</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Store Identifier Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm font-semibold"
              placeholder="e.g. Official Store"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
              <span>Raw Shopee Cookie String</span>
              <span className="text-[10px] text-pink-500 font-normal lowercase">Requires a session token and CTOKEN or SPC_CDS</span>
            </label>
            <textarea
              rows={4}
              value={rawCookie}
              onChange={(e) => setRawCookie(e.target.value)}
              placeholder="Paste raw HTTP headers cookie string here: SPC_EC=...; SPC_ST=...; SPC_SI=..."
              className="w-full p-4 rounded-2xl bg-white/80 border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-400 text-xs font-mono text-slate-700"
              required
            />
          </div>

          <div>
          </div>

          {result && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start space-x-2 ${
              result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {result.success
                    ? 'Shopee session connected and product data synchronized.'
                    : (result.message || result.error || 'Seller Center could not validate this cookie.')}
                </p>
                {result.analysis?.missingTokens?.length > 0 && (
                  <p className="mt-1 font-mono text-[11px]">
                    Missing: {result.analysis.missingTokens.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-pink-100/50 hover:bg-pink-100 text-pink-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold gradient-btn-pink text-white flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? 'Validating & Connecting...' : 'Save & Connect Live Store'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
