import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.mhesh_models import (
    MheshAspirant,
    MheshEscrow,
    MheshEscrowStatus,
    MheshRating,
    MheshSupporter,
    MheshTask,
    MheshTaskApplication,
    MheshTaskStatus,
)
from app.models import User
from app.routers.mhesh_common import get_aspirant, get_supporter
from app.schemas_mhesh import (
    ApplicationOut,
    EvidenceSubmit,
    PhonePayload,
    RatingCreate,
    SupporterCreate,
    SupporterOut,
    TaskApply,
    TaskAssign,
    TaskCreate,
    TaskDispute,
    TaskOut,
)
from app.services import ai_mhesh
from app.services import compliance_mhesh as compliance
from app.services.escrow_mhesh import EscrowError, create_escrow, release
from app.services.payments_mhesh import PREFIX_VERIFY, start_stk
from app.services.storage import presigned_upload, public_url
from app.services.whatsapp import send_text

router = APIRouter(prefix="/api/mhesh", tags=["mhesh-tasks"])


async def _own_task(db: AsyncSession, aspirant_id: UUID, task_id: UUID, lock: bool = False) -> MheshTask:
    q = select(MheshTask).where(MheshTask.id == task_id, MheshTask.aspirant_id == aspirant_id)
    t = (await db.execute(q.with_for_update() if lock else q)).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Task not found")
    return t


async def _funded_escrow(db: AsyncSession, task_id: UUID) -> MheshEscrow | None:
    return (await db.execute(
        select(MheshEscrow).where(
            MheshEscrow.kind == "task",
            MheshEscrow.ref_id == task_id,
            MheshEscrow.status == MheshEscrowStatus.FUNDED,
        )
    )).scalars().first()


# ─── Aspirant: create + fund + publish ─────────────────────────────
@router.post("/tasks", response_model=TaskOut)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MheshTask:
    compliance.check_not_blackout()
    a = await get_aspirant(user, db)
    t = MheshTask(
        aspirant_id=a.id,
        escrow_fee_kes=int(payload.reward_kes * get_settings().MHESH_ESCROW_FEE_PCT),
        status=MheshTaskStatus.DRAFT,
        evidence_urls=[], verification_flags={},
        **payload.model_dump(),
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@router.get("/tasks", response_model=list[TaskOut])
async def list_own_tasks(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list:
    a = await get_aspirant(user, db)
    return list((await db.execute(
        select(MheshTask).where(MheshTask.aspirant_id == a.id).order_by(MheshTask.created_at.desc())
    )).scalars().all())


@router.get("/tasks/{task_id}", response_model=TaskOut)
async def get_task(task_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> MheshTask:
    t = (await db.execute(select(MheshTask).where(MheshTask.id == task_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Task not found")
    owner = (await db.execute(select(MheshAspirant.user_id).where(MheshAspirant.id == t.aspirant_id))).scalar_one()
    supporter = (await db.execute(
        select(MheshSupporter).where(MheshSupporter.user_id == user.id))).scalar_one_or_none()
    is_assignee = supporter is not None and t.assigned_supporter_id == supporter.id
    if owner != user.id and not is_assignee and t.status != MheshTaskStatus.PUBLISHED:
        raise HTTPException(404, "Task not found")
    return t


@router.post("/tasks/{task_id}/fund")
async def fund_task(
    task_id: UUID,
    payload: PhonePayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    compliance.check_not_blackout()
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id)
    if t.status not in (MheshTaskStatus.DRAFT, MheshTaskStatus.FUNDED):
        raise HTTPException(400, "Task is not in draft")
    if await _funded_escrow(db, t.id):
        raise HTTPException(400, "Task already funded")

    total = t.reward_kes + t.escrow_fee_kes
    escrow = await create_escrow(
        db, kind="task", ref_id=t.id, aspirant_id=a.id, amount_kes=total, phone=payload.phone, user_id=user.id,
    )
    return {"escrow_id": str(escrow.id), "checkout_request_id": escrow.checkout_request_id, "amount_kes": total}


@router.get("/tasks/{task_id}/escrow")
async def task_escrow(task_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id)
    e = (await db.execute(
        select(MheshEscrow).where(MheshEscrow.kind == "task", MheshEscrow.ref_id == t.id)
        .order_by(MheshEscrow.created_at.desc())
    )).scalars().first()
    if not e:
        return {"status": None}
    return {"id": str(e.id), "status": e.status.value, "amount_kes": e.amount_kes,
            "mpesa_receipt": e.mpesa_receipt, "b2c_receipt": e.b2c_receipt}


@router.post("/tasks/{task_id}/publish", response_model=TaskOut)
async def publish_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MheshTask:
    compliance.check_not_blackout()
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id)
    if t.status not in (MheshTaskStatus.DRAFT, MheshTaskStatus.FUNDED):
        raise HTTPException(400, "Task cannot be published from its current state")
    if not await _funded_escrow(db, t.id):
        raise HTTPException(400, "Fund escrow before publishing")
    t.status = MheshTaskStatus.PUBLISHED
    await db.commit()
    await db.refresh(t)
    return t


@router.get("/tasks/{task_id}/applications", response_model=list[ApplicationOut])
async def list_applications(
    task_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> list[dict]:
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id)
    rows = (await db.execute(
        select(MheshTaskApplication, MheshSupporter)
        .join(MheshSupporter, MheshSupporter.id == MheshTaskApplication.supporter_id)
        .where(MheshTaskApplication.task_id == t.id)
        .order_by(MheshSupporter.trust_score.desc(), MheshTaskApplication.created_at)
    )).all()
    return [
        {"id": app.id, "supporter_id": s.id, "display_name": s.display_name, "trust_score": s.trust_score,
         "tasks_completed": s.tasks_completed, "verified_mpesa": s.verified_mpesa, "message": app.message,
         "created_at": app.created_at}
        for app, s in rows
    ]


# ─── Supporter: profile + applications ─────────────────────────────
@router.post("/supporters/me", response_model=SupporterOut)
async def create_supporter(
    payload: SupporterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MheshSupporter:
    if (await db.execute(select(MheshSupporter.id).where(MheshSupporter.user_id == user.id))).first():
        raise HTTPException(400, "Supporter profile already exists")
    s = MheshSupporter(user_id=user.id, **payload.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


@router.get("/supporters/me", response_model=SupporterOut)
async def get_supporter_me(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> MheshSupporter:
    return await get_supporter(user, db)


@router.post("/supporters/me/verify-mpesa")
async def verify_supporter_mpesa(
    payload: PhonePayload, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> dict:
    s = await get_supporter(user, db)
    if s.verified_mpesa:
        return {"already_verified": True}
    payment = await start_stk(
        db, prefix=PREFIX_VERIFY, ref_id=s.id, phone=payload.phone,
        amount_kes=get_settings().MHESH_VERIFY_KES, description="Mhesh verify", user_id=user.id,
    )
    return {"checkout_request_id": payment.checkout_request_id}


@router.get("/supporters/me/tasks", response_model=list[TaskOut])
async def available_tasks(
    county: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list:
    s = await get_supporter(user, db)
    q = select(MheshTask).where(MheshTask.status == MheshTaskStatus.PUBLISHED)
    if county or s.county:
        q = q.where(MheshTask.county == (county or s.county))
    return list((await db.execute(q.order_by(MheshTask.created_at.desc()).limit(50))).scalars().all())


@router.get("/supporters/me/assigned", response_model=list[TaskOut])
async def assigned_tasks(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list:
    s = await get_supporter(user, db)
    return list((await db.execute(
        select(MheshTask).where(MheshTask.assigned_supporter_id == s.id).order_by(MheshTask.created_at.desc())
    )).scalars().all())


@router.get("/supporters/me/earnings")
async def earnings(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    s = await get_supporter(user, db)
    fee = get_settings().MHESH_PLATFORM_FEE_PCT
    rows = (await db.execute(
        select(MheshTask).where(MheshTask.assigned_supporter_id == s.id, MheshTask.status == MheshTaskStatus.APPROVED)
        .order_by(MheshTask.approved_at.desc())
    )).scalars().all()
    return {
        "supporter": SupporterOut.model_validate(s).model_dump(mode="json"),
        "ledger": [{"task_id": str(t.id), "title": t.title, "payout_kes": int(t.reward_kes * (1 - fee)),
                    "approved_at": t.approved_at.isoformat() if t.approved_at else None} for t in rows],
    }


@router.post("/tasks/{task_id}/apply")
async def apply_for_task(
    task_id: UUID,
    payload: TaskApply,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    compliance.check_not_blackout()
    s = await get_supporter(user, db)
    t = (await db.execute(select(MheshTask).where(MheshTask.id == task_id))).scalar_one_or_none()
    if not t or t.status != MheshTaskStatus.PUBLISHED:
        raise HTTPException(404, "Task not open")

    existing = (await db.execute(
        select(MheshTaskApplication.id).where(
            MheshTaskApplication.task_id == t.id, MheshTaskApplication.supporter_id == s.id)
    )).first()
    if existing:
        return {"ok": True, "already_applied": True}

    await compliance.rate_limit(user.id, "task_application", get_settings().MHESH_DAILY_TASK_APPLY_LIMIT)
    db.add(MheshTaskApplication(task_id=t.id, supporter_id=s.id, message=payload.message))
    await db.commit()
    return {"ok": True}


@router.post("/tasks/{task_id}/assign")
async def assign_task(
    task_id: UUID,
    payload: TaskAssign,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    compliance.check_not_blackout()
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id, lock=True)
    if t.status != MheshTaskStatus.PUBLISHED:
        raise HTTPException(400, "Task is not open for assignment")
    applied = (await db.execute(
        select(MheshTaskApplication.id).where(
            MheshTaskApplication.task_id == t.id, MheshTaskApplication.supporter_id == payload.supporter_id)
    )).first()
    if not applied:
        raise HTTPException(400, "Supporter has not applied for this task")

    t.assigned_supporter_id = payload.supporter_id
    t.status = MheshTaskStatus.ASSIGNED
    await db.commit()

    s = (await db.execute(select(MheshSupporter).where(MheshSupporter.id == payload.supporter_id))).scalar_one()
    try:
        await send_text(
            to=s.phone,
            body=f"Umechaguliwa kwa kazi: {t.title}. Fungua {get_settings().MHESH_PUBLIC_URL}/work/{t.id} kuanza.",
        )
    except Exception:
        pass
    return {"ok": True}


@router.post("/tasks/{task_id}/evidence-upload-url")
async def evidence_upload_url(
    task_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> dict:
    s = await get_supporter(user, db)
    t = (await db.execute(
        select(MheshTask).where(MheshTask.id == task_id, MheshTask.assigned_supporter_id == s.id)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Task not found")
    key = f"mhesh/tasks/{t.id}/evidence/{uuid.uuid4()}.jpg"
    return {"upload_url": presigned_upload(key, "image/jpeg"), "key": key, "public_url": public_url(key)}


@router.post("/tasks/{task_id}/submit-evidence")
async def submit_evidence(
    task_id: UUID,
    payload: EvidenceSubmit,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    s = await get_supporter(user, db)
    t = (await db.execute(
        select(MheshTask).where(MheshTask.id == task_id, MheshTask.assigned_supporter_id == s.id)
    )).scalar_one_or_none()
    if not t or t.status != MheshTaskStatus.ASSIGNED:
        raise HTTPException(400, "Task is not awaiting evidence")

    verification = await ai_mhesh.verify_evidence(
        t.category.value, payload.evidence_urls,
        evidence_lat=payload.lat, evidence_lng=payload.lng,
        task_lat=t.location_lat, task_lng=t.location_lng,
    )
    t.evidence_urls = payload.evidence_urls
    t.verification_score = verification["score"]
    t.verification_flags = {**verification["flags"], "reason": verification["reason"],
                            "note": payload.note, "lat": payload.lat, "lng": payload.lng}
    t.status = MheshTaskStatus.COMPLETED
    t.completed_at = datetime.utcnow()
    await db.commit()
    return {"ok": True, "verification": verification}


@router.post("/tasks/{task_id}/approve")
async def approve_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id, lock=True)
    if t.status != MheshTaskStatus.COMPLETED:
        raise HTTPException(400, "Task is not completed")
    escrow = await _funded_escrow(db, t.id)
    if not escrow:
        raise HTTPException(400, "Escrow not funded")

    s = (await db.execute(select(MheshSupporter).where(MheshSupporter.id == t.assigned_supporter_id))).scalar_one()
    payout = int(t.reward_kes * (1 - get_settings().MHESH_PLATFORM_FEE_PCT))
    try:
        await release(db, escrow.id, s.phone, payout)
    except EscrowError as e:
        raise HTTPException(400, str(e))

    t.status = MheshTaskStatus.APPROVED
    t.approved_at = datetime.utcnow()
    s.tasks_completed += 1
    s.total_earned_kes += payout
    await db.commit()

    try:
        await send_text(to=s.phone, body=f"Malipo yametumwa: KSh {payout}. Asante!")
    except Exception:
        pass
    return {"ok": True, "payout_kes": payout}


@router.post("/tasks/{task_id}/dispute")
async def dispute_task(
    task_id: UUID,
    payload: TaskDispute,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    a = await get_aspirant(user, db)
    t = await _own_task(db, a.id, task_id, lock=True)
    if t.status not in (MheshTaskStatus.ASSIGNED, MheshTaskStatus.COMPLETED):
        raise HTTPException(400, "Only assigned or completed tasks can be disputed")
    t.status = MheshTaskStatus.DISPUTED
    t.verification_flags = {**(t.verification_flags or {}), "dispute_reason": payload.reason}
    escrow = await _funded_escrow(db, t.id)
    if escrow:
        # Locked until ops resolves (release to supporter or refund to the campaign account).
        escrow.status = MheshEscrowStatus.DISPUTED
    if t.assigned_supporter_id:
        s = (await db.execute(select(MheshSupporter).where(MheshSupporter.id == t.assigned_supporter_id))).scalar_one()
        s.tasks_disputed += 1
    await db.commit()
    return {"ok": True}


@router.post("/tasks/{task_id}/rate")
async def rate_task(
    task_id: UUID,
    payload: RatingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Aspirant rates the supporter, or the supporter rates the aspirant, once per approved task."""
    t = (await db.execute(select(MheshTask).where(MheshTask.id == task_id))).scalar_one_or_none()
    if not t or t.status != MheshTaskStatus.APPROVED:
        raise HTTPException(400, "Only approved tasks can be rated")
    a = (await db.execute(select(MheshAspirant).where(MheshAspirant.id == t.aspirant_id))).scalar_one()
    s = (await db.execute(select(MheshSupporter).where(MheshSupporter.id == t.assigned_supporter_id))).scalar_one()
    if a.user_id == user.id:
        rater_id, rater_kind = a.id, "aspirant"
    elif s.user_id == user.id:
        rater_id, rater_kind = s.id, "supporter"
    else:
        raise HTTPException(403, "Not a party to this task")
    dup = (await db.execute(select(MheshRating.id).where(
        MheshRating.kind == "task", MheshRating.subject_id == t.id, MheshRating.rater_id == rater_id))).first()
    if dup:
        raise HTTPException(400, "Already rated")
    db.add(MheshRating(kind="task", subject_id=t.id, rater_id=rater_id, rater_kind=rater_kind, **payload.model_dump()))
    await db.commit()
    return {"ok": True}


