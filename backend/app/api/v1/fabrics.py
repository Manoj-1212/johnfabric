from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db import crud, schemas
from app.config import settings

router = APIRouter(tags=["catalog"])


@router.get("/fabrics", response_model=list[schemas.FabricOut])
async def list_fabrics(db: AsyncSession = Depends(get_db)):
    fabrics = await crud.get_fabrics(db)
    result = []
    for f in fabrics:
        out = schemas.FabricOut.model_validate(f)
        out.swatch_url = f"{settings.render_serve_base_url.replace('/renders', '/assets')}/fabrics/{f.sku}/tile.png"
        result.append(out)
    return result
