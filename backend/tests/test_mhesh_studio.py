from sqlalchemy import select

from app.mhesh_models import MheshImageGeneration
from app.services.ai_mhesh import build_prompt, moderate_prompt, moderate_text
from tests.conftest import make_aspirant


async def _trained(client, gpu_mock):
    h, a = await make_aspirant(client)
    keys = []
    for _ in range(5):
        up = (await client.post("/api/mhesh/studio/upload-reference-url", headers=h)).json()
        keys.append(up["key"])
    r = await client.post("/api/mhesh/studio/train-lora", headers=h, json={"reference_keys": keys})
    assert r.status_code == 202, r.text
    assert (await client.get("/api/mhesh/studio/lora-status", headers=h)).json()["status"] == "trained"
    return h, a


def test_moderation_approves_clean_prompts():
    assert moderate_prompt("wearing a green shirt, smiling") == {"approved": True, "reason": None}
    assert moderate_text("Clean water for every ward")["approved"] is True


def test_moderation_rejects():
    cases = [
        "standing with Raila at a rally",
        "shaking hands with Governor Sakaja",
        "next to President Mwangi",
        "beside my opponent",
        "pointing at @rivalhandle",
        "holding a sign saying thief",
        "mwizi wa kura",
        "holding a gun",
        "na bunduki",
        "ab",
    ]
    for c in cases:
        assert moderate_prompt(c)["approved"] is False, c


def test_word_boundaries_avoid_false_positives():
    assert moderate_prompt("brutalist architecture background")["approved"] is True
    assert moderate_prompt("burning bright sunset over the skyline")["approved"] is True


def test_build_prompt_unknown_style():
    import pytest
    with pytest.raises(ValueError):
        build_prompt("nope", None)


async def test_train_requires_own_keys(client, gpu_mock):
    h, _ = await make_aspirant(client)
    r = await client.post("/api/mhesh/studio/train-lora", headers=h,
                          json={"reference_keys": [f"mhesh/other/refs/{i}.jpg" for i in range(5)]})
    assert r.status_code == 400
    r = await client.post("/api/mhesh/studio/train-lora", headers=h, json={"reference_keys": ["a"] * 4})
    assert r.status_code == 422


async def test_lora_training_uses_signed_urls(client, gpu_mock):
    await _trained(client, gpu_mock)
    assert all("X-Amz-Signature" in u for u in gpu_mock["train"][0])


async def test_generate_requires_lora(client):
    h, _ = await make_aspirant(client)
    r = await client.post("/api/mhesh/studio/generate", headers=h, json={"style_template": "rally_podium"})
    assert r.status_code == 400


async def test_generate_writes_audit_record(client, gpu_mock, db):
    h, a = await _trained(client, gpu_mock)
    r = await client.post("/api/mhesh/studio/generate", headers=h, json={
        "style_template": "market_visit", "custom_prompt": "wearing a blue suit", "num_images": 2,
        "output_formats": ["story", "post"]})
    assert r.status_code == 200, r.text
    out = r.json()
    assert len(out["output_urls"]) == 4 and out["cost_kes"] == 400 and out["generation_ms"] == 1234
    gen = (await db.execute(select(MheshImageGeneration))).scalar_one()
    assert str(gen.id) == out["generation_id"]
    assert gen.model == "flux1-dev" and gen.prompt == "wearing a blue suit"
    assert gen.audit_metadata["ai_generated"] is True
    assert "anonymous" in gen.audit_metadata["full_prompt"]
    assert gen.audit_metadata["generated_at"]
    assert gpu_mock["generate"][0]["generation_id"] == gen.id
    history = (await client.get("/api/mhesh/studio/generations", headers=h)).json()
    assert history[0]["id"] == out["generation_id"]
    usage = (await client.get("/api/mhesh/studio/usage", headers=h)).json()
    assert usage == {"used_today": 2, "daily_limit": 20}


async def test_rejected_prompt_logged_and_not_counted(client, gpu_mock, db):
    h, _ = await _trained(client, gpu_mock)
    r = await client.post("/api/mhesh/studio/generate", headers=h, json={
        "style_template": "rally_podium", "custom_prompt": "with Uhuru on stage"})
    assert r.status_code == 400 and "public figure" in r.json()["detail"]
    gen = (await db.execute(select(MheshImageGeneration))).scalar_one()
    assert gen.rejected is True and "uhuru" in gen.rejection_reason
    assert gpu_mock["generate"] == []
    assert (await client.get("/api/mhesh/studio/usage", headers=h)).json()["used_today"] == 0


async def test_generation_failure_refunds_quota(client, gpu_mock, monkeypatch):
    from app.services import ai_mhesh
    h, _ = await _trained(client, gpu_mock)

    async def boom(**kw):
        raise RuntimeError("gpu down")
    monkeypatch.setattr(ai_mhesh, "generate_image", boom)
    r = await client.post("/api/mhesh/studio/generate", headers=h, json={"style_template": "billboard"})
    assert r.status_code == 502
    assert (await client.get("/api/mhesh/studio/usage", headers=h)).json()["used_today"] == 0


async def test_daily_generation_limit(client, gpu_mock):
    h, _ = await _trained(client, gpu_mock)
    for _ in range(5):
        r = await client.post("/api/mhesh/studio/generate", headers=h,
                              json={"style_template": "portrait_formal", "num_images": 4})
        assert r.status_code == 200
    r = await client.post("/api/mhesh/studio/generate", headers=h, json={"style_template": "portrait_formal"})
    assert r.status_code == 429


async def test_training_in_progress_and_failure_status(client, monkeypatch):
    from app.services import ai_mhesh
    from tests.conftest import FAKE_REDIS
    h, a = await make_aspirant(client)
    await FAKE_REDIS.set(f"mhesh:lora:{a['id']}:status", "training")
    keys = [(await client.post("/api/mhesh/studio/upload-reference-url", headers=h)).json()["key"] for _ in range(5)]
    assert (await client.post("/api/mhesh/studio/train-lora", headers=h,
                              json={"reference_keys": keys})).status_code == 409
    assert (await client.get("/api/mhesh/studio/lora-status", headers=h)).json()["status"] == "training"
    await FAKE_REDIS.delete(f"mhesh:lora:{a['id']}:status")

    async def fail(aspirant_id, urls):
        raise RuntimeError("oom")
    monkeypatch.setattr(ai_mhesh, "train_lora", fail)
    await client.post("/api/mhesh/studio/train-lora", headers=h, json={"reference_keys": keys})
    st = (await client.get("/api/mhesh/studio/lora-status", headers=h)).json()
    assert st["status"] == "failed" and "oom" in st["error"]
