'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function CategoryPieChart({ data = [] }) {
  const COLORS = ['#f472b6', '#f43f5e', '#fb7185', '#fda4af', '#e879f9'];

  return (
    <div className="glass-card rounded-3xl p-6 shadow-cute flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-800">Fashion Category Mix</h3>
        <p className="text-xs text-slate-400 font-medium">Sales breakdown by product line</p>
      </div>

      <div className="h-52 my-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={6}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} cornerRadius={8} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) => [`${val}%`, 'Share']}
              contentStyle={{ background: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #fbcfe8' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-pink-600">100%</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Share</span>
        </div>
      </div>

      <div className="space-y-2 mt-2">
        {data.map((cat, idx) => (
          <div key={cat.name} className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || COLORS[idx] }} />
              <span className="text-slate-600">{cat.name}</span>
            </div>
            <span className="text-slate-800 font-bold">{cat.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
