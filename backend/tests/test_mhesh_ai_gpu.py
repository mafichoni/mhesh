"""AI service HTTP clients and the GPU worker routes (subprocess + R2 mocked)."""
import json
import os
import uuid

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.services import ai_mhesh

REAL_ASYNC_CLIENT = httpx.AsyncClient
# Captured at import, before conftest's autouse GPU mocks replace them per test.
REAL_GENERATE, REAL_TRAIN = ai_mhesh.generate_image, ai_mhesh.train_lora


def _mock_httpx(monkeypatch, handler):
    def factory(*a, **kw):
        kw["transport"] = httpx.MockTransport(handler)
        return REAL_ASYNC_CLIENT(*a, **kw)
    monkeypatch.setattr(httpx, "AsyncClient", factory)


@pytest.fixture
def real_ai(monkeypatch):
    monkeypatch.setattr(ai_mhesh, "generate_image", REAL_GENERATE)
    monkeypatch.setattr(ai_mhesh, "train_lora", REAL_TRAIN)
    return ai_mhesh


async def test_generate_image_client(monkeypatch, settings, real_ai):
    monkeypatch.setattr(settings, "WAN_INFERENCE_URL", "http://gpu")
    monkeypatch.setattr(settings, "WAN_INFERENCE_TOKEN", "tok")
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["auth"] = req.headers["authorization"]
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, json={"output_urls": ["u1"], "model": "flux1-dev"})
    _mock_httpx(monkeypatch, handler)
    gid = uuid.uuid4()
    out = await real_ai.generate_image(uuid.uuid4(), "billboard", "blue suit", 1, ["story"], generation_id=gid)
    assert out["output_urls"] == ["u1"] and "blue suit" in out["prompt"] and out["generation_ms"] >= 0
    assert seen["auth"] == "Bearer tok" and seen["body"]["generation_id"] == str(gid)
    with pytest.raises(ValueError):
        await real_ai.generate_image(uuid.uuid4(), "billboard", "with Kalonzo", 1, ["story"])


async def test_train_lora_client(monkeypatch, settings, real_ai):
    monkeypatch.setattr(settings, "WAN_INFERENCE_URL", "http://gpu")
    aid = uuid.uuid4()
    _mock_httpx(monkeypatch, lambda req: httpx.Response(200, json={"lora_key": f"mhesh/{aid}/lora"}))
    assert (await real_ai.train_lora(aid, ["u"] * 5))["lora_key"] == f"mhesh/{aid}/lora"


async def test_llm_scoring(monkeypatch, settings):
    monkeypatch.setattr(settings, "LLM_INFERENCE_URL", "http://llm")
    content = json.dumps({"score": 0.82, "flags": {"unclear": False}, "reason": "clear"})
    _mock_httpx(monkeypatch, lambda req: httpx.Response(200, json={"choices": [{"message": {"content": content}}]}))
    out = await ai_mhesh.verify_evidence("canvassing", ["a"] * 4, -1.0, 36.0, -1.0, 36.0)
    assert out["score"] == 0.82 and out["flags"]["manual_review"] is False

    _mock_httpx(monkeypatch, lambda req: httpx.Response(200, json={"choices": [{"message": {"content": "nope"}}]}))
    out = await ai_mhesh.verify_evidence("canvassing", ["a"] * 4, -1.0, 36.0)
    assert out["score"] == 0.5 and out["flags"]["parse_error"] is True

    _mock_httpx(monkeypatch, lambda req: httpx.Response(500))
    out = await ai_mhesh.verify_evidence("canvassing", ["a"] * 4)
    assert out["flags"]["llm_unavailable"] is True and out["flags"]["manual_review"] is True


# ─── GPU worker ────────────────────────────────────────────────────
@pytest.fixture
def gpu(monkeypatch, settings, tmp_path):
    from app.workers import wan22_runner
    monkeypatch.setattr(wan22_runner.settings, "WAN_INFERENCE_TOKEN", "tok")
    monkeypatch.setattr(wan22_runner, "VOLUME", str(tmp_path))
    uploads = []

    def fake_upload(path, key, ctype):
        uploads.append((path, key))
        return f"https://cdn.test/{key}"
    monkeypatch.setattr(wan22_runner, "upload_file", fake_upload)

    def fake_run(cmd, check):
        from PIL import Image
        if "inference.py" in cmd[1]:
            Image.new("RGB", (1024, 1536), (200, 120, 40)).save(cmd[cmd.index("--output") + 1])
    monkeypatch.setattr(wan22_runner.subprocess, "run", fake_run)
    return wan22_runner, uploads, tmp_path


async def test_gpu_rejects_without_token(gpu):
    runner, _, _ = gpu
    async with AsyncClient(transport=ASGITransport(app=runner.app), base_url="http://gpu") as c:
        assert (await c.post("/generate/mhesh_image", json={})).status_code == 401
        assert (await c.post("/train/lora", json={}, headers={"Authorization": "Bearer wrong"})).status_code == 401


async def test_gpu_generate_watermarks(gpu):
    from PIL import Image
    runner, uploads, vol = gpu
    aid = uuid.uuid4()
    async with AsyncClient(transport=ASGITransport(app=runner.app), base_url="http://gpu") as c:
        h = {"Authorization": "Bearer tok"}
        body = {"aspirant_id": str(aid), "style_template": "billboard", "prompt": "p",
                "num_images": 1, "output_formats": ["story", "post"]}
        assert (await c.post("/generate/mhesh_image", json=body, headers=h)).status_code == 400  # no LoRA
        os.makedirs(vol / "mhesh" / str(aid) / "lora")
        r = await c.post("/generate/mhesh_image", json={**body, "generation_id": str(uuid.uuid4())}, headers=h)
    assert r.status_code == 200 and len(r.json()["output_urls"]) == 2
    path, key = uploads[0]
    assert key.startswith(f"mhesh/{aid}/generations/")
    img = Image.open(path)
    assert img.size == (1080, 1920)
    exif = img.getexif()
    assert "AI-generated" in exif[0x010E]
    assert json.loads(exif[0x9286])["ai_generated"] is True
    # Visible tag burned into the bottom-right corner (dark pill on a light image)
    assert sum(img.getpixel((1000, 1880))) < sum(img.getpixel((540, 960)))


async def test_gpu_train_lora(gpu, monkeypatch):
    runner, _, vol = gpu
    aid = uuid.uuid4()
    _mock_httpx(monkeypatch, lambda r: httpx.Response(200, content=b"jpg"))
    async with AsyncClient(transport=ASGITransport(app=runner.app), base_url="http://gpu") as c:
        h = {"Authorization": "Bearer tok"}
        bad = await c.post("/train/lora", headers=h,
                           json={"aspirant_id": str(aid), "image_urls": ["http://x"] * 5, "output_key": "../etc"})
        assert bad.status_code == 400
        r = await c.post("/train/lora", headers=h, json={
            "aspirant_id": str(aid), "image_urls": ["http://x"] * 5, "output_key": f"mhesh/{aid}/lora"})
    assert r.status_code == 200 and r.json()["lora_key"] == f"mhesh/{aid}/lora"
    assert (vol / "mhesh" / str(aid) / "lora").is_dir()
