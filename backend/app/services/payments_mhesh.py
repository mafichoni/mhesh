"""
Records every Mhesh STK Push in the shared `payments` table.

Daraja truncates AccountReference to 12 characters and STK callbacks do not echo it,
so the full reference (prefix + full UUID) is stored here and the callback resolves
it by CheckoutRequestID.
"""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Payment, PaymentStatus
from app.services import mpesa

PREFIX_VERIFY = "MHESHV-"
PREFIX_ESCROW = "MHESHW-"
PREFIX_SUBSCRIPTION = "MHESH-"
PREFIX_PRINT = "MHESHP-"


def account_reference(prefix: str, ref_id: UUID, suffix: str = "") -> str:
    return f"{prefix}{ref_id}{'-' + suffix if suffix else ''}"


async def start_stk(
    db: AsyncSession,
    *,
    prefix: str,
    ref_id: UUID,
    phone: str,
    amount_kes: int,
    description: str,
    user_id: UUID | None,
    suffix: str = "",
) -> Payment:
    full_ref = account_reference(prefix, ref_id, suffix)
    resp = await mpesa.stk_push(
        phone=phone,
        amount_kes=amount_kes,
        account_reference=f"{prefix}{str(ref_id)[:8]}",
        transaction_desc=description,
    )
    payment = Payment(
        user_id=user_id,
        phone=mpesa.normalize_phone(phone),
        amount_kes=amount_kes,
        account_reference=full_ref,
        checkout_request_id=resp.get("CheckoutRequestID"),
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    await db.commit()
    return payment
