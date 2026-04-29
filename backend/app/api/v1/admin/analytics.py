from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.middleware.auth import require_admin
from app.db.models import User

router = APIRouter(tags=["admin-analytics"])


@router.get("/analytics/popular")
async def popular_combos(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(text("""
        SELECT collar_id, cuff_id, fabric_id, COUNT(*) as count
        FROM events
        WHERE event_type = 'select'
        GROUP BY collar_id, cuff_id, fabric_id
        ORDER BY count DESC
        LIMIT :limit
    """), {"limit": limit})
    return [dict(r._mapping) for r in result]


@router.get("/analytics/fabrics")
async def fabric_frequency(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(text("""
        SELECT fabric_id, COUNT(*) as count
        FROM events
        WHERE fabric_id IS NOT NULL
        GROUP BY fabric_id
        ORDER BY count DESC
        LIMIT 20
    """))
    return [dict(r._mapping) for r in result]


@router.get("/analytics/funnel")
async def funnel(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(text("""
        SELECT event_type, COUNT(*) as count
        FROM events
        GROUP BY event_type
        ORDER BY count DESC
    """))
    return [dict(r._mapping) for r in result]
