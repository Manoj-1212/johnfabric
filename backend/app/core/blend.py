from PIL import Image, ImageChops


def alpha_over(base: Image.Image, overlay: Image.Image,
               anchor: tuple[int, int] = (0, 0)) -> Image.Image:
    """Alpha-composite overlay onto base at anchor (x, y)."""
    result = base.copy().convert("RGBA")
    if anchor == (0, 0):
        result.alpha_composite(overlay.convert("RGBA"))
    else:
        tmp = Image.new("RGBA", base.size, (0, 0, 0, 0))
        tmp.paste(overlay.convert("RGBA"), anchor)
        result.alpha_composite(tmp)
    return result


def multiply(base: Image.Image, shading: Image.Image) -> Image.Image:
    """
    Multiply blend mode: base * shading / 255.
    Shading should be grayscale — 127 = no change, darker = shadow.
    """
    base_rgb = base.convert("RGB")
    shading_rgb = shading.convert("RGB").resize(base_rgb.size, Image.LANCZOS)
    multiplied = ImageChops.multiply(base_rgb, shading_rgb)

    # Preserve original alpha
    r, g, b = multiplied.split()
    _, _, _, a = base.convert("RGBA").split()
    return Image.merge("RGBA", (r, g, b, a))


def screen(base: Image.Image, highlight: Image.Image) -> Image.Image:
    """
    Screen blend mode: 1 - (1 - base) * (1 - highlight).
    Used for gloss / highlight accents.
    """
    base_rgb = base.convert("RGB")
    highlight_rgb = highlight.convert("RGB").resize(base_rgb.size, Image.LANCZOS)
    screened = ImageChops.screen(base_rgb, highlight_rgb)

    r, g, b = screened.split()
    _, _, _, a = base.convert("RGBA").split()
    return Image.merge("RGBA", (r, g, b, a))


def set_alpha(image: Image.Image, alpha_mask: Image.Image) -> Image.Image:
    """Replace the alpha channel of image with the luminance of alpha_mask."""
    image = image.convert("RGBA")
    mask_l = alpha_mask.convert("L").resize(image.size, Image.LANCZOS)
    r, g, b, _ = image.split()
    return Image.merge("RGBA", (r, g, b, mask_l))
