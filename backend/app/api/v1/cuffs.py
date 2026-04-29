from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db import crud, schemas
from app.config import settings

router = APIRouter(tags=["catalog"])


@router.get("/cuffs", response_model=list[schemas.CuffOut])
async def list_cuffs(db: AsyncSession = Depends(get_db)):
    cuffs = await crud.get_cuffs(db)
    result = []
    for c in cuffs:
        out = schemas.CuffOut.model_validate(c)
        out.thumb_url = f"{settings.render_serve_base_url.replace('/renders', '/assets')}/cuffs/{c.sku}/thumb.png"
        result.append(out)
    return result
