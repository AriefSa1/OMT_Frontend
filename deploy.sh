#!/usr/bin/env bash
#
# Safe Next.js deploy for Hostinger (Node app).
#
# Mencegah bug "ChunkLoadError / chunk 404" yang terjadi ketika `next build`
# menimpa folder .next SAAT server lama (`next start`) masih menyajikannya —
# hasilnya build campur-aduk: HTML merujuk chunk yang tak ada di disk.
#
# Prinsip: STOP app -> build bersih -> START app. Lalu purge cache.
#
# Pemakaian (via SSH di Hostinger, dari folder aplikasi frontend):
#   bash deploy.sh
#
# Opsi lewat env var:
#   PULL=0            -> lewati git pull (kalau file sudah dideploy panel)
#   PM2_APP=nama      -> nama proses PM2 (default: omt-frontend)
#   RESTART_CMD="..." -> perintah restart kustom (menang atas deteksi otomatis)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
echo "[deploy] folder: $APP_DIR"

# 1) Ambil kode prod terbaru (bought: matikan dengan PULL=0)
if [ "${PULL:-1}" = "1" ] && [ -d .git ]; then
  echo "[deploy] git sync -> origin/prod"
  git fetch origin prod
  git checkout prod
  git reset --hard origin/prod
fi

# 2) HENTIKAN app SEBELUM build (kunci pencegah .next korup)
STOPPED_PM2=0
if command -v pm2 >/dev/null 2>&1 && pm2 describe "${PM2_APP:-omt-frontend}" >/dev/null 2>&1; then
  echo "[deploy] pm2 stop ${PM2_APP:-omt-frontend}"
  pm2 stop "${PM2_APP:-omt-frontend}" || true
  STOPPED_PM2=1
else
  echo "[deploy] PM2 app tidak terdeteksi — pastikan app dihentikan oleh panel/Passenger sebelum build."
fi

# 3) Install bersih + build bersih (fresh .next)
echo "[deploy] npm ci"
npm ci
echo "[deploy] hapus .next lama"
rm -rf .next
echo "[deploy] next build"
npm run build

# 4) START / restart app pada build BARU
if [ -n "${RESTART_CMD:-}" ]; then
  echo "[deploy] restart via RESTART_CMD"
  eval "$RESTART_CMD"
elif command -v pm2 >/dev/null 2>&1; then
  if [ "$STOPPED_PM2" = "1" ]; then
    pm2 restart "${PM2_APP:-omt-frontend}"
  else
    pm2 start npm --name "${PM2_APP:-omt-frontend}" -- start
  fi
  pm2 save || true
else
  # Phusion Passenger (default Node app Hostinger): restart via tmp/restart.txt
  mkdir -p tmp && touch tmp/restart.txt
  echo "[deploy] touch tmp/restart.txt (Passenger restart)"
fi

echo ""
echo "[deploy] SELESAI ✅"
echo "[deploy] LANGKAH TERAKHIR (manual): PURGE cache LiteSpeed/Hostinger untuk domain,"
echo "         lalu hard-refresh (Ctrl+Shift+R) dan cek /login di tab Network (chunk 200)."
