import hashlib


def cache_key(view: str, collar_id, cuff_id, fabric_id,
              collar_version: int, cuff_version: int, fabric_version: int) -> str:
    raw = f"{view}|{collar_id}|{cuff_id}|{fabric_id}|{collar_version}|{cuff_version}|{fabric_version}"
    return hashlib.sha256(raw.encode()).hexdigest()
