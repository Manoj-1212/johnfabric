#!/usr/bin/env bash
# =============================================================================
#  redeploy.sh — Pull latest code and restart services (use after git push)
# =============================================================================
set -euo pipefail

APP_DIR="/home/ubuntu/johnfabric"
VENV_DIR="${APP_DIR}/backend/.venv"

echo "[1/4] Pulling latest code..."
cd "${APP_DIR}"
git pull origin main

echo "[2/4] Backend deps + restart..."
cd "${APP_DIR}/backend"
"${VENV_DIR}/bin/pip" install --quiet -r requirements.txt
sudo systemctl restart johnfabric-backend

echo "[3/4] Frontend build + restart..."
cd "${APP_DIR}/frontend"
npm ci --silent
npm run build
sudo systemctl restart johnfabric-frontend

echo "[4/4] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Redeploy complete."
echo "  Backend  → $(sudo systemctl is-active johnfabric-backend)"
echo "  Frontend → $(sudo systemctl is-active johnfabric-frontend)"
