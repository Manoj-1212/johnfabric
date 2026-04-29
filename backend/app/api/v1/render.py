import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db import crud, schemas
from app.core import composer, cache as redis_cache
from app.core.hashing import cache_key

router = APIRouter(tags=["render"])


async def _load_entities(db, collar_id, cuff_id, fabric_id):
    collar = await crud.get_collar(db, collar_id)
    cuff = await crud.get_cuff(db, cuff_id)
    fabric = await crud.get_fabric(db, fabric_id)
    if not collar or not collar.active:
        raise HTTPException(404, "Collar not found or inactive")
    if not cuff or not cuff.active:
        raise HTTPException(404, "Cuff not found or inactive")
    if not fabric or not fabric.active:
        raise HTTPException(404, "Fabric not found or inactive")
    return collar, cuff, fabric


@router.post("/render", response_model=schemas.RenderResponse)
async def render_single(req: schemas.RenderRequest, db: AsyncSession = Depends(get_db)):
    collar, cuff, fabric = await _load_entities(db, req.collar_id, req.cuff_id, req.fabric_id)
    template = await crud.get_template(db, req.view)
    if not template:
        raise HTTPException(404, f"Template for view '{req.view}' not found")

    key = cache_key(req.view, collar.id, cuff.id, fabric.id,
                    collar.asset_version, cuff.asset_version, fabric.asset_version)
    cached = await redis_cache.cache_get(key)
    if cached:
        return schemas.RenderResponse(url=cached["url"], cache_hit=True, ms=0)

    t0 = time.perf_counter()
    result = composer.render_view(req.view, template, fabric, collar, cuff)
    ms = int((time.perf_counter() - t0) * 1000)
    await redis_cache.cache_set(key, {"url": result.url})
    return schemas.RenderResponse(url=result.url, cache_hit=result.cache_hit, ms=ms)


@router.post("/render/all", response_model=schemas.RenderAllResponse)
async def render_all(req: schemas.RenderAllRequest, db: AsyncSession = Depends(get_db)):
    collar, cuff, fabric = await _load_entities(db, req.collar_id, req.cuff_id, req.fabric_id)

    # 1. Redis hot cache
    redis_key = cache_key("all", collar.id, cuff.id, fabric.id,
                           collar.asset_version, cuff.asset_version, fabric.asset_version)
    cached = await redis_cache.cache_get(redis_key)
    if cached:
        return schemas.RenderAllResponse(**cached, source="redis", ms=0)

    # 2. DB permanent store
    db_row = await crud.get_combination_render(db, collar.id, cuff.id, fabric.id)
    if db_row:
        payload = {
            "front_url": db_row.front_url,
            "collar_url": db_row.collar_url,
            "cuff_url": db_row.cuff_url,
            "render_id": db_row.id,
        }
        await redis_cache.cache_set(redis_key, payload)
        return schemas.RenderAllResponse(**payload, source="db", ms=0)

    # 3. No pre-shot image for this combo yet — return 404 so the UI
    # can show a friendly "not available" state instead of a 500.
    raise HTTPException(
        status_code=404,
        detail="combo_not_available",
    )
