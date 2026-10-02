"""WhatsApp Cloud API helpers."""
import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()
GRAPH = "https://graph.facebook.com/v20.0"


async def _post(payload: dict) -> dict:
    s = get_settings()
    if not s.WHATSAPP_TOKEN:
        log.info("whatsapp_disabled", to=payload.get("to"))
        return {"disabled": True}
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{GRAPH}/{s.WHATSAPP_PHONE_NUMBER_ID}/messages",
            headers={"Authorization": f"Bearer {s.WHATSAPP_TOKEN}"},
            json={"messaging_product": "whatsapp", **payload},
        )
        r.raise_for_status()
        return r.json()


async def send_text(to: str, body: str) -> dict:
    return await _post({"to": to, "type": "text", "text": {"body": body}})


async def send_buttons(to: str, body: str, buttons: list[dict]) -> dict:
    return await _post({
        "to": to, "type": "interactive",
        "interactive": {"type": "button", "body": {"text": body},
                        "action": {"buttons": [{"type": "reply", "reply": b} for b in buttons]}},
    })


async def send_template(to: str, name: str, lang: str = "en", components: list | None = None) -> dict:
    return await _post({
        "to": to, "type": "template",
        "template": {"name": name, "language": {"code": lang}, "components": components or []},
    })
