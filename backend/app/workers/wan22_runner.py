"""
GPU worker (RunPod). Mhesh routes: /generate/mhesh_image and /train/lora.

Run on the GPU pod with:  uvicorn app.workers.wan22_runner:app --host 0.0.0.0 --port 8000
Requires /opt/flux/{inference,train_lora}.py and the /runpod-volume network volume.
"""
import asyncio
import hmac
import json
import os
import subprocess
import tempfile
import uuid
from datetime import datetime

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.storage import upload_file

app = FastAPI(title="Mafichoni GPU worker")
settings = get_settings()

VOLUME = os.environ.get("RUNPOD_VOLUME", "/runpod-volume")
FORMAT_SIZES = {
    "story": (1080, 1920),
    "post": (1080, 1350),
    "billboard": (4000, 2000),
    "banner": (3000, 1000),
    "tshirt": (3000, 3000),
    "cap": (2000, 1000),
    "umbrella": (2400, 2400),
    "a3": (3508, 4961),
}
AI_TAG = "AI-generated · Mhesh"


def _auth(authorization: str = Header("")) -> None:
    expected = f"Bearer {settings.WAN_INFERENCE_TOKEN}"
    if not settings.WAN_INFERENCE_TOKEN or not hmac.compare_digest(authorization or "", expected):
        raise HTTPException(401, "Unauthorized")


class MheshImageRequest(BaseModel):
    aspirant_id: uuid.UUID
    generation_id: uuid.UUID | None = None
    style_template: str
    prompt: str = Field(max_length=2000)
    num_images: int = Field(default=1, ge=1, le=4)
    output_formats: list[str] = Field(default_factory=lambda: ["story"])


class LoraTrainRequest(BaseModel):
    aspirant_id: uuid.UUID
    image_urls: list[str] = Field(min_length=5, max_length=10)
    output_key: str


def _finalize(src: str, fmt: str, tmp: str, audit: dict) -> str:
    """Resize/pad to the format, burn in a visible AI tag, and embed the EXIF audit watermark."""
    from PIL import Image, ImageDraw, ImageFont

    w, h = FORMAT_SIZES.get(fmt, FORMAT_SIZES["story"])
    img = Image.open(src).convert("RGB")
    img.thumbnail((w, h), Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), (0, 0, 0))
    canvas.paste(img, ((w - img.width) // 2, (h - img.height) // 2))

    draw = ImageDraw.Draw(canvas, "RGBA")
    size = max(18, w // 45)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except OSError:
        font = ImageFont.load_default()
    x0, y0, x1, y1 = draw.textbbox((0, 0), AI_TAG, font=font)
    pad = size // 2
    bw, bh = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    bx, by = w - bw - pad * 2, h - bh - pad * 2
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=bh // 2, fill=(0, 0, 0, 180))
    draw.text((bx + pad - x0, by + pad - y0), AI_TAG, font=font, fill=(255, 255, 255, 255))

    exif = Image.Exif()
    exif[0x010E] = "AI-generated image (Mhesh Studio)"  # ImageDescription
    exif[0x0131] = "Mhesh Studio / flux1-dev"  # Software
    exif[0x9286] = json.dumps(audit)  # UserComment
    out = os.path.join(tmp, f"{os.path.basename(src)}_{fmt}.jpg")
    canvas.save(out, "JPEG", quality=92, exif=exif.tobytes())
    return out


@app.post("/generate/mhesh_image", dependencies=[Depends(_auth)])
async def generate_mhesh_image(req: MheshImageRequest) -> dict:
    lora_path = os.path.join(VOLUME, "mhesh", str(req.aspirant_id), "lora")
    if not os.path.exists(lora_path):
        raise HTTPException(400, "LoRA not trained for this aspirant")

    tmp = tempfile.mkdtemp(prefix=f"mhesh_{req.aspirant_id}_")
    audit = {
        "ai_generated": True, "platform": "Mhesh", "model": "flux1-dev",
        "aspirant_id": str(req.aspirant_id),
        "generation_id": str(req.generation_id) if req.generation_id else None,
        "style_template": req.style_template,
        "generated_at": datetime.utcnow().isoformat(),
    }
    outputs: list[str] = []
    for i in range(req.num_images):
        raw = os.path.join(tmp, f"img_{i}.png")
        await asyncio.to_thread(subprocess.run, [
            "python", "/opt/flux/inference.py",
            "--prompt", req.prompt,
            "--lora", lora_path,
            "--output", raw,
            "--width", "1024", "--height", "1536",
            "--steps", "28", "--guidance", "3.5",
        ], check=True)
        for fmt in req.output_formats:
            final = await asyncio.to_thread(_finalize, raw, fmt, tmp, audit)
            key = f"mhesh/{req.aspirant_id}/generations/{uuid.uuid4()}_{fmt}.jpg"
            outputs.append(await asyncio.to_thread(upload_file, final, key, "image/jpeg"))

    return {
        "output_urls": outputs,
        "model": "flux1-dev",
        "num_images": req.num_images,
        "watermark": {"exif": True, "visible_tag": AI_TAG},
    }


@app.post("/train/lora", dependencies=[Depends(_auth)])
async def train_lora(req: LoraTrainRequest) -> dict:
    expected_key = f"mhesh/{req.aspirant_id}/lora"
    if req.output_key != expected_key:
        raise HTTPException(400, "Invalid output key")

    tmp = tempfile.mkdtemp(prefix=f"lora_{req.aspirant_id}_")
    async with httpx.AsyncClient(timeout=120) as c:
        for i, url in enumerate(req.image_urls):
            r = await c.get(url)
            r.raise_for_status()
            with open(os.path.join(tmp, f"ref_{i}.jpg"), "wb") as f:
                f.write(r.content)

    out_dir = os.path.join(VOLUME, req.output_key)
    os.makedirs(out_dir, exist_ok=True)
    await asyncio.to_thread(subprocess.run, [
        "python", "/opt/flux/train_lora.py",
        "--input-dir", tmp,
        "--output-dir", out_dir,
        "--steps", "1000",
        "--rank", "16",
    ], check=True)
    return {"lora_key": req.output_key, "trained_at": datetime.utcnow().isoformat()}
