"""All four Mhesh AccountReference prefixes: success, failure, idempotency, C2B short refs."""
from sqlalchemy import select

from app.mhesh_models import MheshAspirant, MheshEscrow, MheshEscrowStatus, MheshPartner
from app.models import Payment, PaymentStatus
from tests.conftest import make_aspirant, make_supporter, register, stk_callback

OK = {"ResultCode": 0, "ResultDesc": "Accepted"}


async def _last_payment(db) -> Payment:
    db.expire_all()
    return (await db.execute(select(Payment).order_by(Payment.created_at.desc()).limit(1))).scalar_one()


async def test_mheshv_success_and_idempotent(client, db):
    h, a = await make_aspirant(client)
    await client.post("/api/mhesh/aspirants/me/verify-mpesa", headers=h, json={"phone": "0712345678"})
    p = await _last_payment(db)
    assert p.account_reference == f"MHESHV-{a['id']}"
    body = stk_callback(p.checkout_request_id, 1)
    assert (await client.post("/api/payments/mpesa/callback", json=body)).json() == OK
    assert (await client.post("/api/payments/mpesa/callback", json=body)).json() == OK
    me = (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
    assert me["verified_mpesa"] is True and me["trust_score"] == 25  # not doubled
    assert (await _last_payment(db)).status == PaymentStatus.SUCCESS


async def test_mheshv_failure(client, db):
    h, _ = await make_aspirant(client)
    await client.post("/api/mhesh/aspirants/me/verify-mpesa", headers=h, json={"phone": "0712345678"})
    p = await _last_payment(db)
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 1, ok=False))
    assert (await client.get("/api/mhesh/aspirants/me", headers=h)).json()["verified_mpesa"] is False
    p = await _last_payment(db)
    assert p.status == PaymentStatus.FAILED and "cancelled" in p.result_desc


async def test_mheshv_c2b_name_match(client, db):
    _, a = await make_aspirant(client, name="Jane Wanjiku Kamau")
    short = a["id"][:8]
    mismatch = {"TransID": "QX1", "TransAmount": "1", "BillRefNumber": f"MHESHV-{short}",
                "FirstName": "PETER", "MiddleName": "", "LastName": "OTIENO"}
    await client.post("/api/payments/mpesa/callback", json=mismatch)
    row = (await db.execute(select(MheshAspirant))).scalar_one()
    assert row.verified_mpesa is False
    match = {**mismatch, "TransID": "QX2", "FirstName": "JANE", "MiddleName": "WANJIKU", "LastName": "KAMAU"}
    await client.post("/api/payments/mpesa/callback", json=match)
    db.expire_all()
    assert (await db.execute(select(MheshAspirant))).scalar_one().verified_mpesa is True


async def test_mheshv_supporter_and_partner(client, db):
    sh, s = await make_supporter(client)
    await client.post("/api/mhesh/supporters/me/verify-mpesa", headers=sh, json={"phone": "0722000111"})
    p = await _last_payment(db)
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 1))
    assert (await client.get("/api/mhesh/supporters/me", headers=sh)).json()["verified_mpesa"] is True

    ph = await register(client)
    await client.post("/api/mhesh/partners/apply", headers=ph, json={
        "business_name": "Print Hub", "owner_name": "Ann", "phone": "0733000222", "county": "Nairobi",
        "capabilities": ["posters"], "pricing": {"posters": 20}})
    p = await _last_payment(db)
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 1))
    assert (await db.execute(select(MheshPartner))).scalar_one().verified is True


async def test_mheshw_success_failure_idempotent(client, db):
    h, _ = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json={
        "title": "Canvass Kibera", "description": "Door to door canvassing in Kibera Laini Saba.",
        "category": "canvassing", "county": "Nairobi", "reward_kes": 1000})).json()
    await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    p1 = await _last_payment(db)
    assert p1.account_reference.startswith("MHESHW-")
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p1.checkout_request_id, 1030, ok=False))
    assert (await client.get(f"/api/mhesh/tasks/{t['id']}/escrow", headers=h)).json()["status"] == "pending"

    await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    p2 = await _last_payment(db)
    body = stk_callback(p2.checkout_request_id, 1030, receipt="QFUND1")
    await client.post("/api/payments/mpesa/callback", json=body)
    await client.post("/api/payments/mpesa/callback", json=body)
    funded = (await db.execute(select(MheshEscrow).where(MheshEscrow.status == MheshEscrowStatus.FUNDED))).scalars().all()
    assert len(funded) == 1 and funded[0].mpesa_receipt == "QFUND1"
    assert (await client.get(f"/api/mhesh/tasks/{t['id']}", headers=h)).json()["status"] == "funded"
    again = await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    assert again.status_code == 400


async def test_mhesh_subscription_prefix(client, db, settings, monkeypatch):
    monkeypatch.setattr(settings, "MHESH_VERIFIED_TIER_KES", 1000)
    h, a = await make_aspirant(client)
    await client.post("/api/mhesh/aspirants/me/subscribe", headers=h, json={"tier": "verified", "phone": "0712345678"})
    p = await _last_payment(db)
    assert p.account_reference == f"MHESH-{a['id']}-verified"
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 500))  # underpaid
    assert (await client.get("/api/mhesh/aspirants/me", headers=h)).json()["tier"] == "free"

    await client.post("/api/mhesh/aspirants/me/subscribe", headers=h, json={"tier": "verified", "phone": "0712345678"})
    p = await _last_payment(db)
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 1000))
    assert (await client.get("/api/mhesh/aspirants/me", headers=h)).json()["tier"] == "verified"


async def test_mheshp_failure_keeps_order_pending(client, db, mpesa_mock):
    from tests.test_mhesh_partners import _active_partner
    ph, partner = await _active_partner(client, mpesa_mock)
    ah, _ = await make_aspirant(client)
    order = (await client.post("/api/mhesh/partners/orders", headers=ah, json={
        "partner_id": partner["id"], "design_url": "x", "quantity": 10, "category": "posters",
        "unit_price_kes": 20})).json()
    await client.post(f"/api/mhesh/partners/orders/{order['id']}/fund", headers=ah, json={"phone": "0712345678"})
    p = await _last_payment(db)
    assert p.account_reference.startswith("MHESHP-")
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 200, ok=False))
    assert (await client.get(f"/api/mhesh/partners/orders/{order['id']}", headers=ah)).json()["status"] == "pending"
    await client.post("/api/payments/mpesa/callback", json=stk_callback(p.checkout_request_id, 200))  # late dup ignored
    assert (await client.get(f"/api/mhesh/partners/orders/{order['id']}", headers=ah)).json()["status"] == "pending"


async def test_unknown_checkout_and_unknown_prefix(client):
    assert (await client.post("/api/payments/mpesa/callback", json=stk_callback("nope", 1))).json() == OK
    assert (await client.post("/api/payments/mpesa/callback",
                              json={"TransID": "X", "BillRefNumber": "OTHER-123", "TransAmount": "5"})).json() == OK


async def test_callback_secret_enforced(client, settings, monkeypatch):
    monkeypatch.setattr(settings, "MPESA_CALLBACK_SECRET", "s3cret")
    assert (await client.post("/api/payments/mpesa/callback", json={})).status_code == 403
    assert (await client.post("/api/payments/mpesa/callback?secret=s3cret", json={})).status_code == 200


async def test_b2c_failure_locks_escrow(client, db):
    h, a = await make_aspirant(client)
    e = MheshEscrow(kind="task", ref_id=a["id"], aspirant_id=a["id"], amount_kes=100,
                    status=MheshEscrowStatus.RELEASED, b2c_receipt="AG_1")
    db.add(e)
    await db.commit()
    await client.post("/api/payments/mpesa/b2c/result", json={"Result": {"ResultCode": 2001, "ConversationID": "AG_1"}})
    await db.refresh(e)
    assert e.status == MheshEscrowStatus.DISPUTED
    assert (await client.post("/api/payments/mpesa/b2c/timeout", json={"x": 1})).status_code == 200
    assert (await client.post("/api/payments/mpesa/b2c/result", json={"Result": {}})).status_code == 200
