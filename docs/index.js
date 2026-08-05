/**
 * Index dokumentasi frontend — jalankan tanpa argumen untuk daftar lengkap.
 *
 *   npm run docs
 */
const DOCS = [
  { file: 'docs/ARCHITECTURE.md', desc: 'Alur data, struktur app/components/lib, konvensi status kosong' },
  { file: 'docs/API_CONSUMERS.md', desc: 'Fungsi lib/api.js -> endpoint backend -> halaman/komponen pemakai' },
  { file: 'docs/VALUES_AND_THRESHOLDS.md', desc: 'Label, warna, format angka, TTL cache dan lokasinya' },
  { file: 'docs/explain-ai.js (npm run docs:ai)', desc: 'Fitur AI: komponen, kuota, cara mengubah' },
  { file: 'AGENTS.md', desc: 'Panduan repo: konvensi, constraint data, riwayat pekerjaan' },
  { file: '../backend/docs/API_REFERENCE.md', desc: 'Arti tiap field respons endpoint (sumber kebenaran)' },
];

console.log('\n== Dokumentasi frontend ==\n');
for (const { file, desc } of DOCS) console.log(`  ${file}\n    ${desc}\n`);
console.log('Ringkasan cepat fitur AI di terminal: npm run docs:ai');
console.log('');
