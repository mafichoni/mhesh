from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.mhesh_models import MheshAspirant, MheshOffice, MheshPartner, MheshPartnerStatus

router = APIRouter(prefix="/api/mhesh", tags=["mhesh-public"])


@router.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "mhesh"}


@router.get("/county/{county}")
async def county_aspirants(county: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(
        select(MheshAspirant)
        .where(func.lower(MheshAspirant.county) == county.lower(), MheshAspirant.verified_mpesa.is_(True))
        .order_by(MheshAspirant.office, MheshAspirant.trust_score.desc())
    )).scalars().all()
    return [
        {"slug": r.slug, "display_name": r.display_name, "office": r.office.value, "county": r.county,
         "party": r.party, "trust_score": r.trust_score, "featured_until": r.featured_until}
        for r in rows
    ]


@router.get("/office/{office}")
async def office_aspirants(office: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    try:
        office_enum = MheshOffice(office)
    except ValueError:
        raise HTTPException(404, "Unknown office")
    rows = (await db.execute(
        select(MheshAspirant)
        .where(MheshAspirant.office == office_enum, MheshAspirant.verified_mpesa.is_(True))
        .order_by(MheshAspirant.county, MheshAspirant.trust_score.desc())
    )).scalars().all()
    return [
        {"slug": r.slug, "display_name": r.display_name, "office": r.office.value, "county": r.county,
         "party": r.party, "trust_score": r.trust_score, "featured_until": r.featured_until}
        for r in rows
    ]


@router.get("/stats")
async def public_stats(db: AsyncSession = Depends(get_db)) -> dict:
    aspirants = (await db.execute(
        select(func.count(MheshAspirant.id)).where(MheshAspirant.verified_mpesa.is_(True)))).scalar() or 0
    partners = (await db.execute(
        select(func.count(MheshPartner.id)).where(MheshPartner.status == MheshPartnerStatus.ACTIVE))).scalar() or 0
    return {"aspirants": aspirants, "partners": partners}
