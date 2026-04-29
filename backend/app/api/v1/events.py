from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db import crud, schemas

router = APIRouter(tags=["events"])


@router.post("/events", status_code=201)
async def track_event(
    body: schemas.EventCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await crud.create_event(db, body.model_dump(exclude_none=True))
    return {"ok": True}
