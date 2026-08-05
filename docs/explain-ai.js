/**
 * Runnable explainer for the AI-facing components on this side of the app.
 *
 *   npm run docs:ai
 *
 * The backend counterpart (aiService.js internals, retry/quota behaviour) is
 * documented at ../backend/docs/AI_SERVICE.md — run `npm run docs:ai` there too.
 */

const SECTIONS = [
  {
    title: 'Komponen AI dan rute backend yang dipanggilnya',
    lines: [
      'components/DailyBriefingCard.jsx      -> GET  /api/ai/daily-briefing        (di-cache 10 menit)',
      'components/ProductABCopywriter.jsx    -> POST /api/ai/ab-copy',
      'components/ProductRestockPredictor.jsx-> POST /api/ai/predictive-restock',
      'components/ProductPricingSimulator.jsx-> POST /api/ai/pricing-simulator',
      'components/AdsAIOptimizerCard.jsx     -> POST /api/ai/ads-keyword-optimization',
      'components/AIStatusNotice.jsx         -> tampilan bersama untuk semua respons non-sukses',
    ],
  },
  {
    title: 'Bagaimana status ditentukan',
    lines: [
      'Semua 4 panel manual (bukan daily briefing) merender <AIStatusNotice result={...} />',
      'ketika result.success === false. Komponen itu membaca dua field dari backend:',
      '',
      '  result.provider   NOT_CONFIGURED | MISSING_INPUT | ERROR | REAL_GEMINI_API',
      '  result.errorCode  hanya ada saat provider === "ERROR", mis. RATE_LIMITED',
      '',
      'RATE_LIMITED/UNAVAILABLE ditampilkan sebagai "Kuota Gemini API sedang penuh" —',
      'bukan "Analisis AI tidak tersedia" — karena itu bukan kegagalan permanen dan',
      'sistem sudah mencoba ulang otomatis di backend sebelum menyerah.',
    ],
  },
  {
    title: 'Kuota Gemini — jangan tambah pemanggilan otomatis baru',
    lines: [
      'Free tier kunci ini hanya 20 permintaan/hari. Empat panel di atas sudah aman:',
      'semuanya menunggu klik pengguna (tidak fetch otomatis saat mount).',
      '',
      'DailyBriefingCard dulu TIDAK aman — ia fetch di setiap mount tanpa cache,',
      'sehingga sekadar membuka dashboard berkali-kali bisa menghabiskan kuota harian',
      'sendirian. Sekarang fetchAIDailyBriefing() di lib/api.js pakai cache 10 menit;',
      'tombol "Muat ulang" memanggil refreshAIDailyBriefing() untuk melewati cache itu.',
      '',
      'Kalau menambah panel AI baru yang fetch otomatis saat mount, bungkus fetch-nya',
      'dengan cached() dari lib/queryCache.js — jangan biarkan telanjang seperti dulu.',
    ],
  },
  {
    title: 'Cara mengubah sesuatu',
    lines: [
      '- Ubah teks/tampilan saat gagal    -> components/AIStatusNotice.jsx',
      '- Ubah cara satu panel memanggil AI -> lib/api.js (fungsi generateAIABCopy dkk.)',
      '- Ubah field yang dikirim ke backend -> objek yang dibangun di handleGenerate/',
      '                                        handlePredict/runSimulation/handleOptimize',
      '                                        di masing-masing komponen di atas',
      '- Ubah lama cache daily briefing    -> angka TTL di fetchAIDailyBriefing() (lib/api.js)',
    ],
  },
];

for (const section of SECTIONS) {
  console.log('');
  console.log(`== ${section.title} ==`);
  console.log('-'.repeat(section.title.length + 6));
  for (const line of section.lines) console.log(line ? `  ${line}` : '');
}

console.log('');
console.log('Sisi backend: backend/docs/AI_SERVICE.md (jalankan npm run docs:ai di sana juga)');
console.log('');
