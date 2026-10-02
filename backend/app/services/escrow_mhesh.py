"""
Escrow helpers for Mhesh tasks and print orders.

Mhesh is a payment facilitation service, not a fund custodian: each escrow row is
tied to one aspirant and one task/order, and records the aspirant's designated
campaign M-Pesa account. Funds are never pooled. Funding uses STK Push; release
uses B2C payout.
"""
from datetime import datetime
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mhesh_models import MheshEscrow, MheshEscrowStatus
from app.services import mpesa
from app.services.payments_mhesh import PREFIX_ESCROW, PREFIX_PRINT, start_stk

log = structlog.get_logger()

PREFIX_BY_KIND = {"task": PREFIX_ESCROW, "print_order": PREFIX_PRINT}


class EscrowError(RuntimeError):
    pass


async def create_escrow(
    db: AsyncSession,
    kind: str,
    ref_id: UUID,
    aspirant_id: UUID,
    amount_kes: int,
    phone: str,
    user_id: UUID | None = None,
) -> MheshEscrow:
    """Initiate STK Push to fund escrow. Returns the pending escrow row."""
    if kind not in PREFIX_BY_KIND:
        raise ValueError(f"Unknown escrow kind {kind}")
    escrow = MheshEscrow(
        kind=kind,
        ref_id=ref_id,
        aspirant_id=aspirant_id,
        amount_kes=amount_kes,
        campaign_account_ref=mpesa.normalize_phone(phone),
        status=MheshEscrowStatus.PENDING,
    )
    db.add(escrow)
    await db.commit()
    await db.refresh(escrow)

    try:
        payment = await start_stk(
            db, prefix=PREFIX_BY_KIND[kind], ref_id=escrow.id, phone=phone,
            amount_kes=amount_kes, description="Mhesh escrow", user_id=user_id,
        )
    except Exception:
        # Nothing was collected; close the row so it never shows as fundable.
        escrow.status = MheshEscrowStatus.REFUNDED
        await db.commit()
        log.exception("escrow_stk_failed", escrow_id=str(escrow.id))
        raise

    escrow.checkout_request_id = payment.checkout_request_id
    await db.commit()
    await db.refresh(escrow)
    return escrow


async def mark_funded(db: AsyncSession, escrow_id: UUID, receipt: str | None) -> MheshEscrow | None:
    escrow = (await db.execute(
        select(MheshEscrow).where(MheshEscrow.id == escrow_id).with_for_update()
    )).scalar_one_or_none()
    if not escrow or escrow.status != MheshEscrowStatus.PENDING:
        return escrow
    escrow.status = MheshEscrowStatus.FUNDED
    escrow.mpesa_receipt = receipt
    await db.flush()
    return escrow


async def release(
    db: AsyncSession,
    escrow_id: UUID,
    to_phone: str,
    amount_kes: int,
    allow_disputed: bool = False,
    final_status: MheshEscrowStatus = MheshEscrowStatus.RELEASED,
) -> dict:
    """Release escrow via B2C M-Pesa payout. Row-locked to prevent double payout."""
    escrow = (await db.execute(
        select(MheshEscrow).where(MheshEscrow.id == escrow_id).with_for_update()
    )).scalar_one_or_none()
    allowed = {MheshEscrowStatus.FUNDED} | ({MheshEscrowStatus.DISPUTED} if allow_disputed else set())
    if not escrow or escrow.status not in allowed:
        raise EscrowError("Escrow not in FUNDED state")
    if amount_kes > escrow.amount_kes:
        raise EscrowError("Payout exceeds escrowed amount")

    resp = await mpesa.b2c_payout(
        phone=to_phone,
        amount_kes=amount_kes,
        remarks=f"Mhesh payout {str(escrow.id)[:8]}",
        occasion=f"{PREFIX_BY_KIND[escrow.kind]}{escrow.id}",
    )
    escrow.status = final_status
    escrow.released_to_phone = mpesa.normalize_phone(to_phone)
    escrow.released_at = datetime.utcnow()
    # ConversationID until the B2C result callback replaces it with the receipt.
    escrow.b2c_receipt = resp.get("ConversationID")
    await db.commit()
    log.info("escrow_released", escrow_id=str(escrow.id), amount_kes=amount_kes)
    return resp


async def refund(db: AsyncSession, escrow_id: UUID) -> dict:
    """Return disputed/unused escrow to the aspirant's designated campaign account."""
    escrow = (await db.execute(select(MheshEscrow).where(MheshEscrow.id == escrow_id))).scalar_one_or_none()
    if not escrow or not escrow.campaign_account_ref:
        raise EscrowError("Escrow has no campaign account to refund to")
    return await release(
        db, escrow_id, escrow.campaign_account_ref, escrow.amount_kes,
        allow_disputed=True, final_status=MheshEscrowStatus.REFUNDED,
    )
