from PIL import Image


def tile_fabric(tile: Image.Image, canvas_size: tuple[int, int],
                tile_width_mm: float, mm_per_px: float) -> Image.Image:
    """
    Tile a fabric tile image to fill canvas_size (w, h) pixels.
    tile_width_mm: real-world width the tile represents.
    mm_per_px: how many mm one pixel equals on the template canvas.
    """
    tile_px = max(1, int(round(tile_width_mm / mm_per_px)))
    tile_resized = tile.resize((tile_px, tile_px), Image.LANCZOS).convert("RGBA")

    canvas_w, canvas_h = canvas_size
    tiled = Image.new("RGBA", (canvas_w, canvas_h))

    for y in range(0, canvas_h, tile_px):
        for x in range(0, canvas_w, tile_px):
            tiled.paste(tile_resized, (x, y))

    return tiled
