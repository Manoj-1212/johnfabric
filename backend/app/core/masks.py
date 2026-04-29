from PIL import Image
from app.core.assets import load_png


def load_mask(path: str) -> Image.Image:
    """Load a mask PNG and return as RGBA."""
    return load_png(path)


def apply_mask(source: Image.Image, mask: Image.Image) -> Image.Image:
    """
    Apply a mask to a source image.
    White pixels in the mask = show source, black = transparent.
    Both must be RGBA and the same size.
    """
    source = source.copy().convert("RGBA")
    mask = mask.convert("L").resize(source.size, Image.LANCZOS)
    r, g, b, a = source.split()
    a = Image.eval(a, lambda x: 0)  # start fully transparent
    a = mask  # use mask luminance as alpha
    return Image.merge("RGBA", (r, g, b, a))


def feather_mask(mask: Image.Image, radius: int = 2) -> Image.Image:
    """Slightly blur mask edges to avoid hard pixel cutouts."""
    from PIL import ImageFilter
    return mask.filter(ImageFilter.GaussianBlur(radius))
