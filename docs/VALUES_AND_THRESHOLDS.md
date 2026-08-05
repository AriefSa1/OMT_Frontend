# Nilai, label, dan cache yang bisa diubah (frontend)

Ini murni presentasi — mengubah semuanya di halaman ini **tidak mengubah angka dari
backend**, hanya cara angka itu diberi label/warna/format. Untuk mengubah nilainya
sendiri, lihat `backend/docs/API_REFERENCE.md` dan `backend/docs/VALUES_AND_THRESHOLDS.md`.

## Label & warna status (`components/StatusBadge.jsx`)

`STATUS_STYLES` (baris 3-9) — warna per status yang dikirim backend (`Segar`, `Tertunda`,
`Perlu Koneksi`, `Gagal`, `Tidak Tersedia`). **Kelima nilai ini harus sama persis dengan
`STATUS` di `backend/src/services/snapshotService.js:9-15`** — kalau backend menambah
status baru, tambahkan juga di sini atau badge-nya akan jatuh ke default `Tidak Tersedia`.

`formatSource()` (baris 18-29) — peta kode sumber (`SHOPEE_SNAPSHOT`, dst.) ke label
Indonesia yang tampil. Sama, harus sinkron dengan `SOURCE` di `snapshotService.js:17-22`
dan string `source` yang dipakai `optimizationService`/`growthIntelligenceService`
(`KATALOG_SHOPEE`, `IKLAN_SHOPEE`, `GUDANG`).

`formatDataTime()` (baris 11-16) — format tanggal/jam. Locale `id-ID`,
`dateStyle: 'medium', timeStyle: 'short'` → ubah di sini untuk format lain.

## Label prioritas rekomendasi/task

Muncul di **dua tempat terpisah** yang harus tetap sinkron manual (tidak dibagi lewat
modul bersama — ini duplikasi yang sengaja dibiarkan kecil karena scope-nya beda: satu
untuk warna Tailwind, keduanya untuk label):
- `components/RecommendationList.jsx:10-16` — `PRIORITY_STYLES`, `PRIORITY_LABELS`
  (dipakai `RecommendationList`, jadi otomatis dipakai `/actions`, `/growth`,
  `/optimization/*` lewat komponen bersama itu)
- `app/actions/page.jsx:13-21` — `STATUS_LABELS` (status task: `PROPOSED`→"Usulan", dst.),
  `PRIORITY_STYLES` versi lokal untuk tabel task mentah di halaman yang sama

Nilai `priority` yang valid (`HIGH`/`MEDIUM`/`LOW`) dan `status` task
(`PROPOSED`/`APPROVED`/`IN_PROGRESS`/`COMPLETED`/`SKIPPED`) didefinisikan di backend
(`taskService.TASK_STATUS`) — jangan menambah nilai baru di frontend tanpa menambah juga
di backend, task dengan status tak dikenal akan gagal validasi saat disimpan.

## Kategori mutasi stok gudang berjalan

`components/WarehouseTeamOverview.jsx:8-11` — `ONGOING_LABELS` (`restock`→ikon truk,
`return`→ikon panah putar). Backend hanya mengirim kategori yang benar-benar ada isinya
(lihat `backend/docs/API_REFERENCE.md` § `/warehouse/team-overview`) — kategori baru yang
belum ada di map ini masih tampil (fallback ke `Boxes` + nama mentah), jadi menambah
kategori baru di sini murni kosmetik, tidak wajib.

## Form Pengaturan

`app/settings/page.jsx:10-20` — `EMPTY_FORM`, nilai default form sebelum data dari server
dimuat. **Harus mencakup field yang sama dengan `settingsObj` di
`backend/src/controllers/settingsController.js`** — field baru di backend perlu
ditambahkan di sini plus elemen `<input>`/`<select>` baru di form, atau tidak akan bisa
diubah lewat UI.

Pilihan interval cron (baris 280-283 di file yang sama) — `5m/15m/30m/1h` — harus sama
persis dengan key di `toCronExpression()`, `backend/src/cron/syncCron.js:6-13`.

## Format angka (`lib/utils.js`)

`formatIDR` — `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR',
maximumFractionDigits: 0 })`. `formatNumber` — `Intl.NumberFormat('id-ID')`.
`formatPercent(value, digits=2)` — default 2 desimal.

**Ketiganya mengembalikan string `'Belum tersedia'` untuk `null`/`undefined`/`''`/`NaN` —
ini bukan bug, ini kontrak.** Field dari backend yang belum terukur memang dikirim sebagai
`null` (lihat `backend/docs/VALUES_AND_THRESHOLDS.md` § Konvensi `null` vs `0`). Jangan
menulis `formatIDR(value ?? 0)` di komponen manapun — itu menyembunyikan "belum terukur"
di balik "nol".

## Cache (`lib/api.js` + `lib/queryCache.js`)

TTL per endpoint (detik) — ubah di argumen kedua pemanggilan `cached(path, ttl)` di
`lib/api.js`:

| Endpoint | TTL |
|---|---|
| `/shopee/product-performance` | 15 detik |
| `/dashboard/overview`, `/status`, `/sync/logs`, `/tasks` | 20 detik |
| Mayoritas lain (`/shopee/metrics`, `/shopee/ads`, `/shopee/session`, `/shopee/product/:id`, `/warehouse/inventory`, `/warehouse/reconciliation`, `/optimization/*`, `/growth-intelligence/overview`) | 30 detik |
| `/settings`, `/warehouse/team-overview`, `/shopee/traffic-sources` | 60 detik |
| `/ai/daily-briefing` | **600 detik (10 menit)** — sengaja jauh lebih lama karena kuota Gemini terbatas 20/hari, lihat `backend/docs/AI_SERVICE.md` |

Menurunkan TTL membuat data lebih segar tapi lebih sering menembak backend (dan untuk
endpoint live-read, menembak Shopee/gudang langsung) — jangan turunkan `/ai/daily-briefing`
tanpa membaca alasan kuota di atas.
