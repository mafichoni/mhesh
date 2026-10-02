import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import AsyncSessionLocal, get_db
from app.mhesh_models import MheshAspirant, MheshImageGeneration
from app.models import User
from app.routers.mhesh_common import get_aspirant
from app.schemas_mhesh import StudioGenerateOut, StudioGenerateRequest, StudioTrainRequest
from app.services import ai_mhesh
from app.services import compliance_mhesh as compliance
from app.services.redis_client import get_redis
from app.services.storage import presigned_get, presigned_upload

router = APIRouter(prefix="/api/mhesh/studio", tags=["mhesh-studio"])
log = structlog.get_logger()

LORA_STATUS_KEY = "mhesh:lora:{aspirant_id}:status"


async def _run_lora_training(aspirant_id: uuid.UUID, urls: list[str]) -> None:
    key = LORA_STATUS_KEY.format(aspirant_id=aspirant_id)
    try:
        result = await ai_mhesh.train_lora(aspirant_id, urls)
        async with AsyncSessionLocal() as db:
            a = (await db.execute(select(MheshAspirant).where(MheshAspirant.id == aspirant_id))).scalar_one()
            a.lora_key = result["lora_key"]
            a.lora_trained_at = datetime.utcnow()
            await db.commit()
        await get_redis().set(key, "trained", ex=86400)
    except Exception as e:
        log.exception("mhesh_lora_training_failed", aspirant_id=str(aspirant_id))
        await get_redis().set(key, f"failed:{str(e)[:200]}", ex=86400)


@router.post("/upload-reference-url")
async def upload_reference_url(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    a = await get_aspirant(user, db)
    key = f"mhesh/{a.id}/refs/{uuid.uuid4()}.jpg"
    return {"upload_url": presigned_upload(key, "image/jpeg"), "key": key}


@router.post("/train-lora", status_code=202)
async def train_lora(
    payload: StudioTrainRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    a = await get_aspirant(user, db)
    prefix = f"mhesh/{a.id}/refs/"
    if any(not k.startswith(prefix) for k in payload.reference_keys):
        raise HTTPException(400, "Reference photos must be your own uploads")
    status_key = LORA_STATUS_KEY.format(aspirant_id=a.id)
    if await get_redis().get(status_key) == "training":
        raise HTTPException(409, "Training already in progress")
    await get_redis().set(status_key, "training", ex=3600)
    # Reference photos are private: the GPU worker gets short-lived signed URLs, never public ones.
    urls = [presigned_get(k, expires=3600) for k in payload.reference_keys]
    background.add_task(_run_lora_training, a.id, urls)
    return {"status": "training"}


@router.get("/lora-status")
async def lora_status(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    a = await get_aspirant(user, db)
    status = await get_redis().get(LORA_STATUS_KEY.format(aspirant_id=a.id))
    if status and status.startswith("failed"):
        return {"status": "failed", "error": status.removeprefix("failed:"), "lora_trained_at": a.lora_trained_at}
    if status == "training":
        return {"status": "training", "lora_trained_at": a.lora_trained_at}
    return {"status": "trained" if a.lora_key else "untrained", "lora_trained_at": a.lora_trained_at}


@router.post("/generate", response_model=StudioGenerateOut)
async def generate(
    payload: StudioGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StudioGenerateOut:
    compliance.check_not_blackout()
    s = get_settings()
    a = await get_aspirant(user, db)
    if not a.lora_key:
        raise HTTPException(400, "LoRA not trained. Upload reference photos first.")

    def _rejected(reason: str) -> MheshImageGeneration:
        return MheshImageGeneration(
            aspirant_id=a.id, style_template=payload.style_template,
            prompt=payload.custom_prompt or "", output_urls=[], model=ai_mhesh.MODEL_NAME,
            lora_key=a.lora_key, rejected=True, rejection_reason=reason,
            audit_metadata={"rejected_at": datetime.utcnow().isoformat(), "user_id": str(user.id)},
        )

    # Moderation first: rejected prompts are logged and never consume quota.
    try:
        ai_mhesh.build_prompt(payload.style_template, payload.custom_prompt)
    except ValueError as e:
        db.add(_rejected(str(e)))
        await db.commit()
        log.warning("mhesh_prompt_rejected", aspirant_id=str(a.id), reason=str(e))
        raise HTTPException(400, str(e))

    await compliance.rate_limit(user.id, "image_generation", s.MHESH_DAILY_GEN_LIMIT, payload.num_images)

    generation_id = uuid.uuid4()
    try:
        result = await ai_mhesh.generate_image(
            aspirant_id=a.id,
            style_template=payload.style_template,
            custom_prompt=payload.custom_prompt,
            num_images=payload.num_images,
            output_formats=list(payload.output_formats),
            generation_id=generation_id,
        )
    except Exception as e:
        await compliance.refund_rate(user.id, "image_generation", payload.num_images)
        log.exception("mhesh_generation_failed", aspirant_id=str(a.id))
        raise HTTPException(502, f"Image generation failed: {type(e).__name__}")

    gen = MheshImageGeneration(
        id=generation_id,
        aspirant_id=a.id,
        style_template=payload.style_template,
        prompt=payload.custom_prompt or "",
        output_urls=result["output_urls"],
        model=result["model"],
        lora_key=a.lora_key,
        cost_kes=s.MHESH_IMAGE_COST_KES * payload.num_images,
        generation_ms=result.get("generation_ms", 0),
        audit_metadata={
            "ai_generated": True,
            "full_prompt": result["prompt"],
            "model": result["model"],
            "num_images": payload.num_images,
            "output_formats": list(payload.output_formats),
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": str(user.id),
            "watermark": result.get("watermark", {"exif": True, "visible_tag": True}),
        },
    )
    db.add(gen)
    await db.commit()
    await db.refresh(gen)
    return StudioGenerateOut(
        generation_id=gen.id, output_urls=gen.output_urls, cost_kes=gen.cost_kes, generation_ms=gen.generation_ms,
    )


@router.get("/generations")
async def list_generations(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    a = await get_aspirant(user, db)
    rows = (await db.execute(
        select(MheshImageGeneration)
        .where(MheshImageGeneration.aspirant_id == a.id)
        .order_by(MheshImageGeneration.created_at.desc())
        .limit(min(limit, 100))
    )).scalars().all()
    return [
        {
            "id": str(r.id),
            "style_template": r.style_template,
            "prompt": r.prompt,
            "output_urls": r.output_urls,
            "cost_kes": r.cost_kes,
            "model": r.model,
            "created_at": r.created_at.isoformat(),
            "rejected": r.rejected,
            "rejection_reason": r.rejection_reason,
        }
        for r in rows
    ]


@router.get("/usage")
async def usage(user: User = Depends(get_current_user)) -> dict:
    used = int(await get_redis().get(f"mhesh:rate:{user.id}:image_generation") or 0)
    return {"used_today": used, "daily_limit": get_settings().MHESH_DAILY_GEN_LIMIT}
