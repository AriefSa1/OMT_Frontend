# Siapa memanggil endpoint apa, dan cara mengubah tampilannya

Peta lengkap: fungsi `lib/api.js` → endpoint backend → halaman/komponen yang memanggilnya.
Untuk arti tiap field respons, lihat `backend/docs/API_REFERENCE.md` (satu sumber
kebenaran — jangan didokumentasikan ulang di sini, cukup dirujuk).

**Aturan umum untuk mengubah tampilan sebuah angka/teks dari API**: field itu SUDAH
dihitung oleh backend. Untuk mengubah *nilainya*, edit backend (lihat referensi di atas).
Untuk mengubah *cara tampilnya saja* (format rupiah, label, warna badge), edit di
frontend — lihat `VALUES_AND_THRESHOLDS.md`.

## `lib/api.js` → endpoint → pemakai

| Fungsi | Endpoint | Dipakai di |
|---|---|---|
| `fetchDashboardOverview` | `GET /dashboard/overview` | `app/page.jsx` |
| `fetchSyncLogs` | `GET /sync/logs` | `app/page.jsx`, `app/settings/page.jsx` |
| `fetchTrafficSources` | `GET /shopee/traffic-sources` | `app/page.jsx` → `components/TrafficSourcePanel.jsx` |
| `fetchConnectionStatus` | `GET /status` | `components/Navbar.jsx`, `app/settings/page.jsx` |
| `triggerFullSync` | `POST /sync/run` | `components/Navbar.jsx` (tombol "Sync") |
| `fetchShopeeSession` | `GET /shopee/session` | **Tidak dipakai** (diverifikasi 2026-08-05, nol importer) |
| `fetchShopeeCatalog` | `GET /shopee/metrics` | `app/shopee/page.jsx` |
| `fetchProductDetail` | `GET /shopee/product/:id` | `app/shopee/page.jsx`, `app/product/[id]/page.jsx` |
| `updateProductEconomics` | `PUT /shopee/product/:id/economics` | `app/product/[id]/page.jsx` |
| `updateShopeeCookie` | `POST /shopee/cookie` | `app/settings/page.jsx` |
| `triggerShopeeSync` | `POST /shopee/sync` | `app/shopee/page.jsx`, `app/shopee/performance/page.jsx` |
| `fetchShopeeAds` | `GET /shopee/ads` | `app/ads/page.jsx` |
| `fetchShopeeProductPerformance` | `GET /shopee/product-performance` | `app/shopee/performance/page.jsx` |
| `fetchConnectionStatus` | `GET /status` | (lihat di atas) |
| `fetchWarehouseInventory` | `GET /warehouse/inventory` | `app/warehouse/page.jsx` |
| `fetchWarehouseTeamOverview` | `GET /warehouse/team-overview` | `app/warehouse/page.jsx` → `components/WarehouseTeamOverview.jsx` |
| `fetchWarehouseProductDetail` | `GET /warehouse/inventory/:sku` | `components/WarehouseDetailModal.jsx` |
| `fetchWarehouseProductHistory` | `GET /warehouse/inventory/:sku/history` | **Tidak dipakai** — `WarehouseDetailModal` sudah mendapat riwayat mutasi lewat `fetchWarehouseProductDetail` |
| `fetchReconciliation` | `GET /warehouse/reconciliation` | **Tidak dipakai** — halaman gudang membaca rekonsiliasi lewat `item.reconciliation` di dalam `fetchWarehouseInventory` |
| `triggerWarehouseSync` | `POST /warehouse/sync` | `app/warehouse/page.jsx` |
| `fetchTasks` | `GET /tasks` | `app/actions/page.jsx` |
| `createTask` | `POST /tasks` | `components/RecommendationList.jsx` (dipakai 4 halaman: actions, growth, optimization/*) |
| `updateTaskStatus` | `PATCH /tasks/:id` | `app/actions/page.jsx` |
| `fetchProductOptimizations` | `GET /optimization/products` | `app/optimization/product/page.jsx` |
| `fetchStoreOptimizations` | `GET /optimization/store` | `app/optimization/store/page.jsx` |
| `fetchAdsOptimizations` | `GET /optimization/ads` | `app/optimization/ads/page.jsx` |
| `fetchGrowthIntelligence` | `GET /growth-intelligence/overview` | `app/growth/page.jsx` |
| `fetchMarketplaceIntelligence` | `GET /optimization/marketplace-intelligence` | **Tidak dipakai** — endpoint backend real (lihat `backend/docs/API_REFERENCE.md`), belum ada panel UI (lihat `AGENTS.md` § Remaining) |
| `fetchCompetitorIntelligence` / `refreshCompetitorIntelligence` | `GET`/`POST /optimization/competitor-intelligence` | `app/product/[id]/page.jsx` |
| `applyOptimizationAction` | `POST /optimization/apply` | **Tidak dipakai** — `RecommendationList.jsx` membuat task lewat `createTask` langsung, bukan lewat `applyOptimizationAction` |
| `generateAIABCopy` | `POST /ai/ab-copy` | `components/ProductABCopywriter.jsx` |
| `fetchAIPredictiveRestock` | `POST /ai/predictive-restock` | `components/ProductRestockPredictor.jsx` |
| `simulateAIDynamicPricing` | `POST /ai/pricing-simulator` | `components/ProductPricingSimulator.jsx` |
| `fetchAIDailyBriefing` / `refreshAIDailyBriefing` | `GET /ai/daily-briefing` | `components/DailyBriefingCard.jsx` |
| `optimizeAIAdsKeywords` | `POST /ai/ads-keyword-optimization` | `components/AdsAIOptimizerCard.jsx` |

**Untuk fitur AI khususnya** — retry, kuota, `errorCode` — lihat
`docs/explain-ai.js` (`npm run docs:ai`) dan `backend/docs/AI_SERVICE.md`.

## Caching (`lib/queryCache.js`)

Semua fungsi `fetchXxx` GET di atas (kecuali yang ditandai "Live-only" di
`API_REFERENCE.md` backend, dan kecuali `fetchAIDailyBriefing`) dibungkus `cached(path,
ttl)` — TTL berbeda-beda per endpoint (20–60 detik untuk snapshot, 10 menit khusus untuk
`fetchAIDailyBriefing` karena kuota Gemini terbatas). Cache di-invalidasi otomatis setelah
mutasi (`invalidateSnapshotCache(prefix)`) — misal `saveSettings` sukses membersihkan
seluruh cache, `createTask` sukses membersihkan cache `/tasks`.

**Kalau menambah fetch otomatis baru (fetch saat komponen mount, bukan menunggu klik)** —
selalu bungkus dengan `cached()`. `DailyBriefingCard` dulu tidak melakukan ini dan menembak
kuota Gemini setiap kunjungan dashboard — lihat `AGENTS.md` § AI feature.

## Halaman & komponen yang tidak memanggil API sendiri

Komponen presentasi murni, menerima data lewat props dari halaman pemanggilnya:
`MetricCard`, `PageHeader`, `EmptyState`, `StatusBadge`, `Pagination`, `CategoryPieChart`,
`SalesChart`, `TrafficSourcePanel`, `WarehouseTeamOverview`, `RecommendationList`,
`AIStatusNotice`. Untuk mengubah bagaimana sebuah angka ditampilkan (bukan nilainya),
biasanya di sinilah tempatnya.
