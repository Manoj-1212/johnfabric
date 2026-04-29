from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.db.session import engine
from app.db import models
from app.api.v1 import fabrics, collars, cuffs, render, configs, events, auth
from app.api.v1.admin import fabrics as admin_fabrics
from app.api.v1.admin import collars as admin_collars
from app.api.v1.admin import cuffs as admin_cuffs
from app.api.v1.admin import renders as admin_renders
from app.api.v1.admin import analytics as admin_analytics
from app.api.v1.admin import audit as admin_audit

app = FastAPI(title="John Fabric — Shirt Configurator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve rendered images statically
renders_dir = settings.render_path
renders_dir.mkdir(parents=True, exist_ok=True)
app.mount("/renders", StaticFiles(directory=str(renders_dir)), name="renders")

# Serve assets statically
assets_dir = settings.asset_path
assets_dir.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

# Public catalog + render routes
app.include_router(fabrics.router, prefix="/api/v1")
app.include_router(collars.router, prefix="/api/v1")
app.include_router(cuffs.router, prefix="/api/v1")
app.include_router(render.router, prefix="/api/v1")
app.include_router(configs.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")

# Admin routes
app.include_router(admin_fabrics.router, prefix="/api/v1/admin")
app.include_router(admin_collars.router, prefix="/api/v1/admin")
app.include_router(admin_cuffs.router, prefix="/api/v1/admin")
app.include_router(admin_renders.router, prefix="/api/v1/admin")
app.include_router(admin_analytics.router, prefix="/api/v1/admin")
app.include_router(admin_audit.router, prefix="/api/v1/admin")


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok"}
