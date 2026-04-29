🧵 Shirt Configurator MVP — Full Context for Copilot (Claude Model)

🎯 Project Overview
Project: Real-time Shirt Configurator
Client: Manoj / SESANOVA / John Tailor
Version: MVP v1.0
Goal: Build a deterministic image compositing system where a customer selects collar style, cuff style, and fabric, and instantly sees three preview images (full shirt front, collar detail, cuff detail) that update in real time.
Core principle: This is NOT generative AI. Every (collar_id, cuff_id, fabric_id) combination always produces the exact same three PNGs — making it cacheable, testable, and cheap.

🏗️ Tech Stack
LayerTechnologyFrontendNext.js + ReactBackend APIPython FastAPIImage compositingPillow (PIL)DatabasePostgreSQLCacheRedisAsset storageS3 or local filesystem

🧩 Architecture (5 Layers)
[ Next.js Configurator UI ]
         |  HTTPS / JSON
         v
[ FastAPI Backend ]
  /fabrics  /collars  /cuffs  /render  /configs  /events
         |
         +--> Composer Service (core)
         |       |-- asset loader
         |       |-- tile engine (mm -> px)
         |       |-- mask + blend ops
         |       `-- PNG writer
         |
         +--> Redis cache (key = SHA256 of view|ids|asset_versions)
         +--> PostgreSQL (fabrics, collars, cuffs, templates, configs, events)
         `--> Asset store S3 / local filesystem
                /assets/{type}/{sku}/{layer}.png
                /tiles/{fabric_sku}.png
                /renders/{hash}.png
Key architectural rule: The Composer is the ONLY module that touches pixels. The API layer never imports Pillow. This allows a future AI rendering engine to swap in without any API contract changes.

🔄 Request Flow

Customer selects collar + cuff + fabric in the UI
Frontend calls POST /render/all with the three IDs
Backend computes: cache_key = SHA256(view | collar_id | cuff_id | fabric_id | asset_versions)
Cache hit → return cached URLs in <50ms
Cache miss → Composer loads assets, tiles fabric, applies masks, blends shading, writes PNG, caches result
Frontend receives 3 URLs and updates 3 preview panes


🗃️ Database Schema (PostgreSQL)
All IDs are UUIDs. asset_version is included in cache keys — bumping it auto-invalidates cached renders.
fabrics
sqlCREATE TABLE fabrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  tier            TEXT NOT NULL,              -- 'A' | 'B' | 'C'
  tile_path       TEXT NOT NULL,
  tile_width_mm   NUMERIC NOT NULL,           -- REQUIRED: real-world mm the tile represents
  pattern_type    TEXT NOT NULL,              -- 'solid' | 'stripe' | 'check' | 'herringbone'
  colorway        TEXT,
  hex_primary     TEXT,
  asset_version   INT NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
collars
sqlCREATE TABLE collars (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  style               TEXT NOT NULL,          -- 'spread' | 'cutaway' | 'button-down' | 'club' | 'wing'
  base_mask_path      TEXT NOT NULL,
  fabric_mask_path    TEXT NOT NULL,
  shading_path        TEXT NOT NULL,
  highlight_path      TEXT,
  preview_anchor_xy   JSONB NOT NULL,         -- {"x": 120, "y": 80}
  asset_version       INT NOT NULL DEFAULT 1,
  active              BOOLEAN NOT NULL DEFAULT TRUE
);
cuffs — Identical shape to collars. Separate table for independent asset versioning.
sqlCREATE TABLE cuffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  style               TEXT NOT NULL,          -- 'barrel' | 'french' | 'convertible' | 'rounded'
  base_mask_path      TEXT NOT NULL,
  fabric_mask_path    TEXT NOT NULL,
  shading_path        TEXT NOT NULL,
  highlight_path      TEXT,
  preview_anchor_xy   JSONB NOT NULL,
  asset_version       INT NOT NULL DEFAULT 1,
  active              BOOLEAN NOT NULL DEFAULT TRUE
);
shirt_templates — One row per view: front, collar_detail, cuff_detail
sqlCREATE TABLE shirt_templates (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view                   TEXT UNIQUE NOT NULL,
  canvas_w               INT NOT NULL,
  canvas_h               INT NOT NULL,
  mm_per_px              NUMERIC NOT NULL,
  body_mask_path         TEXT,
  body_fabric_mask_path  TEXT,
  body_shading_path      TEXT,
  placket_overlay_path   TEXT,
  collar_slot            JSONB,               -- {"x","y","w","h","rotation"}
  cuff_slot              JSONB
);
renders (cache metadata)
sqlCREATE TABLE renders (
  cache_key   TEXT PRIMARY KEY,
  view        TEXT NOT NULL,
  collar_id   UUID REFERENCES collars(id),
  cuff_id     UUID REFERENCES cuffs(id),
  fabric_id   UUID REFERENCES fabrics(id),
  path        TEXT NOT NULL,
  bytes       INT,
  ms          INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
saved_configs + events
sqlCREATE TABLE saved_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  name       TEXT,
  collar_id  UUID REFERENCES collars(id),
  cuff_id    UUID REFERENCES cuffs(id),
  fabric_id  UUID REFERENCES fabrics(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT,
  user_id     UUID,
  event_type  TEXT NOT NULL,  -- 'view' | 'select' | 'save' | 'order'
  collar_id   UUID,
  cuff_id     UUID,
  fabric_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user   ON events (user_id, created_at);
CREATE INDEX idx_events_fabric ON events (fabric_id);

🌐 API Endpoints
All endpoints under /api/v1. JSON in, JSON out. Auth on write endpoints only.
Catalog
GET /api/v1/fabrics  → [{id, sku, name, tier, swatch_url, tile_width_mm, pattern_type, colorway}]
GET /api/v1/collars  → [{id, sku, name, style, thumb_url}]
GET /api/v1/cuffs    → [{id, sku, name, style, thumb_url}]
Render
POST /api/v1/render      body: {view, collar_id, cuff_id, fabric_id}
                         returns: {url, cache_hit, ms}

POST /api/v1/render/all  body: {collar_id, cuff_id, fabric_id}
                         returns: {front_url, collar_url, cuff_url, cache_hit, ms}
Configs + Events
POST /api/v1/configs         body: {name, collar_id, cuff_id, fabric_id}  [auth]
GET  /api/v1/configs/:id
GET  /api/v1/configs                                                        [auth, list]
POST /api/v1/events          body: {event_type, collar_id, cuff_id, fabric_id, meta}
Error codes: 422 invalid input, 404 unknown SKU, 409 inactive asset, 500 render failure (returns stable error ID, never a partial PNG)

📁 Backend Module Structure
app/
  main.py
  config.py                    # env vars, feature flags, paths
  api/v1/
    fabrics.py
    collars.py
    cuffs.py
    render.py
    configs.py
    events.py
  core/
    composer.py                # orchestrates a render
    assets.py                  # fetch + validate asset files
    masks.py                   # load, threshold, feather, invert
    tiling.py                  # fabric tile → region, mm_per_px aware
    blend.py                   # alpha_composite, multiply, screen
    cache.py                   # redis + file store, cache_key()
    hashing.py                 # SHA256 of inputs + asset_versions
  db/
    session.py
    models.py
    schemas.py
    crud.py
    seed.py
  services/
    fabric_service.py
    render_service.py
    config_service.py
  workers/
    prerender.py               # precompute hot combos (Celery or RQ)
  tests/
    composer/                  # golden-image tests
    api/
    db/

🎨 Rendering Pipeline (Pseudocode)
pythondef render(view: str, collar_id, cuff_id, fabric_id) -> RenderResult:
    key = cache_key(view, collar_id, cuff_id, fabric_id, asset_versions())
    if hit := cache.get(key):
        return hit

    tpl    = load_template(view)
    fabric = load_fabric(fabric_id)
    collar = load_collar(collar_id)
    cuff   = load_cuff(cuff_id)

    tile   = tile_fabric(fabric, tpl.canvas_size, fabric.tile_width_mm, tpl.mm_per_px)
    canvas = new_rgba(tpl.canvas_size)

    # shirt body
    body_fabric = apply_mask(tile, load_mask(tpl.body_fabric_mask_path))
    canvas = alpha_over(canvas, body_fabric)
    canvas = multiply(canvas, load_mask(tpl.body_shading_path))
    canvas = alpha_over(canvas, load_png(tpl.placket_overlay_path))

    # collar
    if view in ("front", "collar_detail"):
        collar_layer = render_part(collar, tile, tpl.mm_per_px)
        canvas = alpha_over(canvas, collar_layer, anchor=tpl.collar_slot)

    # cuff
    if view in ("front", "cuff_detail"):
        cuff_layer = render_part(cuff, tile, tpl.mm_per_px)
        canvas = alpha_over(canvas, cuff_layer, anchor=tpl.cuff_slot)

    path = save_png(canvas, key)
    cache.set(key, path)
    return RenderResult(path=path, cache_hit=False)


def render_part(part, tile, mm_per_px):
    base   = load_mask(part.base_mask_path)
    fabric = apply_mask(tile, load_mask(part.fabric_mask_path))
    shaded = multiply(fabric, load_mask(part.shading_path))
    if part.highlight_path:
        shaded = screen(shaded, load_mask(part.highlight_path))
    return set_alpha(shaded, base)

🖼️ Asset Requirements (Per Component)
Each collar, cuff, and body part needs 3–4 PNG layers:
LayerPurposebase_maskPure white silhouette on transparent BG — defines alpha of the partfabric_maskWhite where fabric shows, black where hardware/stitching coversshadingGrayscale multiply layer — 50% grey = no change, darker = shadowhighlightOptional grayscale screen-blend for gloss accents
Per fabric: Seamless square tile, shot flat, even lighting, color-checker corrected. tile_width_mm is mandatory.
File naming convention:
/assets/collars/SPREAD-01/base_mask.png
/assets/collars/SPREAD-01/fabric_mask.png
/assets/collars/SPREAD-01/shading.png
/assets/cuffs/BARREL-01/base_mask.png
/assets/fabrics/F-B-112-LTBLU/tile.png
/assets/fabrics/F-B-112-LTBLU/tile.json
QA checklist per asset: No halos/jagged cutouts, neutral white balance, no JPEG artifacts, shading midpoint at 50% (127/255), consistent camera angle within a collection.

🗺️ MVP Build Order (11 Steps)
StepTask1Asset spec + golden reference (1 collar, 1 cuff, 3 fabrics — build 3 reference images in Photoshop)2Composer module (standalone, no API) with golden-image unit tests3PostgreSQL schema + seed data4FastAPI read endpoints + /render (synchronous, uncached first)5Redis cache + asset versioning + hashing6Next.js configurator UI (3 dropdowns, 3 preview panes, call /render/all on change)7Expand catalog (~10 collars, ~10 cuffs, ~20 fabrics)8Saved configs + auth (email magic link sufficient for MVP)9Event logging (every select/save = training data for future recommendation engine)10Staging deploy + device QA (desktop + mobile)11Pre-render worker (precompute top N combos before launch)
Out of scope for v1: Full user accounts, checkout, order system, 3D rendering, AI generation — all v2.

⚠️ Key Risks & Mitigations
RiskMitigationAsset quality drift between photo sessionsWritten spec + QA checklist; reject non-conforming uploads at ingestFabric tile seams visibleAutomated 2×2 seam test at upload; reject failuresWrong fabric scaletile_width_mm required; pipeline refuses fabrics missing itUncanny pasted-on lookCommit to stylized consistent look; shared shading passes across componentsRender latency on cold cachePre-render worker for top N combosStorage bloatTTL + LRU eviction, PNG quantize, lazy caching for cold combosAsset update silently breaks saved configsasset_version in cache key auto-invalidates; configs store IDs not URLsFuture AI generation pressureComposer hidden behind service interface — AI module can swap in without API changesNo data for recommendations at launchLog events from day oneAsset store single point of failureMirror S3 to local filesystem; asset paths abstracted behind a loader

🆕 Additions to the MVP Context
Gap 1 — Pre-rendered Combination Image Storage
The original design treats Redis as the only cache and generates images on demand. Since every valid combination's image already exists (pre-shot or pre-rendered), we need to store them as first-class DB records with permanent, addressable URLs — not just ephemeral cache entries.
New table: combination_renders
sqlCREATE TABLE combination_renders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collar_id     UUID NOT NULL REFERENCES collars(id),
  cuff_id       UUID NOT NULL REFERENCES cuffs(id),
  fabric_id     UUID NOT NULL REFERENCES fabrics(id),

  front_url     TEXT NOT NULL,          -- permanent S3/CDN URL
  collar_url    TEXT NOT NULL,
  cuff_url      TEXT NOT NULL,

  asset_version_collar  INT NOT NULL,   -- snapshot of version at render time
  asset_version_cuff    INT NOT NULL,
  asset_version_fabric  INT NOT NULL,

  is_valid      BOOLEAN NOT NULL DEFAULT TRUE,  -- set false if an asset is retired
  rendered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (collar_id, cuff_id, fabric_id)        -- one canonical record per combo
);

CREATE INDEX idx_cr_lookup ON combination_renders (collar_id, cuff_id, fabric_id) WHERE is_valid = TRUE;
Updated request flow
POST /api/v1/render/all  {collar_id, cuff_id, fabric_id}

  1. SELECT from combination_renders WHERE collar_id=? AND cuff_id=? AND fabric_id=? AND is_valid=TRUE
     → HIT:  return {front_url, collar_url, cuff_url, source: "db"}  ← instant
     → MISS: fall through to composer

  2. Composer generates 3 PNGs → uploads to S3 → writes row to combination_renders
     → return {front_url, collar_url, cuff_url, source: "generated"}

  3. Redis still wraps step 1 for hot-path sub-10ms reads (TTL 1hr)
Asset version invalidation
When an asset is re-shot and asset_version is bumped, all affected combination_renders rows are marked is_valid = FALSE via a trigger or admin action. On next request, the composer regenerates the image and writes a fresh row — auto-invalidation with permanent traceability.
sql-- Run after bumping asset_version on a collar
UPDATE combination_renders
SET is_valid = FALSE
WHERE collar_id = :collar_id
  AND asset_version_collar != (SELECT asset_version FROM collars WHERE id = :collar_id);
Updated API response shape
POST /api/v1/render/all
returns: {
  front_url,
  collar_url,
  cuff_url,
  source: "db" | "generated",
  render_id: UUID,
  ms: int
}
Storage path convention (S3)
/renders/{collar_sku}/{cuff_sku}/{fabric_sku}/front.png
/renders/{collar_sku}/{cuff_sku}/{fabric_sku}/collar.png
/renders/{collar_sku}/{cuff_sku}/{fabric_sku}/cuff.png

Gap 2 — Admin Panel
The admin panel is a separate internal Next.js route (/admin) or standalone app, protected behind role-based auth. It covers four domains: catalog management, render management, user/config management, and analytics.
Admin API endpoints (all require admin role)
-- Fabrics
GET    /api/v1/admin/fabrics
POST   /api/v1/admin/fabrics           -- create
PATCH  /api/v1/admin/fabrics/:id       -- edit name, tier, metadata, toggle active
DELETE /api/v1/admin/fabrics/:id       -- soft delete (sets active=false)
POST   /api/v1/admin/fabrics/:id/asset -- upload new tile PNG, bumps asset_version

-- Collars
GET    /api/v1/admin/collars
POST   /api/v1/admin/collars
PATCH  /api/v1/admin/collars/:id
POST   /api/v1/admin/collars/:id/asset -- upload base_mask / fabric_mask / shading / highlight

-- Cuffs
GET    /api/v1/admin/cuffs
POST   /api/v1/admin/cuffs
PATCH  /api/v1/admin/cuffs/:id
POST   /api/v1/admin/cuffs/:id/asset

-- Combination renders
GET    /api/v1/admin/renders           -- list with filters
POST   /api/v1/admin/renders/prerender -- trigger pre-render for given combos
POST   /api/v1/admin/renders/invalidate -- mark combos invalid (post asset update)
GET    /api/v1/admin/renders/:id/preview -- return image URLs for spot-check

-- Users / configs
GET    /api/v1/admin/users
GET    /api/v1/admin/configs           -- all saved configs across users

-- Analytics
GET    /api/v1/admin/analytics/popular   -- top combos by event count
GET    /api/v1/admin/analytics/funnel    -- view → select → save → order
GET    /api/v1/admin/analytics/fabrics   -- fabric selection frequency
Admin DB additions
sql-- Admin user roles
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'customer',  -- 'customer' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for all admin mutations
CREATE TABLE admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,            -- 'create_fabric' | 'upload_asset' | 'invalidate_renders' etc.
  target_type TEXT,                     -- 'fabric' | 'collar' | 'cuff' | 'render'
  target_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Admin panel UI — key screens
ScreenKey actionsFabric listTable of all fabrics with tier, pattern, active status. Add / edit / deactivate. Upload new tile PNG (shows seam-test result inline).Collar listSame pattern. Upload each layer (base_mask, fabric_mask, shading, highlight) separately with QA checks.Cuff listSame as collars.Render matrixFilterable grid of combination_renders. Status: valid / invalid / missing. Trigger pre-render for selected combos. Preview any combo with one click.Asset uploaderDrag-and-drop PNG upload with live validation: alpha edge check, seam test (fabrics), grey midpoint check (shading). Blocks save on failure.AnalyticsPopular combos chart, fabric frequency bar chart, select→save→order funnel.Audit logAppend-only log of every admin action with timestamp and admin identity.
Asset upload validation (ingest-time checks, run server-side)
pythondef validate_fabric_tile(path):
    img = Image.open(path).convert("RGBA")
    assert img.size[0] == img.size[1], "Tile must be square"
    # 2x2 seam test
    composite = Image.new("RGBA", (img.width*2, img.height*2))
    for x, y in [(0,0),(img.width,0),(0,img.height),(img.width,img.height)]:
        composite.paste(img, (x, y))
    # Check edge pixel similarity across seam lines (threshold < 10 delta)
    assert seam_delta(composite) < 10, "Tile has visible seams"

def validate_shading_layer(path):
    img = Image.open(path).convert("L")
    midpoint = np.mean(np.array(img))
    assert 115 < midpoint < 140, f"Shading midpoint {midpoint:.0f} not near 127"
Admin module structure (backend)
app/
  api/v1/
    admin/
      fabrics.py
      collars.py
      cuffs.py
      renders.py
      analytics.py
      audit.py
  core/
    validation.py     # asset QA checks (seam test, midpoint check, alpha check)
    uploader.py       # S3 put + path resolution
  middleware/
    auth.py           # role check: require_admin decorator

Updated Risks (additions only)
RiskMitigationPre-rendered image URLs become stale after asset updateis_valid flag + asset_version snapshot in combination_renders. Invalidated rows are never served.Admin uploads low-quality asset without realisingIngest-time validation blocks save on seam / midpoint / alpha failures with a plain-English error.Accidental bulk invalidation of all rendersAdmin audit log captures every action. Invalidation requires explicit confirmation in UI.Render storage grows unbounded as catalog expandscombination_renders has one row per combo (UNIQUE constraint). Old invalid rows can be archived by a nightly job. S3 lifecycle rule deletes unreferenced PNGs after 90 days.