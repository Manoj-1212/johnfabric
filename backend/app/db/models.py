import uuid
from sqlalchemy import (
    Boolean, Column, Integer, Numeric, Text, BigInteger,
    ForeignKey, UniqueConstraint, Index, text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMPTZ
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    role = Column(Text, nullable=False, default="customer")  # customer | admin
    created_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)


class Fabric(Base):
    __tablename__ = "fabrics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    tier = Column(Text, nullable=False)  # A | B | C
    tile_path = Column(Text, nullable=False)
    tile_width_mm = Column(Numeric, nullable=False)
    pattern_type = Column(Text, nullable=False)  # solid | stripe | check | herringbone
    colorway = Column(Text)
    hex_primary = Column(Text)
    asset_version = Column(Integer, nullable=False, default=1)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)


class Collar(Base):
    __tablename__ = "collars"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    style = Column(Text, nullable=False)  # spread | cutaway | button-down | club | wing
    base_mask_path = Column(Text, nullable=False)
    fabric_mask_path = Column(Text, nullable=False)
    shading_path = Column(Text, nullable=False)
    highlight_path = Column(Text)
    preview_anchor_xy = Column(JSONB, nullable=False)
    asset_version = Column(Integer, nullable=False, default=1)
    active = Column(Boolean, nullable=False, default=True)


class Cuff(Base):
    __tablename__ = "cuffs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    style = Column(Text, nullable=False)  # barrel | french | convertible | rounded
    base_mask_path = Column(Text, nullable=False)
    fabric_mask_path = Column(Text, nullable=False)
    shading_path = Column(Text, nullable=False)
    highlight_path = Column(Text)
    preview_anchor_xy = Column(JSONB, nullable=False)
    asset_version = Column(Integer, nullable=False, default=1)
    active = Column(Boolean, nullable=False, default=True)


class ShirtTemplate(Base):
    __tablename__ = "shirt_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    view = Column(Text, unique=True, nullable=False)  # front | collar_detail | cuff_detail
    canvas_w = Column(Integer, nullable=False)
    canvas_h = Column(Integer, nullable=False)
    mm_per_px = Column(Numeric, nullable=False)
    body_mask_path = Column(Text)
    body_fabric_mask_path = Column(Text)
    body_shading_path = Column(Text)
    placket_overlay_path = Column(Text)
    collar_slot = Column(JSONB)   # {"x","y","w","h","rotation"}
    cuff_slot = Column(JSONB)


class Render(Base):
    """Ephemeral render cache metadata (legacy — use combination_renders for permanent)."""
    __tablename__ = "renders"
    cache_key = Column(Text, primary_key=True)
    view = Column(Text, nullable=False)
    collar_id = Column(UUID(as_uuid=True), ForeignKey("collars.id"))
    cuff_id = Column(UUID(as_uuid=True), ForeignKey("cuffs.id"))
    fabric_id = Column(UUID(as_uuid=True), ForeignKey("fabrics.id"))
    path = Column(Text, nullable=False)
    bytes = Column(Integer)
    ms = Column(Integer)
    created_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)


class CombinationRender(Base):
    """Permanent, one row per (collar, cuff, fabric) combo."""
    __tablename__ = "combination_renders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collar_id = Column(UUID(as_uuid=True), ForeignKey("collars.id"), nullable=False)
    cuff_id = Column(UUID(as_uuid=True), ForeignKey("cuffs.id"), nullable=False)
    fabric_id = Column(UUID(as_uuid=True), ForeignKey("fabrics.id"), nullable=False)
    front_url = Column(Text, nullable=False)
    collar_url = Column(Text, nullable=False)
    cuff_url = Column(Text, nullable=False)
    asset_version_collar = Column(Integer, nullable=False)
    asset_version_cuff = Column(Integer, nullable=False)
    asset_version_fabric = Column(Integer, nullable=False)
    is_valid = Column(Boolean, nullable=False, default=True)
    rendered_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)

    __table_args__ = (
        UniqueConstraint("collar_id", "cuff_id", "fabric_id", name="uq_combo"),
        Index("idx_cr_lookup", "collar_id", "cuff_id", "fabric_id",
              postgresql_where=text("is_valid = TRUE")),
    )


class SavedConfig(Base):
    __tablename__ = "saved_configs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name = Column(Text)
    collar_id = Column(UUID(as_uuid=True), ForeignKey("collars.id"))
    cuff_id = Column(UUID(as_uuid=True), ForeignKey("cuffs.id"))
    fabric_id = Column(UUID(as_uuid=True), ForeignKey("fabrics.id"))
    created_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)


class Event(Base):
    __tablename__ = "events"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(Text)
    user_id = Column(UUID(as_uuid=True))
    event_type = Column(Text, nullable=False)  # view | select | save | order
    collar_id = Column(UUID(as_uuid=True))
    cuff_id = Column(UUID(as_uuid=True))
    fabric_id = Column(UUID(as_uuid=True))
    meta = Column(JSONB)
    created_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)

    __table_args__ = (
        Index("idx_events_user", "user_id", "created_at"),
        Index("idx_events_fabric", "fabric_id"),
    )


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(Text, nullable=False)
    target_type = Column(Text)
    target_id = Column(UUID(as_uuid=True))
    meta = Column(JSONB)
    created_at = Column(TIMESTAMPTZ, server_default=text("NOW()"), nullable=False)
