import os
import uuid
from collections.abc import AsyncIterator
from typing import Any

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://mhesh:mhesh@localhost:5432/mhesh_test")
os.environ["MHESH_ODPC_REGISTERED"] = "true"
os.environ["MHESH_BLACKOUT_START"] = "2027-08-05T00:00:00+03:00"
os.environ["MPESA_CALLBACK_SECRET"] = ""
os.environ["WHATSAPP_TOKEN"] = ""
os.environ["RESEND_API_KEY"] = ""
os.environ["LLM_INFERENCE_URL"] = ""
os.environ["R2_PUBLIC_BASE_URL"] = "https://cdn.test"
os.environ["R2_ACCOUNT_ID"] = "testaccount"
os.environ["R2_ACCESS_KEY_ID"] = "test"
os.environ["R2_SECRET_ACCESS_KEY"] = "test"

import fakeredis.aioredis  # noqa: E402
import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import models  # noqa: E402, F401
from app.config import get_settings  # noqa: E402
from app.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import ai_mhesh, mpesa, redis_client  # noqa: E402

FAKE_REDIS = fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture(scope="session", autouse=True)
async def _schema() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def _clean(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} CASCADE"))
    await FAKE_REDIS.flushall()
    monkeypatch.setattr(redis_client, "get_redis", lambda: FAKE_REDIS)
    for mod in ("app.services.compliance_mhesh", "app.routers.mhesh_studio"):
        monkeypatch.setattr(f"{mod}.get_redis", lambda: FAKE_REDIS)
    yield


@pytest.fixture
def settings() -> Any:
    return get_settings()


@pytest.fixture
async def db() -> AsyncIterator[Any]:
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


class MpesaMock:
    def __init__(self) -> None:
        self.stk_calls: list[dict] = []
        self.b2c_calls: list[dict] = []
        self.fail_stk = False

    async def stk_push(self, **kw: Any) -> dict:
        if self.fail_stk:
            raise RuntimeError("daraja down")
        self.stk_calls.append(kw)
        return {"CheckoutRequestID": f"ws_CO_{uuid.uuid4().hex[:16]}", "ResponseCode": "0"}

    async def b2c_payout(self, **kw: Any) -> dict:
        self.b2c_calls.append(kw)
        return {"ConversationID": f"AG_{uuid.uuid4().hex[:12]}", "ResponseCode": "0"}


@pytest.fixture(autouse=True)
def mpesa_mock(monkeypatch: pytest.MonkeyPatch) -> MpesaMock:
    m = MpesaMock()
    monkeypatch.setattr(mpesa, "stk_push", m.stk_push)
    monkeypatch.setattr(mpesa, "b2c_payout", m.b2c_payout)
    return m


@pytest.fixture(autouse=True)
def gpu_mock(monkeypatch: pytest.MonkeyPatch) -> dict:
    calls: dict = {"generate": [], "train": []}

    async def fake_generate(**kw: Any) -> dict:
        calls["generate"].append(kw)
        prompt = ai_mhesh.build_prompt(kw["style_template"], kw["custom_prompt"])
        urls = [f"https://cdn.test/gen/{uuid.uuid4()}_{f}.jpg"
                for _ in range(kw["num_images"]) for f in kw["output_formats"]]
        return {"output_urls": urls, "model": "flux1-dev", "generation_ms": 1234, "prompt": prompt}

    async def fake_train(aspirant_id: uuid.UUID, urls: list[str]) -> dict:
        calls["train"].append(urls)
        return {"lora_key": f"mhesh/{aspirant_id}/lora", "trained_at": "2026-10-02T00:00:00"}

    monkeypatch.setattr(ai_mhesh, "generate_image", fake_generate)
    monkeypatch.setattr(ai_mhesh, "train_lora", fake_train)
    return calls


# ─── Helpers ────────────────────────────────────────────────────────
async def register(client: AsyncClient, email: str | None = None, admin: bool = False) -> dict:
    email = email or f"u{uuid.uuid4().hex[:10]}@test.ke"
    r = await client.post("/api/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 200, r.text
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    if admin:
        async with AsyncSessionLocal() as s:
            await s.execute(text("UPDATE users SET is_admin = true WHERE email = :e"), {"e": email})
            await s.commit()
    return headers


async def make_aspirant(client: AsyncClient, name: str = "Jane Wanjiku", **extra: Any) -> tuple[dict, dict]:
    h = await register(client)
    body = {"display_name": name, "official_name": name, "office": "mp", "county": "Nairobi",
            "constituency": "Westlands", "whatsapp_public": "0712345678", **extra}
    r = await client.post("/api/mhesh/aspirants/me", json=body, headers=h)
    assert r.status_code == 200, r.text
    return h, r.json()


async def make_supporter(client: AsyncClient, county: str = "Nairobi") -> tuple[dict, dict]:
    h = await register(client)
    r = await client.post("/api/mhesh/supporters/me", headers=h,
                          json={"display_name": "Otieno", "phone": "0722000111", "county": county})
    assert r.status_code == 200, r.text
    return h, r.json()


def stk_callback(checkout_request_id: str, amount: int, ok: bool = True, receipt: str = "QHX123ABC") -> dict:
    cb: dict = {"MerchantRequestID": "m-1", "CheckoutRequestID": checkout_request_id,
                "ResultCode": 0 if ok else 1032, "ResultDesc": "ok" if ok else "Request cancelled by user"}
    if ok:
        cb["CallbackMetadata"] = {"Item": [
            {"Name": "Amount", "Value": amount},
            {"Name": "MpesaReceiptNumber", "Value": receipt},
            {"Name": "PhoneNumber", "Value": 254712345678},
        ]}
    return {"Body": {"stkCallback": cb}}


async def pay_last_stk(client: AsyncClient, mpesa_mock: MpesaMock, amount: int | None = None, ok: bool = True) -> None:
    """Simulate Safaricom calling back for the most recent STK push."""
    from sqlalchemy import select

    from app.models import Payment
    async with AsyncSessionLocal() as s:
        p = (await s.execute(select(Payment).order_by(Payment.created_at.desc()).limit(1))).scalar_one()
    r = await client.post("/api/payments/mpesa/callback",
                          json=stk_callback(p.checkout_request_id, amount if amount is not None else p.amount_kes, ok))
    assert r.json() == {"ResultCode": 0, "ResultDesc": "Accepted"}


async def verified_aspirant(client: AsyncClient, mpesa_mock: MpesaMock, **kw: Any) -> tuple[dict, dict]:
    h, a = await make_aspirant(client, **kw)
    await client.post("/api/mhesh/aspirants/me/verify-mpesa", json={"phone": "0712345678"}, headers=h)
    await pay_last_stk(client, mpesa_mock)
    return h, (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
