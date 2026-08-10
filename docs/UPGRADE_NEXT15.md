# Rencana Upgrade Next.js 14 → 15 (menutup 2 high-severity vuln)

> Tujuan: menutup advisory `next` + `postcss` (DoS/SSRF/cache-poisoning) yang hanya
> ter-fix di Next 15/16. **JANGAN `npm audit fix --force`** (memaksa next@16, breaking parah).
> Target: **Next 15 (stabil)** — lompatan paling kecil yang menutup vuln.

## Kondisi saat ini
- `next ^14.2.1` (14.2.35), `react/react-dom ^18.3.1`, `recharts ^2.12.3`, `lucide-react ^0.359`, `tailwindcss ^3.4`.
- App **client-heavy** (`'use client'`), backend terpisah (Express) — bukan Route Handlers Next.
- `lib/api` sudah pakai `cache: 'no-store'`. Middleware pakai `request.cookies` (edge), bukan `cookies()`/`headers()` async.

## Penilaian risiko (khusus app ini)
| Perubahan Next 15 | Dampak di app ini | Risiko |
|---|---|---|
| **Wajib React 19** | Semua dep harus kompatibel React 19 | 🔴 **TINGGI** (dep utama) |
| `cookies()/headers()/params` jadi async | App tak pakai async server APIs; `params` di `/product/[id]` via `useParams()` (client) | 🟢 Rendah |
| Caching default berubah (fetch tak lagi di-cache) | Sudah `no-store` | 🟢 Rendah |
| Route Handlers GET tak di-cache | Tak ada Route Handlers (backend Express) | 🟢 Rendah |
| `next/font`, ESLint flat config | Perlu cek konfigurasi | 🟡 Sedang |

**Dominan risiko = React 18→19.** Yang perlu diverifikasi kompatibel React 19:
- **recharts 2.12** → mungkin peer-warning dengan React 19; **recharts 3** mendukung React 19 tapi **breaking** (API chart berubah). Uji chart (SalesChart, AdsTrendChart, CategoryPieChart, ProductOverviewPanel, MarketplacePerformancePanel).
- **lucide-react 0.359** → versi baru mendukung React 19; bump ke terbaru.
- Komponen lain umumnya aman (banyak `'use client'`).

## Langkah terkontrol (di branch terpisah, JANGAN di dev/prod dulu)
```bash
# 0. Branch isolasi + baseline
git checkout -b chore/next15-upgrade
npm run build   # pastikan baseline hijau

# 1. React 19 dulu (akar risiko), lalu cek peer deps
npm i react@19 react-dom@19
npm i lucide-react@latest
#   recharts: coba tetap di 2.x dulu; bila error React19 → naik recharts@3 (breaking, perlu migrasi chart)
npm run build   # perbaiki error yang muncul

# 2. Next 15 + codemod resmi
npm i next@15
npx @next/codemod@latest upgrade   # jalankan codemod interaktif (async params, dll)
npm run build

# 3. Verifikasi menyeluruh
npm run dev
#   buka SEMUA halaman (Beranda, Katalog, Orders, Iklan, Promosi, Gudang×3, Actions,
#   Optimasi, Growth, Settings, Admin, /product/[id], /login) — cek chart & data.
#   ikuti DEPLOY_CHECKLIST.md.

# 4. Merge & deploy setelah lolos
git checkout dev && git merge chore/next15-upgrade
#   deploy: dev → prod + REBUILD Hostinger (lihat DEPLOY_HOSTINGER.md) + purge cache.
npm audit   # konfirmasi high-vuln next/postcss hilang
```

## Titik uji kritis (paling rawan)
1. **Semua chart** (recharts) render benar — ini yang paling mungkin pecah karena React 19.
2. **Hydration** — React 19 lebih ketan soal mismatch; cek Console error #418/#423.
3. **Middleware** (`middleware.js`) tetap jalan (dev guard + prod redirect).
4. **Build produksi** hijau (22/22 route) + `next start` menyajikan chunk konsisten.

## Rollback
- Branch belum di-merge → cukup `git checkout dev` (tak ada dampak).
- Sudah ter-deploy & bermasalah → rollback deploy di panel Render/Hostinger, atau `git revert` merge-commit lalu rebuild.

## Rekomendasi
Kerjakan sebagai **effort terpisah + teruji runtime**, bukan sisipan cepat. Risiko utama (React 19 + recharts)
butuh pengujian visual tiap chart. Sementara belum diupgrade, vuln-nya **DoS/SSRF self-hosted** yang butuh
vektor spesifik — mitigasi sementara di sisi Hostinger (rate limit / WAF) bila tersedia.

*Backend hanya 3 vuln (low/moderate) — tak mendesak; bisa `npm audit` terpisah nanti.*
