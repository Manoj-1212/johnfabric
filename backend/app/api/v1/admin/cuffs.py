import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db import crud, schemas
from app.middleware.auth import require_admin
from app.db.models import User
from app.core.validation import validate_mask_layer, validate_shading_layer, ValidationError
from app.core.uploader import save_asset

router = APIRouter(tags=["admin-cuffs"])

LAYER_VALIDATORS = {
    "base_mask.png": validate_mask_layer,
    "fabric_mask.png": validate_mask_layer,
    "shading.png": validate_shading_layer,
    "highlight.png": validate_mask_layer,
}


@router.get("/cuffs", response_model=list[schemas.CuffOut])
async def admin_list_cuffs(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await crud.get_cuffs(db, active_only=False)


@router.post("/cuffs", response_model=schemas.CuffOut, status_code=201)
async def admin_create_cuff(
    body: schemas.CuffCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    obj = await crud.create_cuff(db, body.model_dump())
    await crud.log_audit(db, admin.id, "create_cuff", "cuff", obj.id, {"sku": obj.sku})
    return obj


@router.patch("/cuffs/{cuff_id}", response_model=schemas.CuffOut)
async def admin_update_cuff(
    cuff_id: uuid.UUID,
    body: schemas.CuffUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    updated = await crud.update_cuff(db, cuff_id, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(404, "Cuff not found")
    await crud.log_audit(db, admin.id, "update_cuff", "cuff", cuff_id)
    return updated


@router.post("/cuffs/{cuff_id}/asset")
async def admin_upload_cuff_asset(
    cuff_id: uuid.UUID,
    layer: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    cuff = await crud.get_cuff(db, cuff_id)
    if not cuff:
        raise HTTPException(404, "Cuff not found")

    filename = f"{layer}.png"
    validator = LAYER_VALIDATORS.get(filename)
    data = await file.read()
    if validator:
        try:
            validator(data)
        except ValidationError as e:
            raise HTTPException(422, str(e))

    path = save_asset(data, "cuffs", cuff.sku, filename)
    field_map = {
        "base_mask": "base_mask_path",
        "fabric_mask": "fabric_mask_path",
        "shading": "shading_path",
        "highlight": "highlight_path",
    }
    field = field_map.get(layer)
    if field:
        await crud.update_cuff(db, cuff_id, {
            field: path,
            "asset_version": cuff.asset_version + 1
        })
        await crud.invalidate_renders_for_cuff(db, cuff_id)

    await crud.log_audit(db, admin.id, "upload_cuff_asset", "cuff", cuff_id, {"layer": layer})
    return {"path": path}
