"""
Seed script: admin user + shirt templates + sample catalog + placeholder PNG assets.
Run: python -m app.db.seed
"""
import asyncio
import os
from pathlib import Path


# ─── Placeholder asset generation (sync, Pillow) ──────────────────────────────

def _gen_placeholder_assets() -> None:
    """Generate minimal PNGs so the Composer renders something before real
    product photography is uploaded via the admin panel."""
    try:
        from PIL import Image, ImageDraw, ImageFilter
    except ImportError:
        print("  [skip] Pillow not available — skipping asset generation")
        return

    asset_base = Path(os.environ.get("ASSET_BASE_PATH", "./assets"))

    # ── Fabric tile: warm off-white twill ──────────────────────────────────
    fabric_dir = asset_base / "fabrics" / "F-A-001-WHITE"
    fabric_dir.mkdir(parents=True, exist_ok=True)
    if not (fabric_dir / "tile.png").exists():
        tile = Image.new("RGBA", (200, 200), (242, 238, 230, 255))
        draw = ImageDraw.Draw(tile)
        for i in range(-200, 400, 8):
            draw.line([(i, 0), (i + 200, 200)], fill=(230, 225, 215, 120), width=1)
        for i in range(-200, 400, 8):
            draw.line([(i, 200), (i + 200, 0)], fill=(235, 230, 220, 80), width=1)
        tile.save(str(fabric_dir / "tile.png"))

    # ── Collar: SPREAD-01 ──────────────────────────────────────────────────
    collar_dir = asset_base / "collars" / "SPREAD-01"
    collar_dir.mkdir(parents=True, exist_ok=True)
    sz = (400, 400)

    if not (collar_dir / "base_mask.png").exists():
        img = Image.new("RGBA", sz, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.polygon(
            [(200, 30), (370, 180), (280, 280), (200, 210), (120, 280), (30, 180)],
            fill=(255, 255, 255, 255),
        )
        img.filter(ImageFilter.GaussianBlur(2)).save(str(collar_dir / "base_mask.png"))

    if not (collar_dir / "fabric_mask.png").exists():
        img = Image.new("RGBA", sz, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.polygon(
            [(200, 30), (370, 180), (280, 280), (200, 210), (120, 280), (30, 180)],
            fill=(255, 255, 255, 255),
        )
        img.save(str(collar_dir / "fabric_mask.png"))

    if not (collar_dir / "shading.png").exists():
        img = Image.new("L", sz, 132)
        draw = ImageDraw.Draw(img)
        for r, v in [(180, 105), (130, 118), (80, 128)]:
            draw.ellipse([200 - r, 200 - r, 200 + r, 200 + r], fill=v)
        img.filter(ImageFilter.GaussianBlur(35)).save(str(collar_dir / "shading.png"))

    # ── Cuff: BARREL-01 ───────────────────────────────────────────────────
    cuff_dir = asset_base / "cuffs" / "BARREL-01"
    cuff_dir.mkdir(parents=True, exist_ok=True)

    if not (cuff_dir / "base_mask.png").exists():
        img = Image.new("RGBA", sz, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([40, 100, 360, 300], radius=18, fill=(255, 255, 255, 255))
        img.filter(ImageFilter.GaussianBlur(2)).save(str(cuff_dir / "base_mask.png"))

    if not (cuff_dir / "fabric_mask.png").exists():
        img = Image.new("RGBA", sz, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([40, 100, 360, 300], radius=18, fill=(255, 255, 255, 255))
        img.save(str(cuff_dir / "fabric_mask.png"))

    if not (cuff_dir / "shading.png").exists():
        img = Image.new("L", sz, 132)
        draw = ImageDraw.Draw(img)
        draw.rectangle([40, 100, 360, 300], fill=118)
        img.filter(ImageFilter.GaussianBlur(30)).save(str(cuff_dir / "shading.png"))

    # ── Front template body masks ──────────────────────────────────────────
    tpl_dir = asset_base / "templates" / "front"
    tpl_dir.mkdir(parents=True, exist_ok=True)

    if not (tpl_dir / "body_fabric_mask.png").exists():
        img = Image.new("RGBA", (800, 1000), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        body = [(220, 0), (580, 0), (700, 160), (690, 1000), (110, 1000), (100, 160)]
        draw.polygon(body, fill=(255, 255, 255, 255))
        img.filter(ImageFilter.GaussianBlur(3)).save(str(tpl_dir / "body_fabric_mask.png"))

    if not (tpl_dir / "body_shading.png").exists():
        img = Image.new("L", (800, 1000), 135)
        draw = ImageDraw.Draw(img)
        draw.rectangle([100, 0, 220, 1000], fill=105)
        draw.rectangle([580, 0, 700, 1000], fill=105)
        img.filter(ImageFilter.GaussianBlur(65)).save(str(tpl_dir / "body_shading.png"))

    print("  Placeholder assets ready")


# ─── DB seed ──────────────────────────────────────────────────────────────────

async def seed() -> None:
    import bcrypt as _bcrypt
    from sqlalchemy import select, text

    from app.db.session import engine, AsyncSessionLocal
    from app.db import models

    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
        # Safe column migration for existing DBs
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password TEXT")
        )

    default_password = os.environ.get("ADMIN_PASSWORD", "John@1234")
    hashed = _bcrypt.hashpw(default_password.encode(), _bcrypt.gensalt()).decode()

    async with AsyncSessionLocal() as db:
        # ── Admin user ────────────────────────────────────────────────────
        row = await db.execute(
            select(models.User).where(models.User.email == "admin@johnfabric.com")
        )
        admin = row.scalar_one_or_none()
        if not admin:
            db.add(models.User(
                email="admin@johnfabric.com", role="admin", hashed_password=hashed
            ))
            print(f"  Created admin: admin@johnfabric.com / {default_password}")
        else:
            admin.hashed_password = hashed
            print(f"  Updated admin password: admin@johnfabric.com / {default_password}")

        # ── Shirt templates ───────────────────────────────────────────────
        for view, w, h in [
            ("front", 800, 1000),
            ("collar_detail", 400, 400),
            ("cuff_detail", 400, 400),
        ]:
            row = await db.execute(
                select(models.ShirtTemplate).where(models.ShirtTemplate.view == view)
            )
            if not row.scalar_one_or_none():
                is_front = view == "front"
                db.add(models.ShirtTemplate(
                    view=view,
                    canvas_w=w,
                    canvas_h=h,
                    mm_per_px=0.25,
                    body_fabric_mask_path="templates/front/body_fabric_mask.png" if is_front else None,
                    body_shading_path="templates/front/body_shading.png" if is_front else None,
                    collar_slot={"x": 260, "y": 20, "w": 280, "h": 220} if is_front else {"x": 0, "y": 0},
                    cuff_slot={"x": 50, "y": 720, "w": 240, "h": 180} if is_front else {"x": 0, "y": 0},
                ))

        # ── Sample fabric ─────────────────────────────────────────────────
        row = await db.execute(
            select(models.Fabric).where(models.Fabric.sku == "F-A-001-WHITE")
        )
        if not row.scalar_one_or_none():
            db.add(models.Fabric(
                sku="F-A-001-WHITE",
                name="Classic White Twill",
                tier="A",
                tile_path="fabrics/F-A-001-WHITE/tile.png",
                tile_width_mm=20.0,
                pattern_type="solid",
                colorway="white",
                hex_primary="#F2EEE6",
            ))

        # ── Sample collar ─────────────────────────────────────────────────
        row = await db.execute(
            select(models.Collar).where(models.Collar.sku == "SPREAD-01")
        )
        if not row.scalar_one_or_none():
            db.add(models.Collar(
                sku="SPREAD-01",
                name="Classic Spread",
                style="spread",
                base_mask_path="collars/SPREAD-01/base_mask.png",
                fabric_mask_path="collars/SPREAD-01/fabric_mask.png",
                shading_path="collars/SPREAD-01/shading.png",
                preview_anchor_xy={"x": 120, "y": 80},
            ))

        # ── Sample cuff ───────────────────────────────────────────────────
        row = await db.execute(
            select(models.Cuff).where(models.Cuff.sku == "BARREL-01")
        )
        if not row.scalar_one_or_none():
            db.add(models.Cuff(
                sku="BARREL-01",
                name="Classic Barrel",
                style="barrel",
                base_mask_path="cuffs/BARREL-01/base_mask.png",
                fabric_mask_path="cuffs/BARREL-01/fabric_mask.png",
                shading_path="cuffs/BARREL-01/shading.png",
                preview_anchor_xy={"x": 100, "y": 100},
            ))

        await db.commit()

    # Generate placeholder PNGs after DB is seeded
    _gen_placeholder_assets()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
