'use client';

import React from 'react';
import Link from 'next/link';
import { 
  X, 
  ShoppingBag, 
  Tag, 
  Boxes, 
  TrendingUp, 
  Eye, 
  ShoppingCart, 
  Sparkles, 
  Layers,
  Star,
  CheckCircle2,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { formatIDR, formatNumber } from '../lib/utils';

export default function ProductDetailModal({ isOpen, onClose, product }) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-4xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-7 shadow-cute-lg relative border-2 border-pink-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-pink-100/80 flex items-center justify-center text-pink-600 hover:bg-pink-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Grid: Image + Main Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-pink-100">
          <div className="w-full h-52 sm:h-full rounded-3xl overflow-hidden bg-pink-50 relative border border-pink-200">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.hasDiscount && (
              <span className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                Flash Sale Active
              </span>
            )}
          </div>

          <div className="sm:col-span-2 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-pink-600 mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{product.category}</span>
              </div>
              <h2 className="text-xl font-black text-slate-800 leading-snug">{product.name}</h2>
              <p className="text-xs font-mono font-bold text-pink-500 mt-1">Item ID: {product.shopeeItemId} | SKU: {product.sku}</p>
            </div>

            {/* Price & Rating */}
            <div className="flex items-baseline space-x-3">
              <span className="text-2xl font-black text-pink-600">
                {product.priceMin && product.priceMax && product.priceMin !== product.priceMax
                  ? `${formatIDR(product.priceMin)} - ${formatIDR(product.priceMax)}`
                  : formatIDR(product.price)}
              </span>
              <span className="inline-flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mr-1" />
                {product.rating} Rating
              </span>
            </div>

            {/* Key KPI Badges */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-pink-50/80 p-2.5 rounded-2xl border border-pink-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Stock</span>
                <p className="text-sm font-black text-slate-800">{formatNumber(product.stock)} Units</p>
              </div>
              <div className="bg-rose-50/80 p-2.5 rounded-2xl border border-pink-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Units Sold</span>
                <p className="text-sm font-black text-rose-600">{formatNumber(product.salesCount)} Sold</p>
              </div>
              <div className="bg-purple-50/80 p-2.5 rounded-2xl border border-pink-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Impressions</span>
                <p className="text-sm font-black text-purple-600">{formatNumber(product.views)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Variations Section (model_list) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-500" />
              Product Variations (model_list) ({product.variations?.length || 0} Models)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Real variant stock & sales breakdown</span>
          </div>

          {product.variations && product.variations.length > 0 ? (
            <div className="overflow-x-auto rounded-3xl border border-pink-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-pink-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-pink-100">
                    <th className="py-3 px-3">Variant Model</th>
                    <th className="py-3 px-3">Variant SKU</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Available Stock</th>
                    <th className="py-3 px-3 text-right">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100/60 text-xs font-semibold">
                  {product.variations.map((model) => (
                    <tr key={model.id} className="hover:bg-pink-50/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          {model.imageUrl && (
                            <img src={model.imageUrl} alt={model.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-pink-200" />
                          )}
                          <span className="font-bold text-slate-800">{model.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{model.sku || '-'}</td>
                      <td className="py-3 px-3 font-bold text-pink-600">
                        {model.promotionPrice && model.originPrice && model.promotionPrice !== model.originPrice ? (
                          <div>
                            <span>{formatIDR(model.promotionPrice)}</span>
                            <span className="text-[10px] text-slate-400 line-through block font-normal">{formatIDR(model.originPrice)}</span>
                          </div>
                        ) : (
                          formatIDR(model.originPrice || product.price)
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          model.stock <= 10 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {formatNumber(model.stock)} units
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {formatNumber(model.soldCount)} sold
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-pink-50/50 text-center text-xs font-semibold text-slate-500 border border-pink-100">
              This product does not have sub-model variations configured.
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="mt-6 pt-5 border-t border-pink-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Buka halaman detail untuk AI Copywriter, Pricing Simulator, & Restock Playbook.</span>
          <Link
            href={`/product/${product.shopeeItemId}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-cute hover:bg-rose-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Buka AI Analytics Suite Lengkap</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
