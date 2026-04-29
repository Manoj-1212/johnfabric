"""
Server-side asset validation — run at upload time.
Blocks ingestion if validation fails.
"""
from PIL import Image
import numpy as np
from io import BytesIO


class ValidationError(Exception):
    pass


def validate_fabric_tile(data: bytes) -> None:
    img = Image.open(BytesIO(data)).convert("RGBA")
    w, h = img.size
    if w != h:
        raise ValidationError(f"Tile must be square. Got {w}x{h}.")
    if w < 64:
        raise ValidationError(f"Tile too small: {w}px. Minimum 64px.")

    # 2×2 seam test
    composite = Image.new("RGBA", (w * 2, h * 2))
    for x, y in [(0, 0), (w, 0), (0, h), (w, h)]:
        composite.paste(img, (x, y))
    delta = _seam_delta(composite, w, h)
    if delta > 10:
        raise ValidationError(
            f"Tile has visible seams (delta={delta:.1f}, max allowed=10). "
            "Ensure the tile tiles seamlessly."
        )


def validate_shading_layer(data: bytes) -> None:
    img = Image.open(BytesIO(data)).convert("L")
    arr = np.array(img, dtype=np.float32)
    midpoint = float(np.mean(arr))
    if not (115 < midpoint < 140):
        raise ValidationError(
            f"Shading midpoint is {midpoint:.0f}. Must be 115–140 (target: 127). "
            "Ensure 50% grey = neutral shadow."
        )


def validate_mask_layer(data: bytes) -> None:
    img = Image.open(BytesIO(data))
    if img.mode not in ("RGBA", "L", "RGB"):
        raise ValidationError(f"Unsupported image mode: {img.mode}. Use PNG.")


def _seam_delta(composite: Image.Image, w: int, h: int) -> float:
    arr = np.array(composite.convert("L"), dtype=np.float32)
    # Check horizontal seam at y=h
    row_above = arr[h - 1, :]
    row_below = arr[h, :]
    h_delta = float(np.mean(np.abs(row_above - row_below)))
    # Check vertical seam at x=w
    col_left = arr[:, w - 1]
    col_right = arr[:, w]
    v_delta = float(np.mean(np.abs(col_left - col_right)))
    return max(h_delta, v_delta)
