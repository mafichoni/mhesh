from datetime import UTC, datetime

from sqlalchemy import select

from app.mhesh_models import MheshImageGeneration, MheshTask, MheshTaskStatus
from app.services.compliance_mhesh import in_blackout
from app.workers import mhesh_cron
from tests.conftest import make_aspirant, make_supporter, register


def test_blackout_window_bounds(settings):
    assert in_blackout(datetime(2027, 8, 4, 20, 59, tzinfo=UTC)) is False
    assert in_blackout(datetime(2027, 8, 4, 21, 0, tzinfo=UTC)) is True  # 00:00 EAT
    assert in_blackout(datetime(2027, 8, 10, 20, 0, tzinfo=UTC)) is True
    assert in_blackout(datetime(2027, 8, 10, 21, 0, tzinfo=UTC)) is False  # polling day over


def test_blackout_disabled_or_invalid(settings, monkeypatch):
    monkeypatch.setattr(settings, "MHESH_BLACKOUT_START", "")
    assert in_blackout() is False
    monkeypatch.setattr(settings, "MHESH_BLACKOUT_START", "not-a-date")
    assert in_blackout() is False


async def test_odpc_gate(client, settings, monkeypatch):
    monkeypatch.setattr(settings, "MHESH_ODPC_REGISTERED", False)
    assert (await client.get("/api/mhesh/stats")).status_code == 503
    assert (await client.get("/api/mhesh/aspirants")).status_code == 503
    assert (await client.get("/api/mhesh/health")).status_code == 200
    assert (await client.get("/health")).status_code == 200


async def test_blackout_blocks_publishing(client, settings, monkeypatch):
    h, a = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json={
        "title": "Event staff needed", "description": "Help set up chairs and tents for the rally.",
        "category": "event_staffing", "county": "Nairobi", "reward_kes": 500})).json()
    monkeypatch.setattr(settings, "MHESH_BLACKOUT_START", "2020-01-01T00:00:00+03:00")
    monkeypatch.setattr(settings, "MHESH_BLACKOUT_END", "2099-01-01T00:00:00+03:00")
    blocked = [
        client.patch("/api/mhesh/aspirants/me", headers=h, json={"party": "New"}),
        client.post("/api/mhesh/tasks", headers=h, json={
            "title": "Event staff needed", "description": "Help set up chairs and tents for the rally.",
            "category": "event_staffing", "county": "Nairobi", "reward_kes": 500}),
        client.post(f"/api/mhesh/tasks/{t['id']}/publish", headers=h),
        client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"}),
        client.post("/api/mhesh/studio/generate", headers=h, json={"style_template": "billboard"}),
        client.post("/api/mhesh/aspirants/me", headers=await register(client),
                    json={"display_name": "Late", "office": "mca", "county": "Kisumu"}),
    ]
    for req in blocked:
        assert (await req).status_code == 423
    # Reading stays open
    assert (await client.get(f"/api/mhesh/aspirants/{a['slug']}")).status_code == 200


async def test_cron_blackout_cancels_unpublished_tasks(client, db, settings, monkeypatch):
    h, _ = await make_aspirant(client)
    await client.post("/api/mhesh/tasks", headers=h, json={
        "title": "Event staff needed", "description": "Help set up chairs and tents for the rally.",
        "category": "event_staffing", "county": "Nairobi", "reward_kes": 500})
    assert await mhesh_cron.check_blackout() == 0
    monkeypatch.setattr(settings, "MHESH_BLACKOUT_START", "2020-01-01T00:00:00+03:00")
    monkeypatch.setattr(settings, "MHESH_BLACKOUT_END", "")
    assert await mhesh_cron.check_blackout() == 1
    assert (await db.execute(select(MheshTask))).scalar_one().status == MheshTaskStatus.CANCELLED


async def test_profile_update_rate_limit(client):
    h, _ = await make_aspirant(client)
    for i in range(5):
        assert (await client.patch("/api/mhesh/aspirants/me", headers=h, json={"ward": f"W{i}"})).status_code == 200
    assert (await client.patch("/api/mhesh/aspirants/me", headers=h, json={"ward": "W6"})).status_code == 429


async def test_task_application_rate_limit(client, mpesa_mock):
    from tests.conftest import pay_last_stk
    h, _ = await make_aspirant(client)
    ids = []
    for i in range(11):
        t = (await client.post("/api/mhesh/tasks", headers=h, json={
            "title": f"Poster run {i}", "description": "Put up posters around the ward office.",
            "category": "distribute_posters", "county": "Nairobi", "reward_kes": 100})).json()
        await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
        await pay_last_stk(client, mpesa_mock)
        await client.post(f"/api/mhesh/tasks/{t['id']}/publish", headers=h)
        ids.append(t["id"])
    sh, _ = await make_supporter(client)
    codes = [(await client.post(f"/api/mhesh/tasks/{tid}/apply", headers=sh, json={})).status_code for tid in ids]
    assert codes[:10] == [200] * 10 and codes[10] == 429


async def test_rate_limit_key_format(client):
    from tests.conftest import FAKE_REDIS
    h, _ = await make_aspirant(client)
    await client.patch("/api/mhesh/aspirants/me", headers=h, json={"ward": "X"})
    me = (await client.get("/api/auth/me", headers=h)).json()
    key = f"mhesh:rate:{me['id']}:profile_update"
    assert await FAKE_REDIS.get(key) == "1" and 0 < await FAKE_REDIS.ttl(key) <= 86400


async def test_every_generation_has_audit_record(client, db):
    from tests.test_mhesh_studio import _trained
    h, _ = await _trained(client, None)
    for prompt in ["smiling warmly", "with Ruto", None]:
        await client.post("/api/mhesh/studio/generate", headers=h,
                          json={"style_template": "portrait_casual", "custom_prompt": prompt})
    gens = (await db.execute(select(MheshImageGeneration))).scalars().all()
    assert len(gens) == 3
    assert sum(g.rejected for g in gens) == 1
    for g in gens:
        assert g.model and g.created_at and g.audit_metadata
