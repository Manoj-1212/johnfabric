import uuid
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict


# ─── Fabric ───────────────────────────────────────────────────────────────────

class FabricBase(BaseModel):
    sku: str
    name: str
    tier: str
    tile_path: str
    tile_width_mm: float
    pattern_type: str
    colorway: Optional[str] = None
    hex_primary: Optional[str] = None

class FabricCreate(FabricBase):
    pass

class FabricUpdate(BaseModel):
    name: Optional[str] = None
    tier: Optional[str] = None
    colorway: Optional[str] = None
    hex_primary: Optional[str] = None
    active: Optional[bool] = None

class FabricOut(FabricBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    asset_version: int
    active: bool
    swatch_url: Optional[str] = None


# ─── Collar ───────────────────────────────────────────────────────────────────

class CollarBase(BaseModel):
    sku: str
    name: str
    style: str
    base_mask_path: str
    fabric_mask_path: str
    shading_path: str
    highlight_path: Optional[str] = None
    preview_anchor_xy: dict

class CollarCreate(CollarBase):
    pass

class CollarUpdate(BaseModel):
    name: Optional[str] = None
    style: Optional[str] = None
    active: Optional[bool] = None

class CollarOut(CollarBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    asset_version: int
    active: bool
    thumb_url: Optional[str] = None


# ─── Cuff ─────────────────────────────────────────────────────────────────────

class CuffBase(BaseModel):
    sku: str
    name: str
    style: str
    base_mask_path: str
    fabric_mask_path: str
    shading_path: str
    highlight_path: Optional[str] = None
    preview_anchor_xy: dict

class CuffCreate(CuffBase):
    pass

class CuffUpdate(BaseModel):
    name: Optional[str] = None
    style: Optional[str] = None
    active: Optional[bool] = None

class CuffOut(CuffBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    asset_version: int
    active: bool
    thumb_url: Optional[str] = None


# ─── Render ───────────────────────────────────────────────────────────────────

class RenderRequest(BaseModel):
    view: str
    collar_id: uuid.UUID
    cuff_id: uuid.UUID
    fabric_id: uuid.UUID

class RenderAllRequest(BaseModel):
    collar_id: uuid.UUID
    cuff_id: uuid.UUID
    fabric_id: uuid.UUID

class RenderResponse(BaseModel):
    url: str
    cache_hit: bool
    ms: int

class RenderAllResponse(BaseModel):
    front_url: str
    collar_url: str
    cuff_url: str
    source: str  # "redis" | "db" | "generated"
    render_id: Optional[uuid.UUID] = None
    ms: int


# ─── Saved Config ─────────────────────────────────────────────────────────────

class ConfigCreate(BaseModel):
    name: Optional[str] = None
    collar_id: uuid.UUID
    cuff_id: uuid.UUID
    fabric_id: uuid.UUID

class ConfigOut(ConfigCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None


# ─── Event ────────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    event_type: str
    collar_id: Optional[uuid.UUID] = None
    cuff_id: Optional[uuid.UUID] = None
    fabric_id: Optional[uuid.UUID] = None
    meta: Optional[dict] = None
    session_id: Optional[str] = None


# ─── User ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    role: str = "customer"

class UserOut(UserCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
