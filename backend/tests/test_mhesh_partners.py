from tests.conftest import make_aspirant, pay_last_stk, register

APPLY = {"business_name": "Kangemi Prints", "owner_name": "Mary Akinyi", "phone": "0733000222",
         "county": "Nairobi", "capabilities": ["posters", "tshirts"], "pricing": {"posters": 20, "tshirts": 450},
         "capacity_per_day": 2000, "turnaround_days": 2}


async def _active_partner(client, mpesa_mock):
    ph = await register(client)
    r = await client.post("/api/mhesh/partners/apply", headers=ph, json=APPLY)
    assert r.status_code == 200 and r.json()["status"] == "pending"
    p = r.json()
    assert mpesa_mock.stk_calls[-1]["account_reference"].startswith("MHESHV-")
    await pay_last_stk(client, mpesa_mock)
    me = (await client.get("/api/mhesh/partners/me/profile", headers=ph)).json()
    assert me["verified"] is True and me["status"] == "pending"
    admin = await register(client, admin=True)
    r = await client.post(f"/api/mhesh/ops/partners/{p['id']}/status", headers=admin, params={"status": "active"})
    assert r.status_code == 200 and r.json()["status"] == "active"
    return ph, p


async def test_application_verification_and_directory(client, mpesa_mock):
    assert (await client.get("/api/mhesh/partners")).json() == []
    ph, p = await _active_partner(client, mpesa_mock)
    listing = (await client.get("/api/mhesh/partners", params={"capability": "posters"})).json()
    assert [x["slug"] for x in listing] == ["kangemi-prints"]
    assert (await client.get("/api/mhesh/partners", params={"capability": "umbrellas"})).json() == []
    assert (await client.get("/api/mhesh/partners/kangemi-prints")).json()["business_name"] == "Kangemi Prints"
    assert (await client.get("/api/mhesh/stats")).json() == {"aspirants": 0, "partners": 1}


async def test_ops_cannot_activate_unverified(client):
    ph = await register(client)
    p = (await client.post("/api/mhesh/partners/apply", headers=ph, json=APPLY)).json()
    admin = await register(client, admin=True)
    pending = (await client.get("/api/mhesh/ops/partners/pending", headers=admin)).json()
    assert pending[0]["id"] == p["id"]
    r = await client.post(f"/api/mhesh/ops/partners/{p['id']}/status", headers=admin, params={"status": "active"})
    assert r.status_code == 400
    non_admin = await client.get("/api/mhesh/ops/partners/pending", headers=ph)
    assert non_admin.status_code == 403


async def test_auto_activate_setting(client, mpesa_mock, settings, monkeypatch):
    monkeypatch.setattr(settings, "MHESH_PARTNER_AUTO_ACTIVATE", True)
    ph = await register(client)
    await client.post("/api/mhesh/partners/apply", headers=ph, json=APPLY)
    await pay_last_stk(client, mpesa_mock)
    assert (await client.get("/api/mhesh/partners/me/profile", headers=ph)).json()["status"] == "active"


async def test_order_lifecycle_releases_minus_referral(client, mpesa_mock):
    ph, p = await _active_partner(client, mpesa_mock)
    ah, _ = await make_aspirant(client)
    r = await client.post("/api/mhesh/partners/orders", headers=ah, json={
        "partner_id": p["id"], "design_url": "https://cdn.test/d.jpg", "quantity": 500,
        "category": "posters", "unit_price_kes": 20})
    order = r.json()
    assert order["total_kes"] == 10000 and order["referral_fee_kes"] == 1200
    r = await client.post(f"/api/mhesh/partners/orders/{order['id']}/fund", headers=ah, json={"phone": "0712345678"})
    assert r.status_code == 200
    assert mpesa_mock.stk_calls[-1]["account_reference"].startswith("MHESHP-")
    await pay_last_stk(client, mpesa_mock)
    o = (await client.get(f"/api/mhesh/partners/orders/{order['id']}", headers=ph)).json()
    assert o["status"] == "funded"

    # Partner fulfils
    assert (await client.post(f"/api/mhesh/partners/orders/{order['id']}/accept", headers=ph)).status_code == 200
    assert (await client.post(f"/api/mhesh/partners/orders/{order['id']}/ship", headers=ph)).status_code == 200
    up = (await client.post(f"/api/mhesh/partners/orders/{order['id']}/delivery-upload-url", headers=ph)).json()
    r = await client.post(f"/api/mhesh/partners/orders/{order['id']}/deliver", headers=ph,
                          json={"evidence_urls": [up["public_url"]]})
    assert r.status_code == 200
    assert (await client.get("/api/mhesh/partners/me/orders", headers=ph)).json()[0]["status"] == "delivered"

    r = await client.post(f"/api/mhesh/partners/orders/{order['id']}/approve", headers=ah)
    assert r.json() == {"ok": True, "payout_kes": 8800, "referral_fee_kes": 1200}
    assert mpesa_mock.b2c_calls[-1]["amount_kes"] == 8800 and mpesa_mock.b2c_calls[-1]["phone"] == "0733000222"
    me = (await client.get("/api/mhesh/partners/me/profile", headers=ph)).json()
    assert me["orders_completed"] == 1

    r = await client.post(f"/api/mhesh/partners/orders/{order['id']}/rate", headers=ah, json={"stars": 4})
    assert r.json()["partner_rating"] == 4.0
    assert (await client.post(f"/api/mhesh/partners/orders/{order['id']}/rate", headers=ah,
                              json={"stars": 4})).status_code == 400
    assert len((await client.get("/api/mhesh/partners/orders/mine", headers=ah)).json()) == 1


async def test_order_rules(client, mpesa_mock):
    ph, p = await _active_partner(client, mpesa_mock)
    ah, _ = await make_aspirant(client)
    bad = await client.post("/api/mhesh/partners/orders", headers=ah, json={
        "partner_id": p["id"], "design_url": "x", "quantity": 1, "category": "umbrellas", "unit_price_kes": 100})
    assert bad.status_code == 400
    order = (await client.post("/api/mhesh/partners/orders", headers=ah, json={
        "partner_id": p["id"], "design_url": "x", "quantity": 10, "category": "tshirts", "unit_price_kes": 450})).json()
    assert (await client.post(f"/api/mhesh/partners/orders/{order['id']}/deliver", headers=ph,
                              json={"evidence_urls": ["x"]})).status_code == 400
    assert (await client.post(f"/api/mhesh/partners/orders/{order['id']}/approve", headers=ah)).status_code == 400
    stranger = await register(client)
    assert (await client.get(f"/api/mhesh/partners/orders/{order['id']}", headers=stranger)).status_code == 404


async def test_order_dispute_and_ops_resolution(client, mpesa_mock):
    ph, p = await _active_partner(client, mpesa_mock)
    ah, _ = await make_aspirant(client)
    order = (await client.post("/api/mhesh/partners/orders", headers=ah, json={
        "partner_id": p["id"], "design_url": "x", "quantity": 100, "category": "posters", "unit_price_kes": 20})).json()
    await client.post(f"/api/mhesh/partners/orders/{order['id']}/fund", headers=ah, json={"phone": "0712345678"})
    await pay_last_stk(client, mpesa_mock)
    r = await client.post(f"/api/mhesh/partners/orders/{order['id']}/dispute", headers=ah,
                          json={"reason": "Posters were printed in the wrong colours."})
    assert r.status_code == 200
    admin = await register(client, admin=True)
    attention = (await client.get("/api/mhesh/ops/escrow/attention", headers=admin)).json()
    assert len(attention) == 1 and attention[0]["status"] == "disputed"
    r = await client.post(f"/api/mhesh/ops/escrow/{attention[0]['id']}/resolve", headers=admin,
                          json={"action": "refund"})
    assert r.json() == {"ok": True, "refunded_kes": 2000}
    assert mpesa_mock.b2c_calls[-1]["phone"] == "254712345678"


async def test_partner_profile_update_and_samples(client, mpesa_mock):
    ph, _ = await _active_partner(client, mpesa_mock)
    up = (await client.post("/api/mhesh/partners/me/sample-upload-url", headers=ph)).json()
    r = await client.patch("/api/mhesh/partners/me/profile", headers=ph,
                           json={"turnaround_days": 1, "sample_urls": [up["public_url"]]})
    assert r.json()["turnaround_days"] == 1 and r.json()["sample_urls"] == [up["public_url"]]
    dup = await client.post("/api/mhesh/partners/apply", headers=ph, json=APPLY)
    assert dup.status_code == 400


async def test_suspended_partner_hidden(client, mpesa_mock):
    _, p = await _active_partner(client, mpesa_mock)
    admin = await register(client, admin=True)
    await client.post(f"/api/mhesh/ops/partners/{p['id']}/status", headers=admin, params={"status": "suspended"})
    assert (await client.get(f"/api/mhesh/partners/{p['slug']}")).status_code == 404
    assert (await client.get("/api/mhesh/partners")).json() == []
