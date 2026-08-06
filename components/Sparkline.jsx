'use client';

/**
 * Grafik tren mini (sparkline) untuk satu deret nilai mingguan. Ringan, tanpa dependensi —
 * cukup SVG kecil — supaya bisa dipasang di banyak baris tanpa memberatkan seperti chart penuh.
 * Titik terakhir ditandai agar mata langsung tertuju ke kondisi terbaru.
 */
export default function Sparkline({ values = [], color = '#e11d48', width = 96, height = 30 }) {
  const nums = values.map((v) => (Number.isFinite(v) ? v : 0));
  if (nums.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const pad = 3;
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (nums.length - 1);
  const points = nums.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y];
  });
  const line = points.map((p) => p.join(',')).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const last = points[points.length - 1];
  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} role="img" aria-label="tren mingguan" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}
