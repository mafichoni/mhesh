import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.mhesh_models import MheshAspirant, MheshFollower, MheshOffice, MheshReport
from app.models import User
from app.routers.mhesh_common import (
    aspirant_dict,
    get_aspirant,
    moderate_or_reject,
    unique_slug,
)
from app.schemas_mhesh import (
    AspirantCreate,
    AspirantOwner,
    AspirantPublic,
    AspirantUpdate,
    FollowerCreate,
    PhonePayload,
    ReportCreate,
    SubscribeRequest,
)
from app.services import compliance_mhesh as compliance
from app.services.email import send_email
from app.services.payments_mhesh import PREFIX_SUBSCRIPTION, PREFIX_VERIFY, start_stk
from app.services.storage import presigned_upload
from app.services.whatsapp import send_text

router = APIRouter(prefix="/api/mhesh", tags=["mhesh-aspirants"])


def _profile_texts(data: dict) -> list[str]:
    texts = [data.get("display_name") or "", data.get("official_name") or "", data.get("party") or ""]
    for item in (data.get("manifesto") or []) + (data.get("achievements") or []):
        texts += [item.get("title", ""), item.get("description", "")]
    return texts


# ─── Create / read own profile ──────────────────────────────────────
@router.post("/aspirants/me", response_model=AspirantOwner)
async def create_aspirant(
    payload: AspirantCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    compliance.check_not_blackout()
    existing = (await db.execute(
        select(MheshAspirant.id).where(MheshAspirant.user_id == user.id)
    )).first()
    if existing:
        raise HTTPException(400, "Aspirant profile already exists")
    await moderate_or_reject(db, "profile", f"user:{user.id}", _profile_texts(payload.model_dump()))

    a = MheshAspirant(
        user_id=user.id,
        slug=await unique_slug(db, MheshAspirant, payload.display_name),
        manifesto=[], achievements=[], social_links={},
        **payload.model_dump(),
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return aspirant_dict(a)


@router.get("/aspirants/me", response_model=AspirantOwner)
async def get_own_aspirant(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    return aspirant_dict(await get_aspirant(user, db))


@router.patch("/aspirants/me", response_model=AspirantOwner)
async def update_aspirant(
    payload: AspirantUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    compliance.check_not_blackout()
    a = await get_aspirant(user, db)
    updates = payload.model_dump(exclude_unset=True)
    if "photo_r2_key" in updates and updates["photo_r2_key"] and \
            not updates["photo_r2_key"].startswith(f"mhesh/{a.id}/photo/"):
        raise HTTPException(400, "Invalid photo key")
    await moderate_or_reject(db, "profile", str(a.id), _profile_texts(updates))
    await compliance.rate_limit(user.id, "profile_update", get_settings().MHESH_DAILY_PROFILE_UPDATE_LIMIT)

    for k, v in updates.items():
        setattr(a, k, v)
    await db.commit()
    await db.refresh(a)
    return aspirant_dict(a)


@router.post("/aspirants/me/photo-upload-url")
async def photo_upload_url(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    a = await get_aspirant(user, db)
    key = f"mhesh/{a.id}/photo/{uuid.uuid4()}.jpg"
    return {"upload_url": presigned_upload(key, "image/jpeg"), "key": key}


# ─── M-Pesa verification + subscriptions ────────────────────────────
@router.post("/aspirants/me/verify-mpesa")
async def verify_aspirant_mpesa(
    payload: PhonePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    a = await get_aspirant(user, db)
    if a.verified_mpesa:
        return {"already_verified": True}
    payment = await start_stk(
        db, prefix=PREFIX_VERIFY, ref_id=a.id, phone=payload.phone,
        amount_kes=get_settings().MHESH_VERIFY_KES, description="Mhesh verify", user_id=user.id,
    )
    return {"checkout_request_id": payment.checkout_request_id}


@router.post("/aspirants/me/subscribe")
async def subscribe(
    payload: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    s = get_settings()
    a = await get_aspirant(user, db)
    price = s.MHESH_VERIFIED_TIER_KES if payload.tier == "verified" else s.MHESH_FEATURED_TIER_KES
    if price <= 0:
        raise HTTPException(503, "Tier pricing not configured")
    payment = await start_stk(
        db, prefix=PREFIX_SUBSCRIPTION, ref_id=a.id, suffix=payload.tier, phone=payload.phone,
        amount_kes=price, description=f"Mhesh {payload.tier}", user_id=user.id,
    )
    return {"checkout_request_id": payment.checkout_request_id, "amount_kes": price}


# ─── Followers ──────────────────────────────────────────────────────
async def _public_aspirant(db: AsyncSession, slug: str) -> MheshAspirant:
    a = (await db.execute(select(MheshAspirant).where(MheshAspirant.slug == slug))).scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Aspirant not found")
    return a


@router.post("/aspirants/{slug}/follow")
async def follow_aspirant(slug: str, payload: FollowerCreate, db: AsyncSession = Depends(get_db)) -> dict:
    a = await _public_aspirant(db, slug)
    existing = (await db.execute(
        select(MheshFollower.id).where(
            MheshFollower.aspirant_id == a.id, MheshFollower.contact == payload.contact)
    )).first()
    if existing:
        return {"ok": True, "already_following": True}

    f = MheshFollower(
        aspirant_id=a.id,
        contact=payload.contact,
        contact_kind=payload.contact_kind,
        verify_token=secrets.token_urlsafe(24),
        unsub_token=secrets.token_urlsafe(24),
    )
    db.add(f)
    await db.execute(update(MheshAspirant).where(MheshAspirant.id == a.id)
                     .values(follower_count=MheshAspirant.follower_count + 1))
    await db.commit()

    base = get_settings().MHESH_PUBLIC_URL
    verify_link = f"{base}/follow/verify?token={f.verify_token}"
    unsub_link = f"{base}/follow/unsubscribe?token={f.unsub_token}"
    try:
        if f.contact_kind == "email":
            await send_email(
                f.contact, f"Confirm you follow {a.display_name} on Mhesh",
                f"<p>Confirm you want campaign updates from {a.display_name}:</p>"
                f"<p><a href='{verify_link}'>Confirm</a></p>"
                f"<p><small>Not you? <a href='{unsub_link}'>Unsubscribe</a></small></p>",
            )
        else:
            await send_text(
                f.contact,
                f"Thibitisha kufuata {a.display_name} kwenye Mhesh: {verify_link}\nKujiondoa: {unsub_link}",
            )
    except Exception:
        pass
    return {"ok": True, "verification_sent": True}


@router.post("/followers/verify")
async def verify_follower(token: str, db: AsyncSession = Depends(get_db)) -> dict:
    f = (await db.execute(select(MheshFollower).where(MheshFollower.verify_token == token))).scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Invalid token")
    f.verified_at = datetime.utcnow()
    f.verify_token = None
    await db.commit()
    return {"ok": True}


@router.post("/followers/unsubscribe")
async def unsubscribe_follower(token: str, db: AsyncSession = Depends(get_db)) -> dict:
    f = (await db.execute(select(MheshFollower).where(MheshFollower.unsub_token == token))).scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Invalid token")
    await db.execute(update(MheshAspirant).where(MheshAspirant.id == f.aspirant_id)
                     .values(follower_count=MheshAspirant.follower_count - 1))
    await db.delete(f)
    await db.commit()
    return {"ok": True}


@router.get("/aspirants/me/followers")
async def list_followers(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    a = await get_aspirant(user, db)
    rows = (await db.execute(
        select(MheshFollower).where(MheshFollower.aspirant_id == a.id).order_by(MheshFollower.created_at.desc())
    )).scalars().all()
    return [{"id": str(f.id), "contact_kind": f.contact_kind, "verified": f.verified_at is not None,
             "contact": f.contact, "created_at": f.created_at.isoformat()} for f in rows]


# ─── Sharing + tracked WhatsApp clicks ──────────────────────────────
@router.post("/aspirants/{slug}/share")
async def share_link(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    a = await _public_aspirant(db, slug)
    return {"url": f"{get_settings().MHESH_PUBLIC_URL}/s/{a.slug}"}


@router.get("/s/{code}")
async def resolve_share(code: str, db: AsyncSession = Depends(get_db)) -> dict:
    a = await _public_aspirant(db, code)
    await db.execute(update(MheshAspirant).where(MheshAspirant.id == a.id)
                     .values(share_count=MheshAspirant.share_count + 1))
    await db.commit()
    return {"target": f"/p/{a.slug}"}


@router.get("/aspirants/{slug}/whatsapp")
async def whatsapp_click(slug: str, db: AsyncSession = Depends(get_db)) -> RedirectResponse:
    a = await _public_aspirant(db, slug)
    if not a.whatsapp_public:
        raise HTTPException(404, "No public WhatsApp number")
    await db.execute(update(MheshAspirant).where(MheshAspirant.id == a.id)
                     .values(whatsapp_click_count=MheshAspirant.whatsapp_click_count + 1))
    await db.commit()
    from app.services.mpesa import normalize_phone
    return RedirectResponse(f"https://wa.me/{normalize_phone(a.whatsapp_public)}", status_code=302)


# ─── Public read ────────────────────────────────────────────────────
@router.get("/aspirants/{slug}", response_model=AspirantPublic)
async def get_aspirant_public(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    a = await _public_aspirant(db, slug)
    await db.execute(update(MheshAspirant).where(MheshAspirant.id == a.id)
                     .values(view_count=MheshAspirant.view_count + 1))
    await db.commit()
    await db.refresh(a)
    return aspirant_dict(a)


@router.get("/aspirants", response_model=list[AspirantPublic])
async def list_aspirants(
    county: str | None = None,
    office: MheshOffice | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = select(MheshAspirant).where(MheshAspirant.verified_mpesa.is_(True))
    if county:
        q = q.where(MheshAspirant.county == county)
    if office:
        q = q.where(MheshAspirant.office == office)
    q = q.order_by(
        MheshAspirant.featured_until.desc().nullslast(),
        MheshAspirant.trust_score.desc(),
        MheshAspirant.created_at.desc(),
    ).limit(min(limit, 100)).offset(offset)
    return [aspirant_dict(r) for r in (await db.execute(q)).scalars().all()]


# ─── Reports ────────────────────────────────────────────────────────
@router.post("/reports")
async def submit_report(payload: ReportCreate, db: AsyncSession = Depends(get_db)) -> dict:
    db.add(MheshReport(**payload.model_dump()))
    await db.commit()
    return {"ok": True}
