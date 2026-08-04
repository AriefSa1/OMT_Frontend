'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatIDR, formatNumber } from '../lib/utils';

export default function SalesTrendChart({ data = [] }) {
  if (!data.length) return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Belum ada histori pesanan untuk ditampilkan.</div>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="day" tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={26} />
          <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
          <Tooltip contentStyle={{ border: '1px solid #e4e7ec', borderRadius: 6, fontSize: 12 }} formatter={(value, name) => [name === 'GMV' ? formatIDR(Number(value)) : formatNumber(Number(value)), name]} />
          <Line type="monotone" dataKey="gmv" name="GMV" stroke="#344054" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="adSpend" name="Biaya iklan" stroke="#d92d70" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
