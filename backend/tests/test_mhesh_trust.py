from sqlalchemy import select

from app.mhesh_models import MheshPartner, MheshSupporter
from app.workers import mhesh_cron
from app.workers.mhesh_cron import partner_trust_score, supporter_trust_score
from tests.conftest import make_aspirant, make_supporter, register


def test_supporter_score_deterministic():
    assert supporter_trust_score(False, 0, 0) == 0
    assert supporter_trust_score(True, 0, 0) == 30
    assert supporter_trust_score(True, 5, 0) == 45
    assert supporter_trust_score(True, 100, 0) == 60  # completion capped at 30
    assert supporter_trust_score(True, 10, 2) == 50
    assert supporter_trust_score(False, 0, 10) == 0  # floor
    assert all(supporter_trust_score(True, 7, 1) == supporter_trust_score(True, 7, 1) for _ in range(5))


def test_partner_score_deterministic():
    assert partner_trust_score(False, 0, 0, 0.0) == 0
    assert partner_trust_score(True, 10, 0, 5.0) == 70
    assert partner_trust_score(True, 100, 0, 5.0) == 80
    assert partner_trust_score(True, 0, 10, 0.0) == 10
    assert partner_trust_score(True, 0, 0, 9.0) == 50  # rating clamped to 5


async def test_cron_recompute_and_expire(client, db):
    from datetime import datetime, timedelta
    sh, _ = await make_supporter(client)
    ph = await register(client)
    await client.post("/api/mhesh/partners/apply", headers=ph, json={
        "business_name": "Print Hub", "owner_name": "Ann", "phone": "0733000222", "county": "Nairobi",
        "capabilities": ["posters"], "pricing": {"posters": 20}})
    _, a = await make_aspirant(client)
    s = (await db.execute(select(MheshSupporter))).scalar_one()
    s.verified_mpesa, s.tasks_completed = True, 4
    p = (await db.execute(select(MheshPartner))).scalar_one()
    p.verified, p.orders_completed, p.rating, p.featured_until = True, 3, 4.5, datetime.utcnow() - timedelta(days=1)
    await db.commit()

    await mhesh_cron._run_all()
    db.expire_all()
    s = (await db.execute(select(MheshSupporter))).scalar_one()
    p = (await db.execute(select(MheshPartner))).scalar_one()
    assert s.trust_score == 42 and s.trust_computed_at is not None
    assert p.trust_score == 30 + 6 + 18 and p.featured_until is None
