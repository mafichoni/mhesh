"""Blackout window and Redis-backed daily rate limits (Sections 2.7, 2.8)."""
from datetime import UTC, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from app.config import get_settings
from app.services.redis_client import get_redis

EAT = ZoneInfo("Africa/Nairobi")


def _parse(ts: str) -> datetime | None:
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(ts)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=EAT)


def in_blackout(now: datetime | None = None) -> bool:
    s = get_settings()
    start, end = _parse(s.MHESH_BLACKOUT_START), _parse(s.MHESH_BLACKOUT_END)
    if not start:
        return False
    now = now or datetime.now(UTC)
    return now >= start and (end is None or now < end)


def check_not_blackout() -> None:
    if in_blackout():
        raise HTTPException(423, "Platform is in electoral blackout period")


def _seconds_to_eat_midnight(now: datetime) -> int:
    local = now.astimezone(EAT)
    midnight = (local + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(1, int((midnight - local).total_seconds()))


async def rate_limit(user_id: UUID, action: str, limit: int, amount: int = 1) -> int:
    """
    Daily counter at mhesh:rate:{user_id}:{action}, resetting at midnight EAT.
    Raises 429 without consuming quota when the request would exceed the limit.
    Returns the new count.
    """
    r = get_redis()
    key = f"mhesh:rate:{user_id}:{action}"
    count = await r.incrby(key, amount)
    if count == amount:
        await r.expire(key, _seconds_to_eat_midnight(datetime.now(UTC)))
    if count > limit:
        await r.decrby(key, amount)
        raise HTTPException(429, f"Daily limit of {limit} reached for {action}")
    return count


async def refund_rate(user_id: UUID, action: str, amount: int = 1) -> None:
    await get_redis().decrby(f"mhesh:rate:{user_id}:{action}", amount)
