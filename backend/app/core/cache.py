import json
import logging
from typing import Optional
import redis.asyncio as aioredis
from app.config import settings

log = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


RENDER_TTL = 3600  # 1 hour


async def cache_get(key: str) -> Optional[dict]:
    try:
        r = get_redis()
        val = await r.get(f"render:{key}")
        if val:
            return json.loads(val)
    except Exception as exc:
        log.warning("Redis cache_get failed (continuing without cache): %s", exc)
    return None


async def cache_set(key: str, payload: dict) -> None:
    try:
        r = get_redis()
        await r.setex(f"render:{key}", RENDER_TTL, json.dumps(payload))
    except Exception as exc:
        log.warning("Redis cache_set failed (continuing without cache): %s", exc)


async def cache_delete(key: str) -> None:
    try:
        r = get_redis()
        await r.delete(f"render:{key}")
    except Exception as exc:
        log.warning("Redis cache_delete failed: %s", exc)
