from sqlalchemy import select

from app.mhesh_models import MheshFollower, MheshReport
from tests.conftest import make_aspirant, pay_last_stk, register, verified_aspirant


async def test_create_and_read_own_profile(client):
    h, a = await make_aspirant(client, name="Hon. Jane Wanjiku")
    assert a["slug"] == "hon-jane-wanjiku"
    assert a["verified_mpesa"] is False
    assert a["office"] == "mp"
    r = await client.get("/api/mhesh/aspirants/me", headers=h)
    assert r.status_code == 200 and r.json()["id"] == a["id"]


async def test_one_profile_per_user(client):
    h, _ = await make_aspirant(client)
    r = await client.post("/api/mhesh/aspirants/me", headers=h,
                          json={"display_name": "Again", "office": "mca", "county": "Kisumu"})
    assert r.status_code == 400


async def test_slug_collision_gets_suffix(client):
    _, a1 = await make_aspirant(client, name="John Kamau")
    _, a2 = await make_aspirant(client, name="John Kamau")
    assert a1["slug"] == "john-kamau"
    assert a2["slug"].startswith("john-kamau-") and a2["slug"] != a1["slug"]


async def test_reserved_slug_avoided(client):
    _, a = await make_aspirant(client, name="Me")
    assert a["slug"] != "me"


async def test_requires_auth(client):
    r = await client.get("/api/mhesh/aspirants/me")
    assert r.status_code == 401


async def test_update_profile_manifesto(client):
    h, _ = await make_aspirant(client)
    r = await client.patch("/api/mhesh/aspirants/me", headers=h, json={
        "manifesto": [{"title": "Clean water", "description": "Piped water to every ward within two years."}],
        "achievements": [{"title": "Built school", "description": "Raised funds for a new classroom block.",
                          "year": 2022}],
        "social_links": {"x": "https://x.com/jane"},
    })
    assert r.status_code == 200, r.text
    assert r.json()["manifesto"][0]["title"] == "Clean water"
    assert r.json()["achievements"][0]["year"] == 2022


async def test_update_rejects_defamatory_text_and_logs(client, db):
    h, a = await make_aspirant(client)
    r = await client.patch("/api/mhesh/aspirants/me", headers=h, json={
        "manifesto": [{"title": "Truth", "description": "My opponent is a thief and everyone knows it."}]})
    assert r.status_code == 400
    reports = (await db.execute(select(MheshReport).where(MheshReport.subject_id == a["id"]))).scalars().all()
    assert len(reports) == 1 and reports[0].reporter_contact == "auto-moderation"


async def test_invalid_photo_key_rejected(client):
    h, _ = await make_aspirant(client)
    r = await client.patch("/api/mhesh/aspirants/me", headers=h, json={"photo_r2_key": "mhesh/other/photo/x.jpg"})
    assert r.status_code == 400


async def test_photo_upload_and_url(client):
    h, a = await make_aspirant(client)
    up = (await client.post("/api/mhesh/aspirants/me/photo-upload-url", headers=h)).json()
    assert up["key"].startswith(f"mhesh/{a['id']}/photo/") and "upload_url" in up
    r = await client.patch("/api/mhesh/aspirants/me", headers=h, json={"photo_r2_key": up["key"]})
    assert r.json()["photo_url"] == f"https://cdn.test/{up['key']}"


async def test_mpesa_verification_flow(client, mpesa_mock):
    h, a = await make_aspirant(client)
    r = await client.post("/api/mhesh/aspirants/me/verify-mpesa", headers=h, json={"phone": "0712345678"})
    assert r.status_code == 200 and r.json()["checkout_request_id"]
    assert mpesa_mock.stk_calls[-1]["amount_kes"] == 1
    assert mpesa_mock.stk_calls[-1]["account_reference"].startswith("MHESHV-")
    await pay_last_stk(client, mpesa_mock)
    me = (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
    assert me["verified_mpesa"] is True and me["trust_score"] == 25
    r = await client.post("/api/mhesh/aspirants/me/verify-mpesa", headers=h, json={"phone": "0712345678"})
    assert r.json() == {"already_verified": True}


async def test_public_view_counts_and_listing(client, mpesa_mock):
    _, unverified = await make_aspirant(client, name="Not Verified")
    _, a = await verified_aspirant(client, mpesa_mock, name="Verified Person")
    r = await client.get(f"/api/mhesh/aspirants/{a['slug']}")
    assert r.status_code == 200 and r.json()["view_count"] == 1
    assert "lora_key" not in r.json() and "official_name" not in r.json()
    listing = (await client.get("/api/mhesh/aspirants")).json()
    assert [x["slug"] for x in listing] == [a["slug"]]
    assert (await client.get("/api/mhesh/aspirants", params={"county": "Mombasa"})).json() == []
    assert (await client.get("/api/mhesh/aspirants/nope")).status_code == 404


async def test_public_profile_has_jsonld_fields(client, mpesa_mock):
    """The frontend builds schema.org Person JSON-LD from these public fields."""
    _, a = await verified_aspirant(client, mpesa_mock, party="Example Party")
    data = (await client.get(f"/api/mhesh/aspirants/{a['slug']}")).json()
    jsonld = {"@context": "https://schema.org", "@type": "Person", "name": data["display_name"],
              "jobTitle": data["office"], "affiliation": {"@type": "PoliticalParty", "name": data["party"]},
              "address": {"@type": "PostalAddress", "addressRegion": data["county"], "addressCountry": "KE"}}
    assert jsonld["name"] == "Jane Wanjiku" and jsonld["affiliation"]["name"] == "Example Party"


async def test_follow_verify_unsubscribe(client, db):
    h, a = await make_aspirant(client)
    r = await client.post(f"/api/mhesh/aspirants/{a['slug']}/follow",
                          json={"contact": "Voter@Example.com", "contact_kind": "email"})
    assert r.status_code == 200 and "verify_token" not in r.json()
    again = await client.post(f"/api/mhesh/aspirants/{a['slug']}/follow",
                              json={"contact": "voter@example.com", "contact_kind": "email"})
    assert again.json()["already_following"] is True
    f = (await db.execute(select(MheshFollower))).scalar_one()
    assert (await client.post("/api/mhesh/followers/verify", params={"token": f.verify_token})).status_code == 200
    followers = (await client.get("/api/mhesh/aspirants/me/followers", headers=h)).json()
    assert followers[0]["verified"] is True
    me = (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
    assert me["follower_count"] == 1
    assert (await client.post("/api/mhesh/followers/unsubscribe", params={"token": f.unsub_token})).status_code == 200
    me = (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
    assert me["follower_count"] == 0
    assert (await client.post("/api/mhesh/followers/verify", params={"token": "bad"})).status_code == 404
    assert (await client.post("/api/mhesh/followers/unsubscribe", params={"token": "bad"})).status_code == 404


async def test_follow_validation(client):
    _, a = await make_aspirant(client)
    bad = await client.post(f"/api/mhesh/aspirants/{a['slug']}/follow",
                            json={"contact": "not-an-email", "contact_kind": "email"})
    assert bad.status_code == 422
    ok = await client.post(f"/api/mhesh/aspirants/{a['slug']}/follow",
                           json={"contact": "0712345678", "contact_kind": "phone"})
    assert ok.status_code == 200
    assert (await client.post("/api/mhesh/aspirants/missing/follow",
                              json={"contact": "0712345678", "contact_kind": "phone"})).status_code == 404


async def test_share_link_and_whatsapp_click_tracking(client):
    h, a = await make_aspirant(client)
    share = (await client.post(f"/api/mhesh/aspirants/{a['slug']}/share")).json()
    assert share["url"] == f"https://mhesh.app/s/{a['slug']}"
    assert (await client.get(f"/api/mhesh/s/{a['slug']}")).json() == {"target": f"/p/{a['slug']}"}
    wa = await client.get(f"/api/mhesh/aspirants/{a['slug']}/whatsapp")
    assert wa.status_code == 302 and wa.headers["location"] == "https://wa.me/254712345678"
    me = (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
    assert me["share_count"] == 1 and me["whatsapp_click_count"] == 1


async def test_whatsapp_missing_number(client):
    h = await register(client)
    r = await client.post("/api/mhesh/aspirants/me", headers=h,
                          json={"display_name": "No Phone", "office": "mca", "county": "Kisumu"})
    assert (await client.get(f"/api/mhesh/aspirants/{r.json()['slug']}/whatsapp")).status_code == 404


async def test_reports(client, db):
    r = await client.post("/api/mhesh/reports", json={
        "kind": "profile", "subject_id": "abc", "reason": "This profile impersonates someone."})
    assert r.status_code == 200
    assert (await db.execute(select(MheshReport))).scalar_one().kind == "profile"
    bad = await client.post("/api/mhesh/reports", json={"kind": "profile", "subject_id": "x", "reason": "short"})
    assert bad.status_code == 422


async def test_subscription_tiers(client, mpesa_mock, settings, monkeypatch):
    h, _ = await make_aspirant(client)
    r = await client.post("/api/mhesh/aspirants/me/subscribe", headers=h, json={"tier": "featured", "phone": "0712345678"})
    assert r.status_code == 503  # prices not configured
    monkeypatch.setattr(settings, "MHESH_FEATURED_TIER_KES", 5000)
    r = await client.post("/api/mhesh/aspirants/me/subscribe", headers=h, json={"tier": "featured", "phone": "0712345678"})
    assert r.status_code == 200 and r.json()["amount_kes"] == 5000
    await pay_last_stk(client, mpesa_mock)
    me = (await client.get("/api/mhesh/aspirants/me", headers=h)).json()
    assert me["tier"] == "featured" and me["featured_until"] is not None
