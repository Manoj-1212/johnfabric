# John Fabric — Shirt Configurator DEVLOG

> Single source of truth for all architectural decisions, changes, and logic updates.
> **Updated automatically whenever logic changes.**

---

## 2026-04-29 — Initial Build (MVP v1.0)

### Architecture
- **Backend**: FastAPI (Python) — `backend/`
- **Frontend**: Next.js 14 (React, App Router) — `frontend/`
- **Database**: PostgreSQL — via SQLAlchemy async
- **Cache**: Redis — SHA256-keyed render cache (TTL 1hr hot, DB permanent store)
- **Images**: Pillow — deterministic compositing, Composer is the ONLY pixel-touching module
- **Storage**: Local filesystem (`/renders/`) — S3-swappable via `uploader.py`

### Key Design Rules
1. Composer is the ONLY module that imports Pillow.
2. Every `(collar_id, cuff_id, fabric_id)` combo always produces the **same 3 PNGs** — deterministic.
3. Cache key = `SHA256(view | collar_id | cuff_id | fabric_id | asset_versions)`.
4. `combination_renders` table stores permanent URLs — Redis wraps it for sub-10ms hot reads.
5. `asset_version` bump auto-invalidates all affected `combination_renders` rows.
6. Admin panel is role-gated (`role = 'admin'` on users table).

### Request Flow
```
POST /api/v1/render/all {collar_id, cuff_id, fabric_id}
  1. Redis check (hot cache, TTL 1hr)
  2. combination_renders DB lookup (is_valid=TRUE)
  3. Composer → generate 3 PNGs → save to disk/S3 → write DB row
  Returns: {front_url, collar_url, cuff_url, source, render_id, ms}
```

### DB Tables Created
- `fabrics` — tile_path, tile_width_mm, pattern_type, asset_version
- `collars` — base_mask_path, fabric_mask_path, shading_path, highlight_path
- `cuffs` — same shape as collars
- `shirt_templates` — one row per view (front, collar_detail, cuff_detail)
- `renders` — legacy ephemeral cache metadata
- `combination_renders` — permanent, one row per combo, is_valid flag
- `saved_configs` — user saved configurations
- `events` — every select/save/order action (future ML training data)
- `users` — email + role (customer | admin)
- `admin_audit_log` — immutable log of every admin mutation

### API Endpoints
- `GET /api/v1/fabrics|collars|cuffs` — catalog
- `POST /api/v1/render/all` — main render endpoint
- `POST /api/v1/render` — single view render
- `POST /api/v1/configs`, `GET /api/v1/configs` — saved configs (auth)
- `POST /api/v1/events` — event tracking
- `GET/POST/PATCH /api/v1/admin/*` — admin panel endpoints

### Rendering Pipeline
```
render(view, collar_id, cuff_id, fabric_id):
  1. Cache check
  2. Load template, fabric tile, collar, cuff assets from disk
  3. tile_fabric() → mm-aware tiling to canvas size
  4. alpha_over(body_fabric) → multiply(shading) → alpha_over(placket)
  5. render_part(collar) → place at collar_slot
  6. render_part(cuff)   → place at cuff_slot
  7. save PNG → cache → return
```

### Asset Structure
```
/assets/collars/{SKU}/base_mask.png, fabric_mask.png, shading.png, [highlight.png]
/assets/cuffs/{SKU}/base_mask.png, fabric_mask.png, shading.png, [highlight.png]
/assets/fabrics/{SKU}/tile.png, tile.json
/renders/{collar_sku}/{cuff_sku}/{fabric_sku}/front.png|collar.png|cuff.png
```

### Validation Rules (Admin Upload)
- Fabric tile: must be square, 2×2 seam delta < 10
- Shading layer: grayscale midpoint must be 115–140 (target 127)
- All layers: no JPEG artifacts (PNG only)

---

## Deployment Architecture (AWS EC2)

```
Internet
  │
  ▼
EC2 Public IP / Domain (:80 / :443)
  │
  ▼
Nginx  ──── /api/*        →  FastAPI  (127.0.0.1:8000)  [systemd: johnfabric-backend]
       ──── /renders/*    →  FastAPI  (static PNGs)
       ──── /assets/*     →  FastAPI  (static assets)
       ──── /*            →  Next.js  (127.0.0.1:3000)  [systemd: johnfabric-frontend]
  │
  ▼
PostgreSQL 16  (localhost:5432, DB: johnfabric)
Redis 7        (localhost:6379)
```

### Required EC2 settings
- AMI: Ubuntu 22.04 LTS
- Instance type: t3.small minimum (t3.medium recommended for Next.js build)
- Security group inbound: SSH (22), HTTP (80), HTTPS (443)
- Storage: 20 GB gp3
- Elastic IP: assign one before pointing DNS

### First-time deployment (run on EC2)
```bash
# 1. SSH into fresh EC2
ssh -i your-key.pem ubuntu@<EC2_IP>

# 2. Download deploy script (or scp it)
curl -o deploy-ec2.sh https://raw.githubusercontent.com/yourname/johnfabric/main/deploy-ec2.sh
chmod +x deploy-ec2.sh

# 3. Run — it will prompt for REPO_URL, DOMAIN, DB_PASSWORD
./deploy-ec2.sh

# 4. After DNS is live, get HTTPS
sudo certbot --nginx -d yourdomain.com
```

### Subsequent deploys (after git push)
```bash
ssh -i your-key.pem ubuntu@<EC2_IP>
cd ~/johnfabric && ./redeploy.sh
```

### Systemd services
| Service | Command |
|---------|---------|
| `johnfabric-backend` | `sudo systemctl status johnfabric-backend` |
| `johnfabric-frontend`| `sudo systemctl status johnfabric-frontend` |
| Logs | `sudo journalctl -u johnfabric-backend -f` |

### Key file locations on EC2
| Purpose | Path |
|---------|------|
| App root | `/home/ubuntu/johnfabric/` |
| Backend env | `/home/ubuntu/johnfabric/backend/.env` |
| Frontend env | `/home/ubuntu/johnfabric/frontend/.env.local` |
| Assets | `/home/ubuntu/johnfabric/backend/assets/` |
| Renders | `/home/ubuntu/johnfabric/backend/renders/` |
| Nginx config | `/etc/nginx/sites-available/johnfabric` |

---

## Changelog

| Date | Change | Files Affected |
|------|--------|----------------|
| 2026-04-29 | Initial build — full MVP scaffold | All files |
| 2026-04-29 | Git workflow + EC2 deployment scripts | `.gitignore`, `deploy-ec2.sh`, `redeploy.sh`, `git-init-push.bat`, `DEVLOG.md` |
