# Deploy Frontend ke Hostinger (aman, anti chunk-404)

## Kenapa dokumen ini ada
Pernah muncul di produksi: `GET /_next/static/chunks/app/login/page-<hash>.js 404`
→ `ChunkLoadError` → React error #423. Ini **bukan bug kode**, tapi **deploy tidak sinkron**:
HTML yang disajikan merujuk hash build lain daripada file `_next/static` yang ada di server.

**Penyebab utama:** `next build` dijalankan **menimpa `.next`** sementara `next start` lama
masih menyajikannya → build campur/parsial. Diperparah **cache LiteSpeed** yang menyimpan
HTML lama.

**Aturan emas:** *stop app → build bersih → start app → purge cache.* Jangan pernah build
di atas server yang sedang jalan pada folder `.next` yang sama.

---

## Cara A — SSH (paling andal)
Dari folder aplikasi frontend di server:
```bash
bash deploy.sh
```
Skrip melakukan: git sync `prod` → **stop app** → `npm ci` → `rm -rf .next` → `npm run build`
→ **start/restart app**. Sesuaikan mekanisme restart lewat env bila perlu:
```bash
# PM2:
PM2_APP=omt-frontend bash deploy.sh
# Restart kustom (mis. perintah panel):
RESTART_CMD="mkdir -p tmp && touch tmp/restart.txt" bash deploy.sh
# File sudah dideploy panel, cuma mau build+restart:
PULL=0 bash deploy.sh
```
Lalu **purge cache** (lihat bawah) + hard refresh.

## Cara B — hPanel (Git / Node app manager)
Kalau pakai auto-deploy panel, pastikan urutannya tetap aman:
1. **Hentikan** Node app dulu (tombol Stop di Node.js app manager) — jangan build saat running.
2. Deploy/pull file, jalankan **Run `npm ci`** lalu **Run `npm run build`** (build command).
3. **Start** app lagi.
4. **Purge cache** + hard refresh.

> Kalau panel build in-place tanpa bisa stop dulu, pakai **Cara A (SSH)** yang menjamin urutan.

---

## Purge cache (wajib tiap deploy)
- hPanel → **Cache Manager / LiteSpeed Cache** → **Purge All** untuk domain `94media.art`.
- Disarankan: **matikan cache HTML LiteSpeed untuk app Node ini** (ini aplikasi dinamis; HTML
  tak boleh di-cache statis). Aset `_next/static` aman di-cache lama karena namanya ber-hash.

---

## Verifikasi cepat sesudah deploy
1. Hard refresh `Ctrl+Shift+R`.
2. Buka `/login` → DevTools **Network** → pastikan `_next/static/chunks/app/login/page-*.js`
   **status 200** dan hash-nya cocok dengan yang dirujuk HTML.
3. Lanjut ke `DEPLOY_CHECKLIST.md` (di root repo) untuk verifikasi fitur.

---

## Opsi lanjutan — zero-downtime (rilis ber-folder)
Kalau ingin tanpa downtime, deploy ke folder rilis baru lalu tukar symlink:
```bash
REL="releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "$REL" && rsync -a --exclude node_modules --exclude .next ./ "$REL/"
cd "$REL" && npm ci && npm run build
ln -sfn "$REL" ../../current      # arahkan 'current' ke rilis baru (atomik)
# restart app yang menunjuk ke ../../current, lalu purge cache
```
Ini menghindari jendela "app mati" pada Cara A, dengan trade-off setup lebih rumit.
