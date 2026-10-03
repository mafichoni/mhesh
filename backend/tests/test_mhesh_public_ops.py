from app.services import ai_mhesh
from tests.conftest import make_aspirant, make_supporter, pay_last_stk, register, verified_aspirant


async def test_county_and_office_listings(client, mpesa_mock):
    _, a = await verified_aspirant(client, mpesa_mock)
    await make_aspirant(client, name="Unverified")
    county = (await client.get("/api/mhesh/county/nairobi")).json()
    assert [x["slug"] for x in county] == [a["slug"]]
    office = (await client.get("/api/mhesh/office/mp")).json()
    assert office[0]["county"] == "Nairobi"
    assert (await client.get("/api/mhesh/office/king")).status_code == 404
    assert (await client.get("/api/mhesh/stats")).json() == {"aspirants": 1, "partners": 0}


async def test_ops_report_queue(client):
    await client.post("/api/mhesh/reports", json={"kind": "image", "subject_id": "g1",
                                                  "reason": "This image shows a different person."})
    admin = await register(client, admin=True)
    queue = (await client.get("/api/mhesh/ops/reports", headers=admin)).json()
    assert queue[0]["kind"] == "image"
    assert (await client.post(f"/api/mhesh/ops/reports/{queue[0]['id']}/resolve", headers=admin)).status_code == 200
    assert (await client.get("/api/mhesh/ops/reports", headers=admin)).json() == []


async def test_ops_releases_disputed_task_to_supporter(client, mpesa_mock, monkeypatch):
    async def llm(category, urls):
        return {"score": 0.9, "flags": {}, "reason": ""}
    monkeypatch.setattr(ai_mhesh, "_llm_score", llm)
    h, _ = await make_aspirant(client)
    t = (await client.post("/api/mhesh/tasks", headers=h, json={
        "title": "Canvass Kibera", "description": "Door to door canvassing in Kibera Laini Saba.",
        "category": "canvassing", "county": "Nairobi", "reward_kes": 1000})).json()
    await client.post(f"/api/mhesh/tasks/{t['id']}/fund", headers=h, json={"phone": "0712345678"})
    await pay_last_stk(client, mpesa_mock)
    await client.post(f"/api/mhesh/tasks/{t['id']}/publish", headers=h)
    sh, s = await make_supporter(client)
    await client.post(f"/api/mhesh/tasks/{t['id']}/apply", headers=sh, json={})
    await client.post(f"/api/mhesh/tasks/{t['id']}/assign", headers=h, json={"supporter_id": s["id"]})
    await client.post(f"/api/mhesh/tasks/{t['id']}/submit-evidence", headers=sh,
                      json={"evidence_urls": ["https://cdn.test/a.jpg"] * 4})
    await client.post(f"/api/mhesh/tasks/{t['id']}/dispute", headers=h, json={"reason": "I disagree with the evidence."})

    admin = await register(client, admin=True)
    escrow = (await client.get("/api/mhesh/ops/escrow/attention", headers=admin)).json()[0]
    r = await client.post(f"/api/mhesh/ops/escrow/{escrow['id']}/resolve", headers=admin, json={"action": "release"})
    assert r.json() == {"ok": True, "payout_kes": 980}
    assert (await client.get(f"/api/mhesh/tasks/{t['id']}", headers=h)).json()["status"] == "approved"
    again = await client.post(f"/api/mhesh/ops/escrow/{escrow['id']}/resolve", headers=admin, json={"action": "release"})
    assert again.status_code == 400


async def test_admin_email_configuration(client):
    r = await client.post("/api/auth/register", json={
        "email": "wainaina.mungai@gmail.com",
        "password": "strongpassword123",
        "full_name": "Wainaina Mungai",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = (await client.get("/api/auth/me", headers=headers)).json()
    assert me["is_admin"] is True
    assert me["email"] == "wainaina.mungai@gmail.com"

    ops_r = await client.get("/api/mhesh/ops/reports", headers=headers)
    assert ops_r.status_code == 200

