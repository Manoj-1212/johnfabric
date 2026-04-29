import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db import crud, schemas
from app.middleware.auth import get_current_user
from app.db.models import User

router = APIRouter(tags=["configs"])


@router.post("/configs", response_model=schemas.ConfigOut)
async def create_config(
    body: schemas.ConfigCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await crud.create_saved_config(db, {**body.model_dump(), "user_id": user.id})


@router.get("/configs", response_model=list[schemas.ConfigOut])
async def list_configs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await crud.get_configs_for_user(db, user.id)


@router.get("/configs/{config_id}", response_model=schemas.ConfigOut)
async def get_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cfg = await crud.get_saved_config(db, config_id)
    if not cfg or cfg.user_id != user.id:
        raise HTTPException(404, "Config not found")
    return cfg
