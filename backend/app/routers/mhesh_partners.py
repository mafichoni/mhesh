import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.mhesh_models import (
    MheshAspirant,
    MheshEscrow,
    MheshEscrowStatus,
    MheshOrderStatus,
    MheshPartner,
    MheshPartnerStatus,
    MheshPrintOrder,
    MheshRating,
)
from app.models import User
from app.routers.mhesh_common import get_aspirant, unique_slug
from app.schemas_mhesh import (
    DeliverySubmit,
    PartnerApply,
    PartnerOut,
    PartnerUpdate,
    PhonePayload,
    PrintOrderCreate,
    PrintOrderOut,
    RatingCreate,
    TaskDispute,
)
from app.services import compliance_mhesh as compliance
from app.services.escrow_mhesh import EscrowError, create_escrow, release
from app.services.payments_mhesh import PREFIX_VERIFY, start_stk
from app.services.storage import presigned_upload, public_url
from app.services.whatsapp import send_text

router = APIRouter(prefix="/api/mhesh/partners", tags=["mhesh-partners"])


async def _own_partner(db: AsyncSession, user: User) -> MheshPartner:
    p = (await db.execute(select(MheshPartner).where(MheshPartner.user_id == user.id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Partner profile not found")
    return p


async def _aspirant_order(db: AsyncSession, user: User, order_id: UUID) -> tuple[MheshAspirant, MheshPrintOrder]:
    a = await get_aspirant(user, db)
    order = (await db.execute(
        select(MheshPrintOrder).where(MheshPrintOrder.id == order_id, MheshPrintOrder.aspirant_id == a.id)
        .with_for_update()
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    return a, order


async def _partner_order(db: AsyncSession, user: User, order_id: UUID) -> tuple[MheshPartner, MheshPrintOrder]:
    p = await _own_partner(db, user)
    order = (await db.execute(
        select(MheshPrintOrder).where(MheshPrintOrder.id == order_id, MheshPrintOrder.partner_id == p.id)
        .with_for_update()
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    return p, order


# ─── Partner onboarding ────────────────────────────────────────────
@router.post("/apply", response_model=PartnerOut)
async def apply_partner(
    payload: PartnerApply,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MheshPartner:
    if (await db.execute(select(MheshPartner.id).where(MheshPartner.user_id == user.id))).first():
        raise HTTPException(400, "You already have a partner profile")
    p = MheshPartner(
        user_id=user.id,
        slug=await unique_slug(db, MheshPartner, payload.business_name),
        status=MheshPartnerStatus.PENDING,
        **payload.model_dump(),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)

    # KSh 1 verification STK; failure is non-fatal (partner can retry from the dashboard).
    try:
        await start_stk(
            db, prefix=PREFIX_VERIFY, ref_id=p.id, phone=payload.phone,
            amount_kes=get_settings().MHESH_VERIFY_KES, description="Mhesh verify", user_id=user.id,
        )
    except Exception:
        pass
    return p


@router.post("/me/verify-mpesa")
async def verify_partner_mpesa(
    payload: PhonePayload, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> dict:
    p = await _own_partner(db, user)
    if p.verified:
        return {"already_verified": True}
    payment = await start_stk(
        db, prefix=PREFIX_VERIFY, ref_id=p.id, phone=payload.phone,
        amount_kes=get_settings().MHESH_VERIFY_KES, description="Mhesh verify", user_id=user.id,
    )
    return {"checkout_request_id": payment.checkout_request_id}


@router.get("", response_model=list[PartnerOut])
async def list_partners(
    county: str | None = None,
    capability: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list:
    q = select(MheshPartner).where(MheshPartner.status == MheshPartnerStatus.ACTIVE)
    if county:
        q = q.where(MheshPartner.county == county)
    if capability:
        q = q.where(MheshPartner.capabilities.contains([capability]))
    q = q.order_by(
        MheshPartner.featured_until.desc().nullslast(),
        MheshPartner.rating.desc(),
        MheshPartner.orders_completed.desc(),
    ).limit(100)
    return list((await db.execute(q)).scalars().all())


@router.get("/me/profile", response_model=PartnerOut)
async def get_own_partner(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> MheshPartner:
    return await _own_partner(db, user)


@router.patch("/me/profile", response_model=PartnerOut)
async def update_own_partner(
    payload: PartnerUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> MheshPartner:
    p = await _own_partner(db, user)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return p


@router.post("/me/sample-upload-url")
async def sample_upload_url(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    p = await _own_partner(db, user)
    key = f"mhesh/partners/{p.id}/samples/{uuid.uuid4()}.jpg"
    return {"upload_url": presigned_upload(key, "image/jpeg"), "key": key, "public_url": public_url(key)}


@router.get("/me/orders", response_model=list[PrintOrderOut])
async def get_partner_orders(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list:
    p = await _own_partner(db, user)
    return list((await db.execute(
        select(MheshPrintOrder).where(MheshPrintOrder.partner_id == p.id).order_by(MheshPrintOrder.created_at.desc())
    )).scalars().all())


# ─── Aspirant: create + fund + approve print orders ────────────────
@router.get("/orders/mine", response_model=list[PrintOrderOut])
async def list_my_orders(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list:
    a = await get_aspirant(user, db)
    return list((await db.execute(
        select(MheshPrintOrder).where(MheshPrintOrder.aspirant_id == a.id).order_by(MheshPrintOrder.created_at.desc())
    )).scalars().all())


@router.get("/orders/{order_id}", response_model=PrintOrderOut)
async def get_order(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> MheshPrintOrder:
    order = (await db.execute(select(MheshPrintOrder).where(MheshPrintOrder.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    a_user = (await db.execute(select(MheshAspirant.user_id).where(MheshAspirant.id == order.aspirant_id))).scalar_one()
    p_user = (await db.execute(select(MheshPartner.user_id).where(MheshPartner.id == order.partner_id))).scalar_one()
    if user.id not in (a_user, p_user):
        raise HTTPException(404, "Order not found")
    return order


@router.post("/orders", response_model=PrintOrderOut)
async def create_order(
    payload: PrintOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MheshPrintOrder:
    compliance.check_not_blackout()
    a = await get_aspirant(user, db)
    p = (await db.execute(select(MheshPartner).where(
        MheshPartner.id == payload.partner_id, MheshPartner.status == MheshPartnerStatus.ACTIVE))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Partner not active")
    if payload.category not in (p.capabilities or []):
        raise HTTPException(400, "Partner does not offer this category")

    total = payload.quantity * payload.unit_price_kes
    order = MheshPrintOrder(
        aspirant_id=a.id,
        total_kes=total,
        referral_fee_kes=int(total * get_settings().MHESH_PARTNER_REFERRAL_PCT),
        status=MheshOrderStatus.PENDING,
        delivery_evidence_urls=[],
        **payload.model_dump(),
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    try:
        await send_text(p.phone, f"Mhesh: oda mpya ya {payload.quantity} x {payload.category}. Itaanza baada ya malipo.")
    except Exception:
        pass
    return order


@router.post("/orders/{order_id}/fund")
async def fund_order(
    order_id: UUID,
    payload: PhonePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    compliance.check_not_blackout()
    a, order = await _aspirant_order(db, user, order_id)
    if order.status != MheshOrderStatus.PENDING:
        raise HTTPException(400, "Order is not awaiting payment")
    escrow = await create_escrow(
        db, kind="print_order", ref_id=order.id, aspirant_id=a.id,
        amount_kes=order.total_kes, phone=payload.phone, user_id=user.id,
    )
    order.escrow_id = escrow.id
    await db.commit()
    return {"escrow_id": str(escrow.id), "checkout_request_id": escrow.checkout_request_id}


@router.post("/orders/{order_id}/approve")
async def approve_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _, order = await _aspirant_order(db, user, order_id)
    if order.status != MheshOrderStatus.DELIVERED:
        raise HTTPException(400, "Order not in DELIVERED state")
    p = (await db.execute(select(MheshPartner).where(MheshPartner.id == order.partner_id))).scalar_one()
    escrow = (await db.execute(select(MheshEscrow).where(MheshEscrow.id == order.escrow_id))).scalar_one_or_none()
    if not escrow or escrow.status != MheshEscrowStatus.FUNDED:
        raise HTTPException(400, "Escrow not funded")

    payout = order.total_kes - order.referral_fee_kes
    try:
        await release(db, escrow.id, p.phone, payout)
    except EscrowError as e:
        raise HTTPException(400, str(e))

    order.status = MheshOrderStatus.APPROVED
    order.approved_at = datetime.utcnow()
    p.orders_completed += 1
    await db.commit()
    return {"ok": True, "payout_kes": payout, "referral_fee_kes": order.referral_fee_kes}


@router.post("/orders/{order_id}/dispute")
async def dispute_order(
    order_id: UUID, payload: TaskDispute, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> dict:
    _, order = await _aspirant_order(db, user, order_id)
    if order.status not in (MheshOrderStatus.FUNDED, MheshOrderStatus.IN_PRODUCTION,
                            MheshOrderStatus.SHIPPED, MheshOrderStatus.DELIVERED):
        raise HTTPException(400, "Order cannot be disputed in its current state")
    order.status = MheshOrderStatus.DISPUTED
    if order.escrow_id:
        escrow = (await db.execute(select(MheshEscrow).where(MheshEscrow.id == order.escrow_id))).scalar_one()
        if escrow.status == MheshEscrowStatus.FUNDED:
            escrow.status = MheshEscrowStatus.DISPUTED
    p = (await db.execute(select(MheshPartner).where(MheshPartner.id == order.partner_id))).scalar_one()
    p.orders_disputed += 1
    await db.commit()
    return {"ok": True}


@router.post("/orders/{order_id}/rate")
async def rate_order(
    order_id: UUID, payload: RatingCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> dict:
    a, order = await _aspirant_order(db, user, order_id)
    if order.status != MheshOrderStatus.APPROVED:
        raise HTTPException(400, "Only approved orders can be rated")
    if (await db.execute(select(MheshRating.id).where(
            MheshRating.kind == "print_order", MheshRating.subject_id == order.id))).first():
        raise HTTPException(400, "Already rated")
    db.add(MheshRating(kind="print_order", subject_id=order.id, rater_id=a.id, rater_kind="aspirant",
                       **payload.model_dump()))
    await db.flush()
    avg = (await db.execute(
        select(func.avg(MheshRating.stars))
        .join(MheshPrintOrder, MheshPrintOrder.id == MheshRating.subject_id)
        .where(MheshRating.kind == "print_order", MheshPrintOrder.partner_id == order.partner_id)
    )).scalar() or 0
    p = (await db.execute(select(MheshPartner).where(MheshPartner.id == order.partner_id))).scalar_one()
    p.rating = round(float(avg), 2)
    await db.commit()
    return {"ok": True, "partner_rating": p.rating}


# ─── Partner: fulfil orders ────────────────────────────────────────
@router.post("/orders/{order_id}/accept")
async def accept_order(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    _, order = await _partner_order(db, user, order_id)
    if order.status != MheshOrderStatus.FUNDED:
        raise HTTPException(400, "Order is not funded yet")
    order.status = MheshOrderStatus.IN_PRODUCTION
    await db.commit()
    return {"ok": True}


@router.post("/orders/{order_id}/ship")
async def ship_order(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    _, order = await _partner_order(db, user, order_id)
    if order.status != MheshOrderStatus.IN_PRODUCTION:
        raise HTTPException(400, "Order is not in production")
    order.status = MheshOrderStatus.SHIPPED
    await db.commit()
    return {"ok": True}


@router.post("/orders/{order_id}/delivery-upload-url")
async def delivery_upload_url(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    _, order = await _partner_order(db, user, order_id)
    key = f"mhesh/orders/{order.id}/delivery/{uuid.uuid4()}.jpg"
    return {"upload_url": presigned_upload(key, "image/jpeg"), "key": key, "public_url": public_url(key)}


@router.post("/orders/{order_id}/deliver")
async def mark_delivered(
    order_id: UUID,
    payload: DeliverySubmit,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _, order = await _partner_order(db, user, order_id)
    if order.status not in (MheshOrderStatus.FUNDED, MheshOrderStatus.IN_PRODUCTION, MheshOrderStatus.SHIPPED):
        raise HTTPException(400, "Order cannot be delivered in its current state")
    order.delivery_evidence_urls = payload.evidence_urls
    order.status = MheshOrderStatus.DELIVERED
    order.delivered_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


# ─── Public partner page (keep last: catches /{slug}) ──────────────
@router.get("/{slug}", response_model=PartnerOut)
async def get_partner(slug: str, db: AsyncSession = Depends(get_db)) -> MheshPartner:
    p = (await db.execute(select(MheshPartner).where(MheshPartner.slug == slug))).scalar_one_or_none()
    if not p or p.status == MheshPartnerStatus.SUSPENDED:
        raise HTTPException(404, "Partner not found")
    return p
