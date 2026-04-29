#!/usr/bin/env bash
# =============================================================================
#  deploy-ec2.sh — John Fabric full deployment on a FRESH Ubuntu 22.04 EC2
# =============================================================================
#
#  WHAT THIS SCRIPT DOES (idempotent — safe to re-run):
#    1.  System packages + Python 3.12 + Node 20 + Nginx + Certbot
#    2.  PostgreSQL 16 — creates DB + user
#    3.  Redis 7
#    4.  Clones / pulls the repo
#    5.  Backend — Python venv, pip install, .env, systemd service
#    6.  Frontend — npm install, next build, systemd service
#    7.  Nginx virtual host (HTTP for now; run certbot after DNS is live)
#    8.  Seeds the database on first run
#
#  USAGE (run as ubuntu user, NOT root):
#    chmod +x deploy-ec2.sh
#    ./deploy-ec2.sh
#
#  REQUIRED ENV VARS (prompt if not set):
#    REPO_URL          e.g. https://github.com/yourname/johnfabric.git
#    DOMAIN            e.g. johnfabric.sesanova.com   (or EC2 public IP)
#    DB_PASSWORD       strong password for the postgres johnfabric user
#    SECRET_KEY        random hex — generate with: openssl rand -hex 32
#
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
APP_USER="ubuntu"
APP_DIR="/home/${APP_USER}/johnfabric"
VENV_DIR="${APP_DIR}/backend/.venv"
PYTHON="python3.12"

# Prompt for required values if not already exported
[[ -z "${REPO_URL:-}" ]]    && read -rp "GitHub repo URL: "    REPO_URL
[[ -z "${DOMAIN:-}" ]]      && read -rp "Domain / public IP: " DOMAIN
[[ -z "${DB_PASSWORD:-}" ]] && read -rsp "DB password: "       DB_PASSWORD && echo
[[ -z "${SECRET_KEY:-}" ]]  && SECRET_KEY=$(openssl rand -hex 32) && info "Generated SECRET_KEY"

# ── 1. System packages ────────────────────────────────────────────────────────
info "Step 1/8 — Installing system packages"
sudo apt-get update -qq
sudo apt-get install -y -qq \
  git curl wget gnupg2 ca-certificates lsb-release \
  build-essential libssl-dev libffi-dev libpq-dev \
  software-properties-common apt-transport-https \
  nginx certbot python3-certbot-nginx \
  libjpeg-dev libpng-dev libtiff-dev libwebp-dev   # Pillow deps

# Python 3.12
if ! command -v python3.12 &>/dev/null; then
  info "Installing Python 3.12..."
  sudo add-apt-repository -y ppa:deadsnakes/ppa
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3.12 python3.12-venv python3.12-dev python3.12-distutils
else
  # Ensure venv module is present even if python3.12 was pre-installed
  sudo apt-get install -y -qq python3.12-venv python3.12-dev 2>/dev/null || true
fi

# Node 20
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  info "Installing Node 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

info "Python: $(python3.12 --version)  Node: $(node -v)  npm: $(npm -v)"

# ── 2. PostgreSQL 16 ──────────────────────────────────────────────────────────
info "Step 2/8 — PostgreSQL"
if ! pg_isready -q 2>/dev/null; then
  sudo apt-get install -y -qq postgresql-16 postgresql-client-16
fi
sudo systemctl enable --now postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='johnfabric'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER johnfabric WITH PASSWORD '${DB_PASSWORD}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='johnfabric'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE johnfabric OWNER johnfabric;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE johnfabric TO johnfabric;"
# Allow createdb for Alembic / test runs
sudo -u postgres psql -c "ALTER USER johnfabric CREATEDB;"
info "PostgreSQL ready"

# ── 3. Redis ──────────────────────────────────────────────────────────────────
info "Step 3/8 — Redis"
sudo apt-get install -y -qq redis-server
sudo systemctl enable --now redis-server
info "Redis ready"

# ── 4. Clone / pull repo ──────────────────────────────────────────────────────
info "Step 4/8 — Application code"
if [[ -d "${APP_DIR}/.git" ]]; then
  info "Repo exists — pulling latest..."
  cd "${APP_DIR}"
  git pull origin main
else
  info "Cloning repo..."
  git clone "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

# Ensure asset/render directories exist
mkdir -p "${APP_DIR}/backend/assets"
mkdir -p "${APP_DIR}/backend/renders"

# ── 5. Backend ────────────────────────────────────────────────────────────────
info "Step 5/8 — Backend (FastAPI)"

# Write .env if not present
BACKEND_ENV="${APP_DIR}/backend/.env"
if [[ ! -f "${BACKEND_ENV}" ]]; then
  info "Writing backend .env..."
  cat > "${BACKEND_ENV}" <<EOF
DATABASE_URL=postgresql+asyncpg://johnfabric:${DB_PASSWORD}@localhost:5432/johnfabric
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=${SECRET_KEY}
ASSET_BASE_PATH=${APP_DIR}/backend/assets
RENDER_BASE_PATH=${APP_DIR}/backend/renders
RENDER_SERVE_BASE_URL=http://${DOMAIN}/renders
USE_S3=false
FRONTEND_URL=http://${DOMAIN}
EOF
  chmod 600 "${BACKEND_ENV}"
else
  warn ".env already exists — skipping (update manually if needed)"
fi

# Virtual env + install
if [[ ! -d "${VENV_DIR}" ]]; then
  ${PYTHON} -m venv "${VENV_DIR}"
fi
"${VENV_DIR}/bin/pip" install --quiet --upgrade pip
"${VENV_DIR}/bin/pip" install --quiet -r "${APP_DIR}/backend/requirements.txt"

# Seed DB (idempotent)
cd "${APP_DIR}/backend"
"${VENV_DIR}/bin/python" -m app.db.seed && info "DB seeded" || warn "Seed already run or failed (safe to ignore)"

# systemd service
info "Creating systemd service: johnfabric-backend"
sudo tee /etc/systemd/system/johnfabric-backend.service > /dev/null <<EOF
[Unit]
Description=John Fabric FastAPI backend
After=network.target postgresql.service redis-server.service

[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${BACKEND_ENV}
ExecStart=${VENV_DIR}/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now johnfabric-backend
info "Backend service: $(sudo systemctl is-active johnfabric-backend)"

# ── 6. Frontend ───────────────────────────────────────────────────────────────
info "Step 6/8 — Frontend (Next.js)"

cd "${APP_DIR}/frontend"

# Write .env.local if not present
FRONTEND_ENV="${APP_DIR}/frontend/.env.local"
if [[ ! -f "${FRONTEND_ENV}" ]]; then
  cat > "${FRONTEND_ENV}" <<EOF
NEXT_PUBLIC_API_URL=http://${DOMAIN}/api/v1
EOF
fi

npm ci --silent
npm run build

# systemd service
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
ExecStart=$(which node) node_modules/.bin/next start -p 3000
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

# ── 7. Nginx ──────────────────────────────────────────────────────────────────
info "Step 7/8 — Nginx"

sudo tee /etc/nginx/sites-available/johnfabric > /dev/null <<'NGINXCONF'
# Upstream services
upstream backend  { server 127.0.0.1:8000; }
upstream frontend { server 127.0.0.1:3000; }

server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    client_max_body_size 20M;

    # Backend API
    location /api/ {
        proxy_pass         http://backend;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Static renders served directly through FastAPI's /renders mount
    location /renders/ {
        proxy_pass http://backend;
        proxy_cache_valid 200 24h;
        add_header Cache-Control "public, max-age=86400";
    }

    # Static assets
    location /assets/ {
        proxy_pass http://backend;
        add_header Cache-Control "public, max-age=86400";
    }

    # FastAPI docs (optional — remove in production)
    location /docs    { proxy_pass http://backend; }
    location /openapi { proxy_pass http://backend; }
    location /health  { proxy_pass http://backend; }

    # All other traffic → Next.js
    location / {
        proxy_pass         http://frontend;
        proxy_set_header   Host            $host;
        proxy_set_header   X-Real-IP       $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
NGINXCONF

# Replace DOMAIN_PLACEHOLDER with actual domain
sudo sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/sites-available/johnfabric

sudo ln -sf /etc/nginx/sites-available/johnfabric /etc/nginx/sites-enabled/johnfabric
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
info "Nginx configured for ${DOMAIN}"

# ── 8. Firewall ───────────────────────────────────────────────────────────────
info "Step 8/8 — Firewall (ufw)"
sudo ufw allow 22/tcp   comment "SSH"   2>/dev/null || true
sudo ufw allow 80/tcp   comment "HTTP"  2>/dev/null || true
sudo ufw allow 443/tcp  comment "HTTPS" 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true
info "Firewall: $(sudo ufw status verbose | head -1)"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  John Fabric deployed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Configurator : http://${DOMAIN}"
echo -e "  Admin panel  : http://${DOMAIN}/admin"
echo -e "  API docs     : http://${DOMAIN}/docs"
echo ""
echo -e "  Service status:"
echo -e "    Backend  $(sudo systemctl is-active johnfabric-backend)"
echo -e "    Frontend $(sudo systemctl is-active johnfabric-frontend)"
echo -e "    Nginx    $(sudo systemctl is-active nginx)"
echo -e "    Postgres $(sudo systemctl is-active postgresql)"
echo -e "    Redis    $(sudo systemctl is-active redis-server)"
echo ""
echo -e "${YELLOW}  HTTPS:  Once your DNS A-record points to this server, run:${NC}"
echo -e "    sudo certbot --nginx -d ${DOMAIN}"
echo ""
echo -e "${YELLOW}  Logs:${NC}"
echo -e "    sudo journalctl -u johnfabric-backend  -f"
echo -e "    sudo journalctl -u johnfabric-frontend -f"
echo ""
