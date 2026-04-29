"""
Seed script: creates an admin user + shirt templates + sample catalog.
Run: python -m app.db.seed
"""
import asyncio
from app.db.session import engine, AsyncSessionLocal
from app.db import models


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Admin user
        from sqlalchemy import select
        existing = await db.execute(select(models.User).where(models.User.email == "admin@johnfabric.com"))
        if not existing.scalar_one_or_none():
            db.add(models.User(email="admin@johnfabric.com", role="admin"))

        # Shirt templates (3 views) — canvas 800×1000px, 0.25 mm/px
        for view, w, h in [("front", 800, 1000), ("collar_detail", 400, 400), ("cuff_detail", 400, 400)]:
            existing = await db.execute(
                select(models.ShirtTemplate).where(models.ShirtTemplate.view == view)
            )
            if not existing.scalar_one_or_none():
                db.add(models.ShirtTemplate(
                    view=view,
                    canvas_w=w,
                    canvas_h=h,
                    mm_per_px=0.25,
                    body_fabric_mask_path="templates/front/body_fabric_mask.png" if view == "front" else None,
                    body_shading_path="templates/front/body_shading.png" if view == "front" else None,
                    placket_overlay_path="templates/front/placket_overlay.png" if view == "front" else None,
                    collar_slot={"x": 280, "y": 60, "w": 240, "h": 180, "rotation": 0} if view == "front" else None,
                    cuff_slot={"x": 60, "y": 700, "w": 200, "h": 160, "rotation": 0} if view == "front" else None,
                ))

        # Sample fabric
        existing = await db.execute(select(models.Fabric).where(models.Fabric.sku == "F-A-001-WHITE"))
        if not existing.scalar_one_or_none():
            db.add(models.Fabric(
                sku="F-A-001-WHITE",
                name="Classic White Twill",
                tier="A",
                tile_path="fabrics/F-A-001-WHITE/tile.png",
                tile_width_mm=20.0,
                pattern_type="solid",
                colorway="white",
                hex_primary="#FFFFFF",
            ))

        # Sample collar
        existing = await db.execute(select(models.Collar).where(models.Collar.sku == "SPREAD-01"))
        if not existing.scalar_one_or_none():
            db.add(models.Collar(
                sku="SPREAD-01",
                name="Classic Spread",
                style="spread",
                base_mask_path="collars/SPREAD-01/base_mask.png",
                fabric_mask_path="collars/SPREAD-01/fabric_mask.png",
                shading_path="collars/SPREAD-01/shading.png",
                preview_anchor_xy={"x": 120, "y": 80},
            ))

        # Sample cuff
        existing = await db.execute(select(models.Cuff).where(models.Cuff.sku == "BARREL-01"))
        if not existing.scalar_one_or_none():
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
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
