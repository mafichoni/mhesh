"""
Shared M-Pesa gateway callbacks.

STK callbacks don't echo AccountReference, so the reference is resolved from the
`payments` row recorded at STK time (by CheckoutRequestID). C2B confirmations carry
it as BillRefNumber. Tenant branches are dispatched by AccountReference prefix.
"""
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from rapidfuzz import fuzz
from sqlalchemy import String, cast, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.mhesh_models import (
    MheshAspirant,
    MheshAspirantTier,
    MheshEscrow,
    MheshEscrowStatus,
    MheshOrderStatus,
    MheshPartner,
    MheshPartnerStatus,
    MheshPrintOrder,
    MheshSupporter,
    MheshTask,
    MheshTaskStatus,
)
from app.models import Payment, PaymentStatus
from app.services.escrow_mhesh import mark_funded
from app.services.payments_mhesh import PREFIX_ESCROW, PREFIX_PRINT, PREFIX_SUBSCRIPTION, PREFIX_VERIFY

router = APIRouter(prefix="/api/payments", tags=["payments"])
log = structlog.get_logger()
ACCEPTED = {"ResultCode": 0, "ResultDesc": "Accepted"}


def _check_secret(request: Request) -> None:
    secret = get_settings().MPESA_CALLBACK_SECRET
    if secret and request.query_params.get("secret") != secret:
        raise HTTPException(403, "Invalid callback secret")


def _flatten(body: dict) -> dict[str, Any]:
    """Merge STK CallbackMetadata items and C2B top-level fields into one dict."""
    stk = (body.get("Body") or {}).get("stkCallback") or {}
    meta: dict[str, Any] = {}
    for item in (stk.get("CallbackMetadata") or {}).get("Item", []) or []:
        if "Name" in item:
            meta[item["Name"]] = item.get("Value")
    for k in ("TransID", "TransAmount", "BillRefNumber", "MSISDN", "FirstName", "MiddleName", "LastName"):
        if k in body:
            meta[k] = body[k]
    meta.setdefault("MpesaReceiptNumber", meta.get("TransID"))
    meta.setdefault("Amount", meta.get("TransAmount"))
    return meta


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    _check_secret(request)
    body = await request.json()
    stk = (body.get("Body") or {}).get("stkCallback") or {}
    metadata = _flatten(body)

    payment: Payment | None = None
    if stk.get("CheckoutRequestID"):
        payment = (await db.execute(
            select(Payment).where(Payment.checkout_request_id == stk["CheckoutRequestID"]).with_for_update()
        )).scalar_one_or_none()
        if not payment:
            log.warning("mpesa_callback_unknown_checkout", checkout_request_id=stk["CheckoutRequestID"])
            return ACCEPTED
        if payment.status != PaymentStatus.PENDING:
            return ACCEPTED  # idempotent: already processed
        payment.raw_callback = body
        payment.processed_at = datetime.utcnow()
        if int(stk.get("ResultCode", 1)) != 0:
            payment.status = PaymentStatus.FAILED
            payment.result_desc = str(stk.get("ResultDesc", ""))[:300]
            await db.commit()
            return ACCEPTED
        payment.status = PaymentStatus.SUCCESS
        payment.mpesa_receipt = metadata.get("MpesaReceiptNumber")
        account_ref = payment.account_reference
        user_id = payment.user_id
    else:
        account_ref = str(metadata.get("BillRefNumber") or "").strip()
        user_id = None

    if account_ref.startswith(PREFIX_VERIFY):
        await _handle_mhesh_verify(db, account_ref, metadata, body, user_id)
    elif account_ref.startswith(PREFIX_ESCROW):
        await _handle_mhesh_escrow_funded(db, account_ref, metadata, body)
    elif account_ref.startswith(PREFIX_SUBSCRIPTION):
        await _handle_mhesh_subscription(db, account_ref, metadata, body)
    elif account_ref.startswith(PREFIX_PRINT):
        await _handle_mhesh_print_order(db, account_ref, metadata, body)
    # (Other tenants' prefixes are dispatched here in the shared gateway.)
    await db.commit()
    return ACCEPTED


@router.post("/mpesa/b2c/result")
async def b2c_result(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    _check_secret(request)
    result = (await request.json()).get("Result") or {}
    conv_id = result.get("ConversationID")
    escrow = (await db.execute(
        select(MheshEscrow).where(MheshEscrow.b2c_receipt == conv_id).with_for_update()
    )).scalar_one_or_none() if conv_id else None
    if not escrow:
        return ACCEPTED
    if int(result.get("ResultCode", 1)) == 0:
        escrow.b2c_receipt = result.get("TransactionID") or conv_id
    else:
        # Payout failed at Safaricom: lock for ops to retry via /api/mhesh/ops/escrow/{id}/resolve.
        log.error("mhesh_b2c_failed", escrow_id=str(escrow.id), desc=result.get("ResultDesc"))
        escrow.status = MheshEscrowStatus.DISPUTED
    await db.commit()
    return ACCEPTED


@router.post("/mpesa/b2c/timeout")
async def b2c_timeout(request: Request) -> dict:
    _check_secret(request)
    log.warning("mhesh_b2c_timeout", body=await request.json())
    return ACCEPTED


# ─── Mhesh branches ────────────────────────────────────────────────
def _id_filter(column: Any, ref_part: str) -> Any:
    """Full UUID (STK path) → exact match; 8-char short id (C2B BillRefNumber) → prefix match."""
    try:
        return column == UUID(ref_part)
    except ValueError:
        return cast(column, String).like(f"{ref_part.lower()[:8]}%")


async def _one(db: AsyncSession, model: Any, ref_part: str) -> Any:
    rows = (await db.execute(select(model).where(_id_filter(model.id, ref_part)).with_for_update())).scalars().all()
    return rows[0] if len(rows) == 1 else None


def _paid(metadata: dict) -> int:
    try:
        return int(float(metadata.get("Amount") or 0))
    except (TypeError, ValueError):
        return 0


async def _handle_mhesh_verify(
    db: AsyncSession, account_ref: str, metadata: dict, body: dict, user_id: UUID | None,
) -> None:
    s = get_settings()
    ref = account_ref[len(PREFIX_VERIFY):]
    now = datetime.utcnow()

    a = await _one(db, MheshAspirant, ref)
    if a:
        mpesa_name = " ".join(
            str(metadata.get(k) or "") for k in ("FirstName", "MiddleName", "LastName")).strip()
        if mpesa_name:
            score = fuzz.token_set_ratio(mpesa_name.lower(), (a.official_name or a.display_name).lower())
            if score < s.MHESH_NAME_MATCH_THRESHOLD:
                log.warning("mhesh_verify_name_mismatch", aspirant_id=str(a.id), score=score)
                return
        if not a.verified_mpesa:
            a.verified_mpesa = True
            a.verified_at = now
            a.trust_score = min(100, a.trust_score + 25)
        return

    sup = await _one(db, MheshSupporter, ref)
    if sup:
        if not sup.verified_mpesa:
            sup.verified_mpesa = True
            sup.verified_at = now
            sup.trust_score = min(100, sup.trust_score + 30)
        return

    p = await _one(db, MheshPartner, ref)
    if p:
        p.verified = True
        p.verified_at = p.verified_at or now
        if s.MHESH_PARTNER_AUTO_ACTIVATE and p.status == MheshPartnerStatus.PENDING:
            p.status = MheshPartnerStatus.ACTIVE
        return
    log.warning("mhesh_verify_unmatched", account_ref=account_ref)


async def _fund_escrow(db: AsyncSession, account_ref: str, prefix: str, metadata: dict) -> MheshEscrow | None:
    escrow = await _one(db, MheshEscrow, account_ref[len(prefix):])
    if not escrow:
        log.warning("mhesh_escrow_unmatched", account_ref=account_ref)
        return None
    if _paid(metadata) < escrow.amount_kes:
        log.error("mhesh_escrow_underpaid", escrow_id=str(escrow.id), paid=_paid(metadata), due=escrow.amount_kes)
        return None
    if escrow.status != MheshEscrowStatus.PENDING:
        return None
    return await mark_funded(db, escrow.id, metadata.get("MpesaReceiptNumber"))


async def _handle_mhesh_escrow_funded(db: AsyncSession, account_ref: str, metadata: dict, body: dict) -> None:
    escrow = await _fund_escrow(db, account_ref, PREFIX_ESCROW, metadata)
    if escrow and escrow.kind == "task":
        t = (await db.execute(select(MheshTask).where(MheshTask.id == escrow.ref_id))).scalar_one_or_none()
        if t and t.status == MheshTaskStatus.DRAFT:
            t.status = MheshTaskStatus.FUNDED


async def _handle_mhesh_print_order(db: AsyncSession, account_ref: str, metadata: dict, body: dict) -> None:
    escrow = await _fund_escrow(db, account_ref, PREFIX_PRINT, metadata)
    if not escrow:
        return
    order = (await db.execute(select(MheshPrintOrder).where(MheshPrintOrder.id == escrow.ref_id))).scalar_one_or_none()
    if order and order.status == MheshOrderStatus.PENDING:
        order.status = MheshOrderStatus.FUNDED
        order.escrow_id = escrow.id


async def _handle_mhesh_subscription(db: AsyncSession, account_ref: str, metadata: dict, body: dict) -> None:
    # MHESH-{aspirant_id}-{tier}
    rest = account_ref[len(PREFIX_SUBSCRIPTION):]
    if "-" not in rest:
        return
    ref, tier = rest.rsplit("-", 1)
    s = get_settings()
    expected = {"verified": s.MHESH_VERIFIED_TIER_KES, "featured": s.MHESH_FEATURED_TIER_KES}.get(tier)
    if expected is None or _paid(metadata) < expected:
        log.error("mhesh_subscription_invalid", account_ref=account_ref, paid=_paid(metadata))
        return
    a = await _one(db, MheshAspirant, ref)
    if not a:
        return
    if tier == "verified":
        if a.tier == MheshAspirantTier.FREE:
            a.tier = MheshAspirantTier.VERIFIED
    else:
        a.tier = MheshAspirantTier.FEATURED
        start = max(a.featured_until or datetime.utcnow(), datetime.utcnow())
        a.featured_until = start + timedelta(days=30)
