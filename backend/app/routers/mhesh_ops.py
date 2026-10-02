"""Ops-only endpoints: moderation queue, partner approval, escrow dispute resolution."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_admin_user
from app.config import get_settings
from app.database import get_db
from app.mhesh_models import (
    MheshEscrow,
    MheshEscrowStatus,
    MheshOrderStatus,
    MheshPartner,
    MheshPartnerStatus,
    MheshPrintOrder,
    MheshReport,
    MheshSupporter,
    MheshTask,
    MheshTaskStatus,
)
from app.models import User
from app.schemas_mhesh import PartnerOut
from app.services.escrow_mhesh import EscrowError, refund, release

router = APIRouter(prefix="/api/mhesh/ops", tags=["mhesh-ops"])


class EscrowResolution(BaseModel):
    action: Literal["release", "refund"]


@router.get("/reports")
async def report_queue(
    resolved: bool = False, db: AsyncSession = Depends(get_db), _: User = Depends(get_admin_user),
) -> list[dict]:
    rows = (await db.execute(
        select(MheshReport).where(MheshReport.resolved.is_(resolved)).order_by(MheshReport.created_at)
    )).scalars().all()
    return [{"id": str(r.id), "kind": r.kind, "subject_id": r.subject_id, "reason": r.reason,
             "reporter_contact": r.reporter_contact, "created_at": r.created_at.isoformat()} for r in rows]


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_admin_user)) -> dict:
    r = (await db.execute(select(MheshReport).where(MheshReport.id == report_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404)
    r.resolved = True
    await db.commit()
    return {"ok": True}


@router.get("/partners/pending", response_model=list[PartnerOut])
async def pending_partners(db: AsyncSession = Depends(get_db), _: User = Depends(get_admin_user)) -> list:
    return list((await db.execute(
        select(MheshPartner).where(MheshPartner.status == MheshPartnerStatus.PENDING).order_by(MheshPartner.created_at)
    )).scalars().all())


@router.post("/partners/{partner_id}/status", response_model=PartnerOut)
async def set_partner_status(
    partner_id: UUID, status: MheshPartnerStatus,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_admin_user),
) -> MheshPartner:
    p = (await db.execute(select(MheshPartner).where(MheshPartner.id == partner_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404)
    if status == MheshPartnerStatus.ACTIVE and not p.verified:
        raise HTTPException(400, "Partner has not completed M-Pesa verification")
    p.status = status
    await db.commit()
    await db.refresh(p)
    return p


@router.get("/escrow/attention")
async def escrow_needing_attention(db: AsyncSession = Depends(get_db), _: User = Depends(get_admin_user)) -> list[dict]:
    """Disputed escrows, plus funded escrows whose task was cancelled (e.g. by the blackout)."""
    disputed = (await db.execute(
        select(MheshEscrow).where(MheshEscrow.status == MheshEscrowStatus.DISPUTED))).scalars().all()
    cancelled = (await db.execute(
        select(MheshEscrow).join(MheshTask, MheshTask.id == MheshEscrow.ref_id)
        .where(MheshEscrow.kind == "task", MheshEscrow.status == MheshEscrowStatus.FUNDED,
               MheshTask.status == MheshTaskStatus.CANCELLED))).scalars().all()
    return [{"id": str(e.id), "kind": e.kind, "ref_id": str(e.ref_id), "amount_kes": e.amount_kes,
             "status": e.status.value, "campaign_account_ref": e.campaign_account_ref}
            for e in [*disputed, *cancelled]]


@router.post("/escrow/{escrow_id}/resolve")
async def resolve_escrow(
    escrow_id: UUID, payload: EscrowResolution,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_admin_user),
) -> dict:
    e = (await db.execute(select(MheshEscrow).where(MheshEscrow.id == escrow_id))).scalar_one_or_none()
    if not e:
        raise HTTPException(404)
    try:
        if payload.action == "refund":
            await refund(db, e.id)
            return {"ok": True, "refunded_kes": e.amount_kes}

        if e.kind == "task":
            t = (await db.execute(select(MheshTask).where(MheshTask.id == e.ref_id))).scalar_one()
            s = (await db.execute(select(MheshSupporter).where(MheshSupporter.id == t.assigned_supporter_id))).scalar_one()

            payout = int(t.reward_kes * (1 - get_settings().MHESH_PLATFORM_FEE_PCT))
            await release(db, e.id, s.phone, payout, allow_disputed=True)
            t.status, t.approved_at = MheshTaskStatus.APPROVED, datetime.utcnow()
            s.tasks_completed += 1
            s.total_earned_kes += payout
        else:
            o = (await db.execute(select(MheshPrintOrder).where(MheshPrintOrder.id == e.ref_id))).scalar_one()
            p = (await db.execute(select(MheshPartner).where(MheshPartner.id == o.partner_id))).scalar_one()
            payout = o.total_kes - o.referral_fee_kes
            await release(db, e.id, p.phone, payout, allow_disputed=True)
            o.status, o.approved_at = MheshOrderStatus.APPROVED, datetime.utcnow()
            p.orders_completed += 1
        await db.commit()
        return {"ok": True, "payout_kes": payout}
    except EscrowError as err:
        raise HTTPException(400, str(err))
