import uuid
from typing import Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


# ─── Fabrics ──────────────────────────────────────────────────────────────────

async def get_fabrics(db: AsyncSession, active_only: bool = True) -> List[models.Fabric]:
    q = select(models.Fabric)
    if active_only:
        q = q.where(models.Fabric.active == True)
    result = await db.execute(q)
    return result.scalars().all()


async def get_fabric(db: AsyncSession, fabric_id: uuid.UUID) -> Optional[models.Fabric]:
    return await db.get(models.Fabric, fabric_id)


async def create_fabric(db: AsyncSession, data: dict) -> models.Fabric:
    obj = models.Fabric(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_fabric(db: AsyncSession, fabric_id: uuid.UUID, data: dict) -> Optional[models.Fabric]:
    await db.execute(update(models.Fabric).where(models.Fabric.id == fabric_id).values(**data))
    await db.commit()
    return await get_fabric(db, fabric_id)


# ─── Collars ──────────────────────────────────────────────────────────────────

async def get_collars(db: AsyncSession, active_only: bool = True) -> List[models.Collar]:
    q = select(models.Collar)
    if active_only:
        q = q.where(models.Collar.active == True)
    result = await db.execute(q)
    return result.scalars().all()


async def get_collar(db: AsyncSession, collar_id: uuid.UUID) -> Optional[models.Collar]:
    return await db.get(models.Collar, collar_id)


async def create_collar(db: AsyncSession, data: dict) -> models.Collar:
    obj = models.Collar(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_collar(db: AsyncSession, collar_id: uuid.UUID, data: dict) -> Optional[models.Collar]:
    await db.execute(update(models.Collar).where(models.Collar.id == collar_id).values(**data))
    await db.commit()
    return await get_collar(db, collar_id)


# ─── Cuffs ────────────────────────────────────────────────────────────────────

async def get_cuffs(db: AsyncSession, active_only: bool = True) -> List[models.Cuff]:
    q = select(models.Cuff)
    if active_only:
        q = q.where(models.Cuff.active == True)
    result = await db.execute(q)
    return result.scalars().all()


async def get_cuff(db: AsyncSession, cuff_id: uuid.UUID) -> Optional[models.Cuff]:
    return await db.get(models.Cuff, cuff_id)


async def create_cuff(db: AsyncSession, data: dict) -> models.Cuff:
    obj = models.Cuff(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_cuff(db: AsyncSession, cuff_id: uuid.UUID, data: dict) -> Optional[models.Cuff]:
    await db.execute(update(models.Cuff).where(models.Cuff.id == cuff_id).values(**data))
    await db.commit()
    return await get_cuff(db, cuff_id)


# ─── Shirt Templates ──────────────────────────────────────────────────────────

async def get_template(db: AsyncSession, view: str) -> Optional[models.ShirtTemplate]:
    result = await db.execute(select(models.ShirtTemplate).where(models.ShirtTemplate.view == view))
    return result.scalar_one_or_none()


# ─── Combination Renders ──────────────────────────────────────────────────────

async def get_combination_render(
    db: AsyncSession,
    collar_id: uuid.UUID,
    cuff_id: uuid.UUID,
    fabric_id: uuid.UUID,
) -> Optional[models.CombinationRender]:
    result = await db.execute(
        select(models.CombinationRender).where(
            models.CombinationRender.collar_id == collar_id,
            models.CombinationRender.cuff_id == cuff_id,
            models.CombinationRender.fabric_id == fabric_id,
            models.CombinationRender.is_valid == True,
        )
    )
    return result.scalar_one_or_none()


async def upsert_combination_render(db: AsyncSession, data: dict) -> models.CombinationRender:
    existing = await get_combination_render(
        db, data["collar_id"], data["cuff_id"], data["fabric_id"]
    )
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        await db.commit()
        await db.refresh(existing)
        return existing
    obj = models.CombinationRender(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def invalidate_renders_for_collar(db: AsyncSession, collar_id: uuid.UUID):
    await db.execute(
        update(models.CombinationRender)
        .where(models.CombinationRender.collar_id == collar_id)
        .values(is_valid=False)
    )
    await db.commit()


async def invalidate_renders_for_cuff(db: AsyncSession, cuff_id: uuid.UUID):
    await db.execute(
        update(models.CombinationRender)
        .where(models.CombinationRender.cuff_id == cuff_id)
        .values(is_valid=False)
    )
    await db.commit()


async def invalidate_renders_for_fabric(db: AsyncSession, fabric_id: uuid.UUID):
    await db.execute(
        update(models.CombinationRender)
        .where(models.CombinationRender.fabric_id == fabric_id)
        .values(is_valid=False)
    )
    await db.commit()


# ─── Saved Configs ────────────────────────────────────────────────────────────

async def create_saved_config(db: AsyncSession, data: dict) -> models.SavedConfig:
    obj = models.SavedConfig(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_saved_config(db: AsyncSession, config_id: uuid.UUID) -> Optional[models.SavedConfig]:
    return await db.get(models.SavedConfig, config_id)


async def get_configs_for_user(db: AsyncSession, user_id: uuid.UUID) -> List[models.SavedConfig]:
    result = await db.execute(
        select(models.SavedConfig).where(models.SavedConfig.user_id == user_id)
    )
    return result.scalars().all()


# ─── Events ───────────────────────────────────────────────────────────────────

async def create_event(db: AsyncSession, data: dict) -> models.Event:
    obj = models.Event(**data)
    db.add(obj)
    await db.commit()
    return obj


# ─── Admin Audit ──────────────────────────────────────────────────────────────

async def log_audit(db: AsyncSession, admin_id: uuid.UUID, action: str,
                    target_type: str = None, target_id: uuid.UUID = None, meta: dict = None):
    obj = models.AdminAuditLog(
        admin_id=admin_id, action=action,
        target_type=target_type, target_id=target_id, meta=meta
    )
    db.add(obj)
    await db.commit()
