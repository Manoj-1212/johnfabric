import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db import crud, schemas
from app.middleware.auth import require_admin
from app.db.models import User
from app.core.validation import validate_mask_layer, validate_shading_layer, ValidationError
from app.core.uploader import save_asset

router = APIRouter(tags=["admin-collars"])

LAYER_VALIDATORS = {
    "base_mask.png": validate_mask_layer,
    "fabric_mask.png": validate_mask_layer,
    "shading.png": validate_shading_layer,
    "highlight.png": validate_mask_layer,
}


@router.get("/collars", response_model=list[schemas.CollarOut])
async def admin_list_collars(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await crud.get_collars(db, active_only=False)


@router.post("/collars", response_model=schemas.CollarOut, status_code=201)
async def admin_create_collar(
    body: schemas.CollarCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    obj = await crud.create_collar(db, body.model_dump())
    await crud.log_audit(db, admin.id, "create_collar", "collar", obj.id, {"sku": obj.sku})
    return obj


@router.patch("/collars/{collar_id}", response_model=schemas.CollarOut)
async def admin_update_collar(
    collar_id: uuid.UUID,
    body: schemas.CollarUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    updated = await crud.update_collar(db, collar_id, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(404, "Collar not found")
    await crud.log_audit(db, admin.id, "update_collar", "collar", collar_id)
    return updated


@router.post("/collars/{collar_id}/asset")
async def admin_upload_collar_asset(
    collar_id: uuid.UUID,
    layer: str,  # base_mask | fabric_mask | shading | highlight
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    collar = await crud.get_collar(db, collar_id)
    if not collar:
        raise HTTPException(404, "Collar not found")

    filename = f"{layer}.png"
    validator = LAYER_VALIDATORS.get(filename)
    data = await file.read()
    if validator:
        try:
            validator(data)
        except ValidationError as e:
            raise HTTPException(422, str(e))

    path = save_asset(data, "collars", collar.sku, filename)
    field_map = {
        "base_mask": "base_mask_path",
        "fabric_mask": "fabric_mask_path",
        "shading": "shading_path",
        "highlight": "highlight_path",
    }
    field = field_map.get(layer)
    if field:
        await crud.update_collar(db, collar_id, {
            field: path,
            "asset_version": collar.asset_version + 1
        })
        await crud.invalidate_renders_for_collar(db, collar_id)

    await crud.log_audit(db, admin.id, "upload_collar_asset", "collar", collar_id, {"layer": layer})
    return {"path": path}
