# Arsitektur frontend

Next.js 14 App Router. Merender snapshot lokal yang diproduksi backend (`OMT_Backend`) —
tidak pernah bicara langsung ke Shopee/gudang. Untuk peta lengkap endpoint yang dipanggil,
lihat `API_CONSUMERS.md`.

## Alur data (satu arah)

```
app/**/page.jsx  →  lib/api.js (fetch + cache)  →  backend  →  komponen presentasi (props)
```

- **`app/`** — satu folder per rute, masing-masing berisi `page.jsx`. Ini yang memanggil
  `lib/api.js`, menyimpan state lokal (`useState`), dan meneruskan data ke komponen lewat
  props. Logika fetch tidak boleh ada di komponen — selalu di halaman atau di `lib/api.js`.
- **`components/`** — dua jenis:
  - Presentasi murni (terima data lewat props): `MetricCard`, `StatusBadge`, `EmptyState`,
    `Pagination`, `CategoryPieChart`, `SalesChart`, dll.
  - Punya fetch sendiri (untuk fitur yang dipakai lintas halaman atau butuh state
    independen): `Navbar`, `DailyBriefingCard`, `WarehouseDetailModal`,
    `ProductABCopywriter`, `ProductRestockPredictor`, `ProductPricingSimulator`,
    `AdsAIOptimizerCard`.
- **`lib/api.js`** — satu-satunya tempat `fetch()` ke backend boleh dipanggil. Menambahkan
  endpoint baru berarti menambah satu fungsi di sini, bukan `fetch` langsung di komponen.
- **`lib/queryCache.js`** — cache in-memory per-path dengan TTL + dedup permintaan yang
  sedang berjalan (`readCached`). Lihat `API_CONSUMERS.md` § Caching.
- **`lib/hooks.js`** — `useDebouncedValue` (input pencarian), `useSnapshotRefresh`
  (mendengarkan event global `snapshot:updated` yang di-dispatch `Navbar` setelah Sync
  sukses, supaya semua halaman terbuka ikut memuat ulang tanpa refresh manual).
- **`lib/utils.js`** — `formatIDR`, `formatNumber`, `formatPercent` (semuanya mengembalikan
  `'Belum tersedia'` untuk `null`/`undefined` — **jangan pernah mengganti ini dengan
  `?? 0`**, itu akan membuat angka yang belum terukur tampil seperti nol terukur).

## Autentikasi

`middleware.js` (Next.js Edge Middleware) memeriksa cookie `auth_token`; tanpa cookie,
semua rute selain `/login` di-redirect. `context/AuthContext.jsx` menyimpan token di
`localStorage` + cookie yang sama, dan `lib/api.js` menyisipkan
`Authorization: Bearer <token>` di setiap request (`getAuthHeaders()`).

## Konvensi status/empty state

Backend membedakan "belum ada data" dari "ada masalah koneksi" dari "data lama, sedang
diperbarui" lewat objek `meta` (lihat `backend/docs/ARCHITECTURE.md` § Objek meta).
Frontend **wajib** menampilkan bedanya, bukan menyeragamkan semua jadi satu tampilan
kosong:
- `StatusBadge` + `DataSourceNote` (`components/StatusBadge.jsx`) — badge warna per status
  (`Segar`/`Tertunda`/`Perlu Koneksi`/`Gagal`/`Tidak Tersedia`).
- `EmptyState` — dipakai ketika daftar benar-benar kosong, dengan `message` yang diambil
  dari backend (bukan teks generik "tidak ada data" buatan sendiri).
- Field bernilai `null` dari backend (bukan `0`) harus dirender sebagai "Belum tersedia" —
  ini otomatis lewat `formatIDR`/`formatNumber`/`formatPercent` selama komponen tidak
  melakukan `value ?? 0` sebelum memanggilnya.

## Struktur halaman saat ini

| Rute | Isi |
|---|---|
| `/` | Dashboard: KPI, tren penjualan, pembatalan/retur, sumber traffic, kategori, sync log |
| `/shopee`, `/shopee/performance` | Katalog produk, performa produk |
| `/ads` | Performa iklan Shopee |
| `/warehouse` | Inventori gudang + ringkasan tim + rekonsiliasi |
| `/product/[id]` | Detail produk: metrik, ekonomi unit, kompetitor, 3 panel AI |
| `/actions` | Pusat Tindakan: rekomendasi → task |
| `/growth` | Growth Intelligence (versi legacy dari Pusat Tindakan) |
| `/optimization`, `/optimization/{product,store,ads}` | Sama seperti actions, terfilter per sumber |
| `/settings` | Konfigurasi Shopee/gudang/Gemini/cron, status koneksi, riwayat sync |
| `/login` | Autentikasi |

## Fitur AI

Terpisah dari alur snapshot di atas — lihat `docs/explain-ai.js` (`npm run docs:ai`) dan
`backend/docs/AI_SERVICE.md`.
