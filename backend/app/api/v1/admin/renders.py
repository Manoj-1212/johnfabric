import uuid
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import List, Optional

from app.db.session import get_db
from app.db import crud, models
from app.middleware.auth import require_admin
from app.db.models import User, CombinationRender
from app.config import settings

router = APIRouter(tags=["admin-renders"])


class RenderOut(BaseModel):
    id: uuid.UUID
    collar_id: uuid.UUID
    cuff_id: uuid.UUID
    fabric_id: uuid.UUID
    front_url: str
    collar_url: str
    cuff_url: str
    is_valid: bool

    class Config:
        from_attributes = True


class InvalidateRequest(BaseModel):
    render_ids: List[uuid.UUID]


@router.get("/renders", response_model=list[RenderOut])
async def admin_list_renders(
    is_valid: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(CombinationRender)
    if is_valid is not None:
        q = q.where(CombinationRender.is_valid == is_valid)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/renders/upload-combo", response_model=RenderOut)
async def admin_upload_combo(
    collar_id: uuid.UUID = Form(...),
    cuff_id: uuid.UUID = Form(...),
    fabric_id: uuid.UUID = Form(...),
    front_file: Optional[UploadFile] = File(None),
    collar_file: Optional[UploadFile] = File(None),
    cuff_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Upload pre-shot combination photos directly into combination_renders."""
    collar = await crud.get_collar(db, collar_id)
    cuff = await crud.get_cuff(db, cuff_id)
    fabric = await crud.get_fabric(db, fabric_id)
    if not collar:
        raise HTTPException(404, "Collar not found")
    if not cuff:
        raise HTTPException(404, "Cuff not found")
    if not fabric:
        raise HTTPException(404, "Fabric not found")
    if not front_file and not collar_file and not cuff_file:
        raise HTTPException(422, "At least one image file must be provided (front_file, collar_file, or cuff_file)")

    render_dir = settings.render_path / collar.sku / cuff.sku / fabric.sku
    render_dir.mkdir(parents=True, exist_ok=True)
    base_url = f"{settings.render_serve_base_url}/{collar.sku}/{cuff.sku}/{fabric.sku}"

    # Get any existing row (valid OR invalid) to preserve URLs for views not being updated
    result = await db.execute(
        select(CombinationRender).where(
            CombinationRender.collar_id == collar_id,
            CombinationRender.cuff_id == cuff_id,
            CombinationRender.fabric_id == fabric_id,
        )
    )
    existing = result.scalar_one_or_none()

    front_url = existing.front_url if existing else f"{base_url}/front.png"
    collar_url = existing.collar_url if existing else f"{base_url}/collar.png"
    cuff_url = existing.cuff_url if existing else f"{base_url}/cuff.png"

    if front_file:
        (render_dir / "front.png").write_bytes(await front_file.read())
        front_url = f"{base_url}/front.png"
    if collar_file:
        (render_dir / "collar.png").write_bytes(await collar_file.read())
        collar_url = f"{base_url}/collar.png"
    if cuff_file:
        (render_dir / "cuff.png").write_bytes(await cuff_file.read())
        cuff_url = f"{base_url}/cuff.png"

    if existing:
        existing.front_url = front_url
        existing.collar_url = collar_url
        existing.cuff_url = cuff_url
        existing.asset_version_collar = collar.asset_version
        existing.asset_version_cuff = cuff.asset_version
        existing.asset_version_fabric = fabric.asset_version
        existing.is_valid = True
        await db.commit()
        await db.refresh(existing)
        row = existing
    else:
        row = CombinationRender(
            collar_id=collar_id,
            cuff_id=cuff_id,
            fabric_id=fabric_id,
            front_url=front_url,
            collar_url=collar_url,
            cuff_url=cuff_url,
            asset_version_collar=collar.asset_version,
            asset_version_cuff=cuff.asset_version,
            asset_version_fabric=fabric.asset_version,
            is_valid=True,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)

    await crud.log_audit(db, admin.id, "upload_combo", target_type="render", target_id=row.id,
                         meta={"collar_sku": collar.sku, "cuff_sku": cuff.sku, "fabric_sku": fabric.sku})
    return row


@router.post("/renders/invalidate", status_code=200)
async def admin_invalidate_renders(
    body: InvalidateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    await db.execute(
        update(CombinationRender)
        .where(CombinationRender.id.in_(body.render_ids))
        .values(is_valid=False)
    )
    await db.commit()
    await crud.log_audit(db, admin.id, "invalidate_renders", meta={"count": len(body.render_ids)})
    return {"invalidated": len(body.render_ids)}


@router.get("/renders/{render_id}/preview")
async def admin_preview_render(
    render_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = await db.get(CombinationRender, render_id)
    if not row:
        raise HTTPException(404, "Render not found")
    return {"front_url": row.front_url, "collar_url": row.collar_url, "cuff_url": row.cuff_url}
