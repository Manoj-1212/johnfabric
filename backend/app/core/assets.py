from pathlib import Path
from PIL import Image
from app.config import settings


def resolve_asset(path: str) -> Path:
    """Resolve an asset path relative to the asset base or as an absolute path."""
    p = Path(path)
    if p.is_absolute():
        return p
    return settings.asset_path / p


def load_png(path: str) -> Image.Image:
    full = resolve_asset(path)
    if not full.exists():
        raise FileNotFoundError(f"Asset not found: {full}")
    return Image.open(full).convert("RGBA")


def asset_exists(path: str) -> bool:
    return resolve_asset(path).exists()
