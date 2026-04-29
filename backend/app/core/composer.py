"""
Composer — the ONLY module that touches pixels.
The API layer never imports Pillow; all rendering goes through here.
"""
import time
from dataclasses import dataclass
from pathlib import Path
from PIL import Image
from typing import Optional

from app.config import settings
from app.core.assets import load_png
from app.core.masks import apply_mask, load_mask
from app.core.tiling import tile_fabric
from app.core.blend import alpha_over, multiply, screen, set_alpha
from app.db.models import Fabric, Collar, Cuff, ShirtTemplate


@dataclass
class RenderResult:
    path: str          # filesystem path
    url: str           # public URL
    cache_hit: bool
    ms: int


def _render_path(collar_sku: str, cuff_sku: str, fabric_sku: str, view: str) -> Path:
    d = settings.render_path / collar_sku / cuff_sku / fabric_sku
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{view}.png"


def _render_url(collar_sku: str, cuff_sku: str, fabric_sku: str, view: str) -> str:
    return f"{settings.render_serve_base_url}/{collar_sku}/{cuff_sku}/{fabric_sku}/{view}.png"


def _render_part(collar_or_cuff, tile: Image.Image, mm_per_px: float) -> Image.Image:
    """Render a single collar or cuff part onto a transparent canvas slice."""
    base = load_mask(collar_or_cuff.base_mask_path)
    fabric_region = apply_mask(tile, load_mask(collar_or_cuff.fabric_mask_path))
    shading = load_mask(collar_or_cuff.shading_path)
    shaded = multiply(fabric_region, shading)
    if collar_or_cuff.highlight_path:
        highlight = load_mask(collar_or_cuff.highlight_path)
        shaded = screen(shaded, highlight)
    return set_alpha(shaded, base)


def _slot_anchor(slot: Optional[dict]) -> tuple[int, int]:
    if not slot:
        return (0, 0)
    return (int(slot.get("x", 0)), int(slot.get("y", 0)))


def compose_view(
    view: str,
    template: ShirtTemplate,
    fabric: Fabric,
    collar: Collar,
    cuff: Cuff,
) -> Image.Image:
    """
    Pure deterministic compositing — returns a PIL Image.
    No file I/O happens here; the caller saves it.
    """
    canvas_size = (template.canvas_w, template.canvas_h)
    mm_per_px = float(template.mm_per_px)

    # Load fabric tile
    fabric_tile_img = load_png(fabric.tile_path)
    tile = tile_fabric(fabric_tile_img, canvas_size, float(fabric.tile_width_mm), mm_per_px)

    canvas = Image.new("RGBA", canvas_size, (255, 255, 255, 0))

    # Shirt body (only on front view)
    if view == "front" and template.body_fabric_mask_path:
        body_fabric = apply_mask(tile, load_mask(template.body_fabric_mask_path))
        canvas = alpha_over(canvas, body_fabric)
        if template.body_shading_path:
            canvas = multiply(canvas, load_mask(template.body_shading_path))
        if template.placket_overlay_path:
            canvas = alpha_over(canvas, load_png(template.placket_overlay_path))

    # Collar
    if view in ("front", "collar_detail"):
        collar_layer = _render_part(collar, tile, mm_per_px)
        anchor = _slot_anchor(template.collar_slot)
        canvas = alpha_over(canvas, collar_layer, anchor)

    # Cuff
    if view in ("front", "cuff_detail"):
        cuff_layer = _render_part(cuff, tile, mm_per_px)
        anchor = _slot_anchor(template.cuff_slot)
        canvas = alpha_over(canvas, cuff_layer, anchor)

    return canvas


def render_view(
    view: str,
    template: ShirtTemplate,
    fabric: Fabric,
    collar: Collar,
    cuff: Cuff,
) -> RenderResult:
    t0 = time.perf_counter()
    out_path = _render_path(collar.sku, cuff.sku, fabric.sku, view)
    url = _render_url(collar.sku, cuff.sku, fabric.sku, view)

    if out_path.exists():
        ms = int((time.perf_counter() - t0) * 1000)
        return RenderResult(path=str(out_path), url=url, cache_hit=True, ms=ms)

    image = compose_view(view, template, fabric, collar, cuff)
    image.save(str(out_path), format="PNG", optimize=True)
    ms = int((time.perf_counter() - t0) * 1000)
    return RenderResult(path=str(out_path), url=url, cache_hit=False, ms=ms)


def render_all(
    template_front: ShirtTemplate,
    template_collar: ShirtTemplate,
    template_cuff: ShirtTemplate,
    fabric: Fabric,
    collar: Collar,
    cuff: Cuff,
) -> dict:
    """Render all 3 views and return their URLs."""
    t0 = time.perf_counter()
    front = render_view("front", template_front, fabric, collar, cuff)
    col = render_view("collar_detail", template_collar, fabric, collar, cuff)
    cuf = render_view("cuff_detail", template_cuff, fabric, collar, cuff)
    ms = int((time.perf_counter() - t0) * 1000)
    return {
        "front_url": front.url,
        "collar_url": col.url,
        "cuff_url": cuf.url,
        "ms": ms,
        "cache_hit": front.cache_hit and col.cache_hit and cuf.cache_hit,
    }
