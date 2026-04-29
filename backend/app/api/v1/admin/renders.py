import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import List, Optional

from app.db.session import get_db
from app.db import crud, models
from app.middleware.auth import require_admin
from app.db.models import User, CombinationRender

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
