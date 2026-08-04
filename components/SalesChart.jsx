'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatIDR } from '../lib/utils';

export default function SalesChart({ data = [] }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-cute border border-pink-100 text-xs">
          <p className="font-bold text-slate-700 mb-1.5">{label} Performance</p>
          <div className="space-y-1">
            <p className="text-pink-600 font-semibold">
              GMV Revenue: <span className="font-bold">{formatIDR(payload[0].value)}</span>
            </p>
            <p className="text-purple-600 font-semibold">
              Ad Spend: <span className="font-bold">{formatIDR(payload[1]?.value || 0)}</span>
            </p>
            <p className="text-emerald-600 font-semibold">
              Orders Completed: <span className="font-bold">{payload[0]?.payload?.orders} units</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-3xl p-6 shadow-cute">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-800">Shopee Sales & Ad Performance Trend</h3>
          <p className="text-xs text-slate-400 font-medium">Daily GMV vs Ad Spend comparison (7-day window)</p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-slate-600">GMV Revenue</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-slate-600">Shopee Ad Spend</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorAd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fbcfe8" opacity={0.4} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="gmv" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorGmv)" />
            <Area type="monotone" dataKey="adSpend" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#colorAd)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
