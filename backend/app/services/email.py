"""Transactional email via Resend."""
import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()


async def send_email(to: str, subject: str, html: str) -> dict:
    s = get_settings()
    if not s.RESEND_API_KEY:
        log.info("email_disabled", to=to, subject=subject)
        return {"disabled": True}
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {s.RESEND_API_KEY}"},
            json={"from": s.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
        )
        r.raise_for_status()
        return r.json()
