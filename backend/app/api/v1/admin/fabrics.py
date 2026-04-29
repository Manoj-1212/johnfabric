import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db import crud, schemas
from app.middleware.auth import require_admin
from app.db.models import User
from app.core.validation import validate_fabric_tile, ValidationError
from app.core.uploader import save_asset

router = APIRouter(tags=["admin-fabrics"])


@router.get("/fabrics", response_model=list[schemas.FabricOut])
async def admin_list_fabrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await crud.get_fabrics(db, active_only=False)


@router.post("/fabrics", response_model=schemas.FabricOut, status_code=201)
async def admin_create_fabric(
    body: schemas.FabricCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    obj = await crud.create_fabric(db, body.model_dump())
    await crud.log_audit(db, admin.id, "create_fabric", "fabric", obj.id, {"sku": obj.sku})
    return obj


@router.patch("/fabrics/{fabric_id}", response_model=schemas.FabricOut)
async def admin_update_fabric(
    fabric_id: uuid.UUID,
    body: schemas.FabricUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    updated = await crud.update_fabric(db, fabric_id, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(404, "Fabric not found")
    await crud.log_audit(db, admin.id, "update_fabric", "fabric", fabric_id)
    return updated


@router.delete("/fabrics/{fabric_id}", status_code=204)
async def admin_delete_fabric(
    fabric_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    await crud.update_fabric(db, fabric_id, {"active": False})
    await crud.log_audit(db, admin.id, "delete_fabric", "fabric", fabric_id)


@router.post("/fabrics/{fabric_id}/asset")
async def admin_upload_fabric_asset(
    fabric_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    fabric = await crud.get_fabric(db, fabric_id)
    if not fabric:
        raise HTTPException(404, "Fabric not found")

    data = await file.read()
    try:
        validate_fabric_tile(data)
    except ValidationError as e:
        raise HTTPException(422, str(e))

    path = save_asset(data, "fabrics", fabric.sku, "tile.png")
    # Bump asset_version to auto-invalidate cached renders
    await crud.update_fabric(db, fabric_id, {"tile_path": path, "asset_version": fabric.asset_version + 1})
    await crud.invalidate_renders_for_fabric(db, fabric_id)
    await crud.log_audit(db, admin.id, "upload_fabric_asset", "fabric", fabric_id)
    return {"path": path, "asset_version": fabric.asset_version + 1}
