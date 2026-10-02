"""Shared helpers for Mhesh routers."""
import re
import secrets
from typing import Any

import structlog
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mhesh_models import MheshAspirant, MheshPartner, MheshReport, MheshSupporter
from app.models import User
from app.services.ai_mhesh import moderate_text
from app.services.storage import public_url

log = structlog.get_logger()

RESERVED_SLUGS = {"me", "new", "admin", "api", "apply", "orders", "dashboard"}


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", name.lower())
    return re.sub(r"[\s-]+", "-", s).strip("-")[:100] or "mhesh"


async def unique_slug(db: AsyncSession, model: type[MheshAspirant] | type[MheshPartner], name: str) -> str:
    base = slugify(name)
    slug = base if base not in RESERVED_SLUGS else f"{base}-{secrets.token_hex(2)}"
    for _ in range(8):
        if not (await db.execute(select(model.id).where(model.slug == slug))).first():
            return slug
        slug = f"{base}-{secrets.token_hex(2)}"
    raise HTTPException(409, "Could not allocate a unique slug")


async def get_aspirant(user: User, db: AsyncSession, lock: bool = False) -> MheshAspirant:
    q = select(MheshAspirant).where(MheshAspirant.user_id == user.id)
    a = (await db.execute(q.with_for_update() if lock else q)).scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Aspirant profile not found")
    return a


async def get_supporter(user: User, db: AsyncSession) -> MheshSupporter:
    s = (await db.execute(select(MheshSupporter).where(MheshSupporter.user_id == user.id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Supporter profile not found")
    return s


def aspirant_dict(a: MheshAspirant) -> dict[str, Any]:
    data = {c.name: getattr(a, c.name) for c in MheshAspirant.__table__.columns}
    data["office"] = a.office.value
    data["tier"] = a.tier.value
    data["photo_url"] = public_url(a.photo_r2_key) if a.photo_r2_key else None
    return data


async def moderate_or_reject(db: AsyncSession, kind: str, subject_id: str, texts: list[str]) -> None:
    """Section 2.6: block defamatory/violent profile text; log and queue every rejection for ops."""
    for text in texts:
        if not text:
            continue
        mod = moderate_text(text)
        if not mod["approved"]:
            log.warning("mhesh_moderation_rejected", kind=kind, subject_id=subject_id, reason=mod["reason"])
            db.add(MheshReport(kind=kind, subject_id=subject_id, reporter_contact="auto-moderation",
                               reason=f"Rejected: {mod['reason']}"))
            await db.commit()
            raise HTTPException(400, mod["reason"])
