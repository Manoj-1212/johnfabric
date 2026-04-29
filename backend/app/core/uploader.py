"""File uploader — local filesystem with optional S3 swap."""
import uuid
from pathlib import Path
from app.config import settings


def save_asset(data: bytes, asset_type: str, sku: str, filename: str) -> str:
    """Save to local disk. Returns the relative asset path stored in DB."""
    folder = settings.asset_path / asset_type / sku
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / filename
    dest.write_bytes(data)
    return str(Path(asset_type) / sku / filename)


def save_render(data: bytes, collar_sku: str, cuff_sku: str, fabric_sku: str, view: str) -> str:
    folder = settings.render_path / collar_sku / cuff_sku / fabric_sku
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / f"{view}.png"
    dest.write_bytes(data)
    return str(dest)
