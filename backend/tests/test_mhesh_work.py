from sqlalchemy import select

from app.mhesh_models import MheshEscrow, MheshEscrowStatus
from app.services import ai_mhesh
from tests.conftest import make_aspirant, make_supporter, pay_last_stk

TASK = {"title": "Distribute posters in Kangemi", "category": "distribute_posters",
        "description": "Put up 200 posters along Waiyaki Way and Kangemi market.",
        "county": "Nairobi", "reward_kes": 2000, "location_lat": -1.2655, "location_lng": 36.7480}


async def _published_task(client, mpesa_mock):
    h, a = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json=TASK)).json()
    assert t["escrow_fee_kes"] == 60 and t["status"] == "draft"
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    assert r.json()["amount_kes"] == 2060
    await pay_last_stk(client, mpesa_mock)
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/publish", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "published"
    return h, a, t


async def _assigned_task(client, mpesa_mock):
    h, a, t = await _published_task(client, mpesa_mock)
    sh, s = await make_supporter(client)
    assert (await client.post(f"/api/mhesh/tasks/{t['id']}/apply", headers=sh, json={"message": "Niko tayari"})).json() == {"ok": True}
    apps = (await client.get(f"/api/mhesh/tasks/{t['id']}/applications", headers=h)).json()
    assert apps[0]["supporter_id"] == s["id"] and apps[0]["message"] == "Niko tayari"
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/assign", headers=h, json={"supporter_id": s["id"]})
    assert r.status_code == 200
    return h, sh, s, t


def _llm(score):
    async def fake(category, urls):
        return {"score": score, "flags": {"too_few": False}, "reason": "looks fine"}
    return fake


async def test_list_own_tasks_empty(client):
    h, _ = await make_aspirant(client)
    assert (await client.get("/api/mhesh/tasks", headers=h)).json() == []


async def test_cannot_publish_unfunded(client):
    h, _ = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json=TASK)).json()
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/publish", headers=h)
    assert r.status_code == 400 and "Fund" in r.json()["detail"]
    assert (await client.get(f"/api/mhesh/tasks/{t['id']}/escrow", headers=h)).json() == {"status": None}


async def test_failed_payment_leaves_task_unfunded(client, mpesa_mock):
    h, _ = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json=TASK)).json()
    await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    await pay_last_stk(client, mpesa_mock, ok=False)
    assert (await client.post(f"/api/mhesh/tasks/{t['id']}/publish", headers=h)).status_code == 400


async def test_underpayment_does_not_fund(client, mpesa_mock):
    h, _ = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json=TASK)).json()
    await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    await pay_last_stk(client, mpesa_mock, amount=10)
    esc = (await client.get(f"/api/mhesh/tasks/{t['id']}/escrow", headers=h)).json()
    assert esc["status"] == "pending"


async def test_stk_failure_closes_escrow(client, mpesa_mock, db):
    h, _ = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json=TASK)).json()
    mpesa_mock.fail_stk = True
    import pytest
    with pytest.raises(RuntimeError):
        await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    e = (await db.execute(select(MheshEscrow))).scalar_one()
    assert e.status == MheshEscrowStatus.REFUNDED


async def test_full_lifecycle_approve_triggers_b2c(client, mpesa_mock, monkeypatch):
    monkeypatch.setattr(ai_mhesh, "_llm_score", _llm(0.9))
    h, sh, s, t = await _assigned_task(client, mpesa_mock)
    assert t["id"] in [x["id"] for x in (await client.get("/api/mhesh/supporters/me/assigned", headers=sh)).json()]
    up = (await client.post(f"/api/mhesh/tasks/{t['id']}/evidence-upload-url", headers=sh)).json()
    assert up["key"].startswith(f"mhesh/tasks/{t['id']}/evidence/")
    urls = [f"https://cdn.test/e{i}.jpg" for i in range(5)]
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/submit-evidence", headers=sh,
                          json={"evidence_urls": urls, "lat": -1.266, "lng": 36.749})
    v = r.json()["verification"]
    assert v["score"] == 0.9 and v["flags"]["manual_review"] is False and v["flags"]["distance_km"] < 1

    r = await client.post(f"/api/mhesh/tasks/{t['id']}/approve", headers=h)
    assert r.status_code == 200 and r.json()["payout_kes"] == 1960
    assert mpesa_mock.b2c_calls[-1]["amount_kes"] == 1960 and mpesa_mock.b2c_calls[-1]["phone"] == "0722000111"
    esc = (await client.get(f"/api/mhesh/tasks/{t['id']}/escrow", headers=h)).json()
    assert esc["status"] == "released"

    earnings = (await client.get("/api/mhesh/supporters/me/earnings", headers=sh)).json()
    assert earnings["supporter"]["total_earned_kes"] == 1960 and earnings["supporter"]["tasks_completed"] == 1
    assert earnings["ledger"][0]["payout_kes"] == 1960

    # Double approve cannot pay twice
    assert (await client.post(f"/api/mhesh/tasks/{t['id']}/approve", headers=h)).status_code == 400
    assert len(mpesa_mock.b2c_calls) == 1

    # Ratings, once per party
    assert (await client.post(f"/api/mhesh/tasks/{t['id']}/rate", headers=h, json={"stars": 5})).status_code == 200
    assert (await client.post(f"/api/mhesh/tasks/{t['id']}/rate", headers=h, json={"stars": 5})).status_code == 400
    assert (await client.post(f"/api/mhesh/tasks/{t['id']}/rate", headers=sh, json={"stars": 4})).status_code == 200


async def test_b2c_result_callback_records_receipt(client, mpesa_mock, monkeypatch, db):
    monkeypatch.setattr(ai_mhesh, "_llm_score", _llm(0.9))
    h, sh, s, t = await _assigned_task(client, mpesa_mock)
    await client.post(f"/api/mhesh/tasks/{t['id']}/submit-evidence", headers=sh,
                      json={"evidence_urls": ["https://cdn.test/a.jpg"] * 5, "lat": -1.266, "lng": 36.749})
    await client.post(f"/api/mhesh/tasks/{t['id']}/approve", headers=h)
    e = (await db.execute(select(MheshEscrow))).scalar_one()
    r = await client.post("/api/payments/mpesa/b2c/result", json={"Result": {
        "ResultCode": 0, "ConversationID": e.b2c_receipt, "TransactionID": "QKB2C999"}})
    assert r.status_code == 200
    await db.refresh(e)
    assert e.b2c_receipt == "QKB2C999"


async def test_weak_evidence_flagged_for_manual_review(client, mpesa_mock, monkeypatch):
    monkeypatch.setattr(ai_mhesh, "_llm_score", _llm(0.9))
    h, sh, s, t = await _assigned_task(client, mpesa_mock)
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/submit-evidence", headers=sh,
                          json={"evidence_urls": ["https://cdn.test/a.jpg"], "lat": 0.5, "lng": 35.27})
    v = r.json()["verification"]
    assert v["flags"]["too_few"] is True and v["flags"]["far_from_task"] is True
    assert v["score"] <= 0.4 and v["flags"]["manual_review"] is True


async def test_evidence_without_geotag_or_llm(client, mpesa_mock):
    h, sh, s, t = await _assigned_task(client, mpesa_mock)
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/submit-evidence", headers=sh,
                          json={"evidence_urls": ["https://cdn.test/a.jpg"] * 5})
    v = r.json()["verification"]
    assert v["flags"]["no_geotag"] is True and v["flags"]["llm_unavailable"] is True and v["score"] == 0.5


async def test_dispute_locks_escrow_and_counts_against_supporter(client, mpesa_mock):
    h, sh, s, t = await _assigned_task(client, mpesa_mock)
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/dispute", headers=h,
                          json={"reason": "No posters were found on Waiyaki Way."})
    assert r.status_code == 200
    detail = (await client.get(f"/api/mhesh/tasks/{t['id']}", headers=h)).json()
    assert detail["status"] == "disputed" and "Waiyaki" in detail["verification_flags"]["dispute_reason"]
    assert (await client.get(f"/api/mhesh/tasks/{t['id']}/escrow", headers=h)).json()["status"] == "disputed"
    assert (await client.get("/api/mhesh/supporters/me", headers=sh)).json()["tasks_disputed"] == 1
    assert mpesa_mock.b2c_calls == []


async def test_assign_requires_application(client, mpesa_mock):
    h, _, t = await _published_task(client, mpesa_mock)
    _, s = await make_supporter(client)
    r = await client.post(f"/api/mhesh/tasks/{t['id']}/assign", headers=h, json={"supporter_id": s["id"]})
    assert r.status_code == 400


async def test_supporter_task_feed_and_visibility(client, mpesa_mock):
    h, _, t = await _published_task(client, mpesa_mock)
    sh, _ = await make_supporter(client)
    other, _ = await make_supporter(client, county="Mombasa")
    assert [x["id"] for x in (await client.get("/api/mhesh/supporters/me/tasks", headers=sh)).json()] == [t["id"]]
    assert (await client.get("/api/mhesh/supporters/me/tasks", headers=other)).json() == []
    assert (await client.get(f"/api/mhesh/tasks/{t['id']}", headers=other)).status_code == 200
    draft = (await client.post("/api/mhesh/tasks", headers=h, json=TASK)).json()
    assert (await client.get(f"/api/mhesh/tasks/{draft['id']}", headers=other)).status_code == 404


async def test_apply_idempotent_and_supporter_profile_rules(client, mpesa_mock):
    _, _, t = await _published_task(client, mpesa_mock)
    sh, _ = await make_supporter(client)
    await client.post(f"/api/mhesh/tasks/{t['id']}/apply", headers=sh, json={})
    again = await client.post(f"/api/mhesh/tasks/{t['id']}/apply", headers=sh, json={})
    assert again.json()["already_applied"] is True
    dup = await client.post("/api/mhesh/supporters/me", headers=sh,
                            json={"display_name": "Again", "phone": "0722000111"})
    assert dup.status_code == 400


async def test_supporter_verification(client, mpesa_mock):
    sh, _ = await make_supporter(client)
    await client.post("/api/mhesh/supporters/me/verify-mpesa", headers=sh, json={"phone": "0722000111"})
    await pay_last_stk(client, mpesa_mock)
    me = (await client.get("/api/mhesh/supporters/me", headers=sh)).json()
    assert me["verified_mpesa"] is True and me["trust_score"] == 30
