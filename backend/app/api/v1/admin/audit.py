from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import AdminAuditLog, User
from app.middleware.auth import require_admin

router = APIRouter(tags=["admin-audit"])


@router.get("/audit")
async def get_audit_log(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "admin_id": str(r.admin_id),
            "action": r.action,
            "target_type": r.target_type,
            "target_id": str(r.target_id) if r.target_id else None,
            "meta": r.meta,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
