# Upgrade Next.js 14 → 15 (menutup high-severity vuln)

> Tujuan: menutup advisory `next` + `postcss` (DoS/SSRF/cache-poisoning) yang hanya
> ter-fix di Next 15/16. **JANGAN `npm audit fix --force`** (memaksa next@16, breaking parah).
> Target: **Next 15 (stabil)** — lompatan paling kecil yang menutup vuln.

## ✅ STATUS: SELESAI (branch `chore/next15-upgrade`, 2026-08-11)

Terpasang & build hijau (22/22 route), `npm audit` = **0 vulnerabilities**, `/login`
render bersih tanpa error console (tak ada hydration mismatch React 19).

Versi final: `next@15.5.23`, `react@19.2.8`, `react-dom@19.2.8`, `lucide-react@1.31.0`,
`recharts@2.15.4` (tetap 2.x — kompatibel React 19, **tak perlu** naik ke recharts 3).

**Temuan penting (premis awal ternyata usang):** upgrade ke Next 15 menutup vuln *kode Next
sendiri* (DoS/SSRF/cache-poisoning dari Next 14), TETAPI muncul advisory **baru** (CVE-2026-*)
di dependensi transitif yang di-bundle Next — **postcss** (XSS/path-traversal via
sourceMappingURL) & **sharp/libvips** — yang menurut `npm audit` hanya tuntas di next@16
(breaking). Solusi tanpa naik ke Next 16: **`overrides`** di `package.json` memaksa versi
patched (`postcss` → 8.5.26 via `$postcss`, `sharp` → 0.35.3). Hasil akhir 0 vuln.

**Yang MASIH perlu dilakukan (runtime, hanya bisa dengan sesi login):**
1. Uji visual SEMUA chart recharts saat login (SalesChart, AdsTrendChart, CategoryPieChart,
   ProductOverviewPanel, MarketplacePerformancePanel) — React 19 paling mungkin memengaruhi ini.
2. Buka semua halaman terproteksi & cek Console (#418/#423 hydration).
3. Setelah lolos: merge ke `dev` → deploy + **REBUILD Hostinger** + purge cache (DEPLOY_HOSTINGER.md).

> Rencana asli di bawah tetap dipertahankan sebagai catatan proses.

---


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
