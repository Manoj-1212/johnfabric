#!/usr/bin/env bash
# =============================================================================
#  deploy-frontend.sh — Re-run only the frontend steps (6 + 7 of deploy-ec2.sh)
#  Use this when the full deploy stopped at Step 6.
#  USAGE: ./deploy-frontend.sh   (run from ~/johnfabric on EC2)
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

APP_USER="ubuntu"
APP_DIR="/home/${APP_USER}/johnfabric"

# ── Read domain from existing .env.local or prompt ───────────────────────────
FRONTEND_ENV="${APP_DIR}/frontend/.env.local"
if [[ -f "${FRONTEND_ENV}" ]]; then
  DOMAIN=$(grep NEXT_PUBLIC_API_URL "${FRONTEND_ENV}" | sed 's|.*http://||;s|/api.*||')
  info "Domain from .env.local: ${DOMAIN}"
else
  read -rp "Domain / public IP: " DOMAIN
fi

# ── Swap (idempotent) ─────────────────────────────────────────────────────────
if ! swapon --show | grep -q '/swapfile'; then
  info "Creating 2GB swapfile..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi
info "Swap: $(free -h | grep Swap)"

# ── Frontend build ────────────────────────────────────────────────────────────
cd "${APP_DIR}/frontend"

if [[ ! -f "${FRONTEND_ENV}" ]]; then
  cat > "${FRONTEND_ENV}" <<EOF
NEXT_PUBLIC_API_URL=http://${DOMAIN}/api/v1
EOF
fi

info "Installing dependencies..."
if [[ -f package-lock.json ]]; then
  npm ci || error "npm ci failed"
else
  npm install || error "npm install failed"
fi

info "Building Next.js (1-3 min)..."
npm run build || error "next build failed — run manually: cd ~/johnfabric/frontend && npm run build"

# ── Systemd service ───────────────────────────────────────────────────────────
NODE_BIN=$(which node)
info "Creating systemd service: johnfabric-frontend"
sudo tee /etc/systemd/system/johnfabric-frontend.service > /dev/null <<EOF
[Unit]
Description=John Fabric Next.js frontend
After=network.target johnfabric-backend.service

[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=${NODE_BIN} node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now johnfabric-frontend
info "Frontend service: $(sudo systemctl is-active johnfabric-frontend)"

# ── Nginx ─────────────────────────────────────────────────────────────────────
info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/johnfabric > /dev/null <<'NGINXCONF'
upstream backend  { server 127.0.0.1:8000; }
upstream frontend { server 127.0.0.1:3000; }

server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    client_max_body_size 20M;

    location /api/    { proxy_pass http://backend; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_read_timeout 120s; }
    location /renders/{ proxy_pass http://backend; add_header Cache-Control "public, max-age=86400"; }
    location /assets/ { proxy_pass http://backend; add_header Cache-Control "public, max-age=86400"; }
    location /docs    { proxy_pass http://backend; }
    location /health  { proxy_pass http://backend; }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINXCONF

sudo sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/sites-available/johnfabric
sudo ln -sf /etc/nginx/sites-available/johnfabric /etc/nginx/sites-enabled/johnfabric
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ── Firewall ──────────────────────────────────────────────────────────────────
sudo ufw allow 22/tcp  2>/dev/null || true
sudo ufw allow 80/tcp  2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Frontend deployed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Configurator : http://${DOMAIN}"
echo -e "  Admin panel  : http://${DOMAIN}/admin"
echo -e "  API docs     : http://${DOMAIN}/docs"
echo ""
echo -e "  Backend  : $(sudo systemctl is-active johnfabric-backend)"
echo -e "  Frontend : $(sudo systemctl is-active johnfabric-frontend)"
echo -e "  Nginx    : $(sudo systemctl is-active nginx)"
echo ""
echo -e "${YELLOW}  HTTPS: sudo certbot --nginx -d ${DOMAIN}${NC}"
