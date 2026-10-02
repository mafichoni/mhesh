"""
Mhesh AI service — image generation, prompt/profile moderation, evidence scoring.
Uses the shared RunPod GPU endpoint and the shared LLM endpoint.
"""
import json
import math
import re
import time
from uuid import UUID

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()

MODEL_NAME = "flux1-dev"
MANUAL_REVIEW_THRESHOLD = 0.6

# ─── Blocklists ─────────────────────────────────────────────────────
# Expandable by ops. Matched on word boundaries, case-insensitive.
BLOCKED_PERSON_NAMES = {
    # Prominent political figures — prevents impersonation / depiction without consent.
    "raila", "odinga", "ruto", "uhuru", "kenyatta", "kibaki", "moi", "mudavadi",
    "kalonzo", "musyoka", "wetangula", "gachagua", "kindiki", "matiangi", "karua",
    "sakaja", "sonko", "joho", "kibicho", "natembeya",
}

DEFAMATION_TERMS = {
    # English
    "thief", "corrupt", "murderer", "killer", "criminal", "fraudster", "rapist", "conman",
    # Swahili
    "mwiwi", "mwizi", "wezi", "fisadi", "mafisadi", "muuaji", "jambazi", "majambazi",
    "tapeli", "mlaghai", "mkaidi", "mhaini", "mzinzi", "mchawi",
    # Sheng
    "mkora", "makora", "mwizi wa kura", "mbwa", "fala", "mafala",
}

VIOLENCE_TERMS = {
    "kill", "attack", "burn", "mafia", "assassinate", "weapon", "gun", "machete", "bomb",
    "chinja", "silaha", "bunduki", "panga", "ua wote",
}

# Requests to depict an identifiable third party (title + capitalised name, or rivals).
_THIRD_PARTY_PATTERNS = [
    re.compile(r"\b(?i:president|governor|senator|hon|honourable|dr|pastor|bishop|"
               r"mp|mca|cs|cabinet secretary|rev)\.?\s+[A-Z][a-z]{2,}"),
    re.compile(r"\b(opponent|rival|competitor|mpinzani|wapinzani)\b", re.IGNORECASE),
    re.compile(r"@\w{3,}"),
]


def _contains_term(text: str, terms: set[str]) -> str | None:
    for term in sorted(terms):
        if re.search(rf"\b{re.escape(term)}\b", text):
            return term
    return None


def moderate_text(text: str) -> dict:
    """Defamation + violence filter for profile text. Returns {"approved", "reason"}."""
    t = (text or "").lower()
    if term := _contains_term(t, DEFAMATION_TERMS):
        return {"approved": False, "reason": f"Potentially defamatory language ({term})"}
    if term := _contains_term(t, VIOLENCE_TERMS):
        return {"approved": False, "reason": f"References violence ({term})"}
    return {"approved": True, "reason": None}


def moderate_prompt(prompt: str) -> dict:
    """
    Returns {"approved": bool, "reason": str | None}.
    Called before any GPU generation. Refuses depiction of anyone but the profile owner.
    """
    if not prompt or len(prompt.strip()) < 3:
        return {"approved": False, "reason": "Prompt too short"}

    p = prompt.lower()
    if name := _contains_term(p, BLOCKED_PERSON_NAMES):
        return {"approved": False, "reason": f"Prompt references a public figure ({name}) — not allowed"}
    for pat in _THIRD_PARTY_PATTERNS:
        if m := pat.search(prompt):
            return {"approved": False,
                    "reason": f"Prompt depicts a person other than the profile owner ({m.group(0)}) — not allowed"}
    if term := _contains_term(p, DEFAMATION_TERMS):
        return {"approved": False, "reason": f"Prompt contains potentially defamatory language ({term})"}
    if term := _contains_term(p, VIOLENCE_TERMS):
        return {"approved": False, "reason": f"Prompt references violence ({term})"}
    return {"approved": True, "reason": None}


# ─── LoRA training ──────────────────────────────────────────────────
async def train_lora(aspirant_id: UUID, reference_image_urls: list[str]) -> dict:
    """Trigger LoRA training on the GPU worker. Returns {"lora_key", "trained_at"}."""
    s = get_settings()
    async with httpx.AsyncClient(timeout=1800) as client:
        r = await client.post(
            f"{s.WAN_INFERENCE_URL}/train/lora",
            headers={"Authorization": f"Bearer {s.WAN_INFERENCE_TOKEN}"},
            json={
                "aspirant_id": str(aspirant_id),
                "image_urls": reference_image_urls,
                "output_key": f"mhesh/{aspirant_id}/lora",
            },
        )
        r.raise_for_status()
        return r.json()


# ─── Image generation ───────────────────────────────────────────────
STYLE_PROMPTS = {
    "rally_podium": "photorealistic image of the subject standing at a podium at a large outdoor political rally, Kenyan flag colours in the crowd, golden hour, confident posture, professional news photography style",
    "market_visit": "photorealistic image of the subject greeting market vendors, colourful produce, smiling, warm natural light, documentary photography style",
    "church_service": "photorealistic image of the subject attending a church service, respectful attire, warm interior lighting, reverent atmosphere",
    "development_project": "photorealistic image of the subject at a groundbreaking ceremony for a new road or water project, work boots, hardhat, dignitaries in background",
    "youth_dialogue": "photorealistic image of the subject in conversation with young people, casual attire, bright daylight, community hall setting",
    "portrait_formal": "professional studio headshot of the subject, formal attire, neutral background, sharp focus, political campaign photography",
    "portrait_casual": "candid portrait of the subject, warm smile, informal attire, soft natural light",
    "community_hall": "photorealistic image of the subject speaking at a community hall meeting, attentive audience, indoor lighting",
    "door_to_door": "photorealistic image of the subject greeting residents at their doorstep, warm interaction, residential neighbourhood",
    "billboard": "dramatic portrait of the subject suitable for a large billboard, bold confident pose, ample space for slogan text, bright sky background",
}
# Background people in style scenes must never be recognisable individuals.
_CROWD_GUARD = "background people are anonymous and not identifiable"


def build_prompt(style_template: str, custom_prompt: str | None) -> str:
    if style_template not in STYLE_PROMPTS:
        raise ValueError(f"Unknown style template: {style_template}")
    base = f"{STYLE_PROMPTS[style_template]}, {_CROWD_GUARD}"
    if custom_prompt:
        mod = moderate_prompt(custom_prompt)
        if not mod["approved"]:
            raise ValueError(mod["reason"])
        base = f"{base}. {custom_prompt}"
    return base


async def generate_image(
    aspirant_id: UUID,
    style_template: str,
    custom_prompt: str | None,
    num_images: int,
    output_formats: list[str],
    generation_id: UUID | None = None,
) -> dict:
    """Returns {"output_urls": [...], "generation_ms": int, "model": str, "prompt": str}."""
    prompt = build_prompt(style_template, custom_prompt)
    s = get_settings()
    started = time.time()
    async with httpx.AsyncClient(timeout=600) as client:
        r = await client.post(
            f"{s.WAN_INFERENCE_URL}/generate/mhesh_image",
            headers={"Authorization": f"Bearer {s.WAN_INFERENCE_TOKEN}"},
            json={
                "aspirant_id": str(aspirant_id),
                "generation_id": str(generation_id) if generation_id else None,
                "style_template": style_template,
                "prompt": prompt,
                "num_images": num_images,
                "output_formats": output_formats,
            },
        )
        r.raise_for_status()
        data = r.json()

    data["generation_ms"] = int((time.time() - started) * 1000)
    data["prompt"] = prompt
    data.setdefault("model", MODEL_NAME)
    return data


# ─── Evidence verification ──────────────────────────────────────────
MIN_EVIDENCE_PHOTOS = {
    "print_merchandise": 3,
    "distribute_posters": 5,
    "distribute_merch": 4,
    "event_staffing": 3,
    "digital_amplification": 2,
    "canvassing": 4,
}
MAX_DISTANCE_KM = 15.0

EVIDENCE_SYSTEM = """You review photo evidence of completed campaign work
in Kenya. Score the evidence 0.0 to 1.0 based on:

- Quantity (were enough photos submitted for the task category?)
- Relevance (do the photos clearly show the work being done?)
- Authenticity signals (natural lighting, varied angles, real-world setting)

Return strict JSON:
{"score": <float>, "flags": {"too_few": bool, "unclear": bool, "suspicious": bool}, "reason": "<short>"}

Be strict. Score below 0.6 if evidence is weak."""


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _evidence_prompt(category: str, urls: list[str]) -> str:
    return (
        f"Task category: {category}\n"
        f"Evidence URL count: {len(urls)}\n"
        f"URLs: {urls}\n\n"
        "Evaluate and return JSON."
    )


def _parse_evidence_result(content: str) -> dict:
    try:
        data = json.loads(content)
        return {
            "score": max(0.0, min(1.0, float(data.get("score", 0.5)))),
            "flags": dict(data.get("flags", {})),
            "reason": str(data.get("reason", "")),
        }
    except Exception as e:
        log.warning("evidence_parse_failed", error=str(e), content=content[:500])
        return {"score": 0.5, "flags": {"parse_error": True}, "reason": "Parse failed"}


async def _llm_score(task_category: str, evidence_urls: list[str]) -> dict:
    s = get_settings()
    if not s.LLM_INFERENCE_URL:
        return {"score": 0.5, "flags": {"llm_unavailable": True}, "reason": "LLM not configured"}
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{s.LLM_INFERENCE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {s.LLM_INFERENCE_TOKEN}"},
                json={
                    "model": "qwen2.5-7b-instruct",
                    "messages": [
                        {"role": "system", "content": EVIDENCE_SYSTEM},
                        {"role": "user", "content": _evidence_prompt(task_category, evidence_urls)},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                },
            )
            r.raise_for_status()
            return _parse_evidence_result(r.json()["choices"][0]["message"]["content"])
    except Exception as e:
        log.warning("evidence_llm_failed", error=str(e))
        return {"score": 0.5, "flags": {"llm_unavailable": True}, "reason": "LLM unavailable"}


async def verify_evidence(
    task_category: str,
    evidence_urls: list[str],
    evidence_lat: float | None = None,
    evidence_lng: float | None = None,
    task_lat: float | None = None,
    task_lng: float | None = None,
) -> dict:
    """
    Returns {"score": 0.0-1.0, "flags": {...}, "reason": str}.
    Combines LLM scoring with deterministic count and geotag checks.
    Score below 0.6 flags for manual review. Approval is always human.
    """
    result = await _llm_score(task_category, evidence_urls)
    score, flags = result["score"], result["flags"]

    if len(evidence_urls) < MIN_EVIDENCE_PHOTOS.get(task_category, 1):
        flags["too_few"] = True
        score = min(score, 0.5)

    if evidence_lat is None or evidence_lng is None:
        flags["no_geotag"] = True
    elif task_lat is not None and task_lng is not None:
        dist = haversine_km(evidence_lat, evidence_lng, task_lat, task_lng)
        flags["distance_km"] = round(dist, 2)
        if dist > MAX_DISTANCE_KM:
            flags["far_from_task"] = True
            score = min(score, 0.4)

    flags["manual_review"] = score < MANUAL_REVIEW_THRESHOLD
    return {"score": round(score, 3), "flags": flags, "reason": result["reason"]}
