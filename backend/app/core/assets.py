from pathlib import Path
from PIL import Image
from app.config import settings


def resolve_asset(path: str) -> Path:
    """Resolve an asset path relative to the asset base or as an absolute path."""
    p = Path(path)
    if p.is_absolute():
        return p
    return settings.asset_path / p


def load_png(path: str, fallback_size: tuple = (400, 400), fallback_color: tuple = (200, 200, 200, 200)) -> Image.Image:
    full = resolve_asset(path)
    if not full.exists():
        import warnings
        warnings.warn(f"Asset not found (using placeholder): {full}", stacklevel=2)
        return Image.new("RGBA", fallback_size, fallback_color)
    return Image.open(full).convert("RGBA")


def asset_exists(path: str) -> bool:
    return resolve_asset(path).exists()
