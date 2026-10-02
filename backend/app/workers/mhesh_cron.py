"""
Mhesh background jobs. Runs as the `mhesh-cron` docker-compose service.

- recompute_trust_scores / expire_featured: every MHESH_CRON_INTERVAL_S (6h)
- check_blackout: every MHESH_BLACKOUT_CHECK_INTERVAL_S (15 min) so the hard stop
  takes effect promptly at MHESH_BLACKOUT_START
"""
import asyncio
import time
from datetime import datetime

import structlog
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.mhesh_models import MheshAspirant, MheshPartner, MheshSupporter, MheshTask, MheshTaskStatus
from app.services.compliance_mhesh import in_blackout

log = structlog.get_logger()


def supporter_trust_score(verified_mpesa: bool, tasks_completed: int, tasks_disputed: int) -> int:
    score = 30 if verified_mpesa else 0
    score += min(30, tasks_completed * 3)
    score -= min(20, tasks_disputed * 5)
    return max(0, min(100, score))


def partner_trust_score(verified: bool, orders_completed: int, orders_disputed: int, rating: float) -> int:
    score = 30 if verified else 0
    score += min(30, orders_completed * 2)
    score -= min(20, orders_disputed * 5)
    score += int(max(0.0, min(5.0, rating)) * 4)
    return max(0, min(100, score))


async def recompute_trust_scores() -> None:
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        supporters = (await db.execute(select(MheshSupporter))).scalars().all()
        for s in supporters:
            s.trust_score = supporter_trust_score(s.verified_mpesa, s.tasks_completed, s.tasks_disputed)
            s.trust_computed_at = now
        partners = (await db.execute(select(MheshPartner))).scalars().all()
        for p in partners:
            p.rating = max(0.0, min(5.0, p.rating))
            p.trust_score = partner_trust_score(p.verified, p.orders_completed, p.orders_disputed, p.rating)
        await db.commit()
        log.info("mhesh_trust_recomputed", supporters=len(supporters), partners=len(partners))


async def check_blackout() -> int:
    """During the blackout, cancel every unfunded draft so nothing new can be distributed.
    Funded-but-unpublished tasks are left for ops refunds (/api/mhesh/ops/escrow/attention)."""
    if not in_blackout():
        return 0
    async with AsyncSessionLocal() as db:
        drafts = (await db.execute(
            select(MheshTask).where(MheshTask.status.in_([MheshTaskStatus.DRAFT, MheshTaskStatus.FUNDED]))
        )).scalars().all()
        for t in drafts:
            t.status = MheshTaskStatus.CANCELLED
        await db.commit()
        log.warning("mhesh_blackout_active", cancelled_tasks=len(drafts))
        return len(drafts)


async def expire_featured() -> None:
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        for model in (MheshAspirant, MheshPartner):
            rows = (await db.execute(select(model).where(model.featured_until < now))).scalars().all()
            for r in rows:
                r.featured_until = None
        await db.commit()


async def _run_all() -> None:
    await recompute_trust_scores()
    await check_blackout()
    await expire_featured()


def run_cron() -> None:
    asyncio.run(_run_all())


async def _loop() -> None:
    s = get_settings()
    log.info("mhesh_cron_worker_started")
    last_full = 0.0
    while True:
        try:
            if time.monotonic() - last_full >= s.MHESH_CRON_INTERVAL_S or last_full == 0.0:
                await _run_all()
                last_full = time.monotonic()
            else:
                await check_blackout()
        except Exception:
            log.exception("mhesh_cron_failed")
        await asyncio.sleep(s.MHESH_BLACKOUT_CHECK_INTERVAL_S)


if __name__ == "__main__":
    asyncio.run(_loop())
