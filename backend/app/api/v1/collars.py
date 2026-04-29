from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db import crud, schemas
from app.config import settings

router = APIRouter(tags=["catalog"])


@router.get("/collars", response_model=list[schemas.CollarOut])
async def list_collars(db: AsyncSession = Depends(get_db)):
    collars = await crud.get_collars(db)
    result = []
    for c in collars:
        out = schemas.CollarOut.model_validate(c)
        out.thumb_url = f"{settings.render_serve_base_url.replace('/renders', '/assets')}/collars/{c.sku}/thumb.png"
        result.append(out)
    return result
