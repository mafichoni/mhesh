"""M-Pesa Daraja: STK Push (collections) and B2C (payouts)."""
import base64
from datetime import datetime

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()

# Daraja limits AccountReference to 12 characters and TransactionDesc to 13.
ACCOUNT_REF_MAX = 12
TRANSACTION_DESC_MAX = 13


def _base_url() -> str:
    return "https://api.safaricom.co.ke" if get_settings().MPESA_ENV == "production" \
        else "https://sandbox.safaricom.co.ke"


def normalize_phone(phone: str) -> str:
    p = "".join(ch for ch in phone if ch.isdigit())
    if p.startswith("0"):
        p = "254" + p[1:]
    elif p.startswith("7") or p.startswith("1"):
        p = "254" + p
    return p


async def _token(client: httpx.AsyncClient) -> str:
    s = get_settings()
    r = await client.get(
        f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
        auth=(s.MPESA_CONSUMER_KEY, s.MPESA_CONSUMER_SECRET),
    )
    r.raise_for_status()
    return r.json()["access_token"]


async def stk_push(phone: str, amount_kes: int, account_reference: str, transaction_desc: str) -> dict:
    s = get_settings()
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{s.MPESA_SHORTCODE}{s.MPESA_PASSKEY}{ts}".encode()).decode()
    msisdn = normalize_phone(phone)
    async with httpx.AsyncClient(timeout=30) as client:
        token = await _token(client)
        r = await client.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "BusinessShortCode": s.MPESA_SHORTCODE,
                "Password": password,
                "Timestamp": ts,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(amount_kes),
                "PartyA": msisdn,
                "PartyB": s.MPESA_SHORTCODE,
                "PhoneNumber": msisdn,
                "CallBackURL": s.MPESA_CALLBACK_URL,
                "AccountReference": account_reference[:ACCOUNT_REF_MAX],
                "TransactionDesc": transaction_desc[:TRANSACTION_DESC_MAX],
            },
        )
        r.raise_for_status()
        return r.json()


async def b2c_payout(phone: str, amount_kes: int, remarks: str, occasion: str = "") -> dict:
    s = get_settings()
    async with httpx.AsyncClient(timeout=30) as client:
        token = await _token(client)
        r = await client.post(
            f"{_base_url()}/mpesa/b2c/v1/paymentrequest",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "InitiatorName": s.MPESA_B2C_INITIATOR_NAME,
                "SecurityCredential": s.MPESA_B2C_SECURITY_CREDENTIAL,
                "CommandID": s.MPESA_B2C_COMMAND_ID,
                "Amount": int(amount_kes),
                "PartyA": s.MPESA_B2C_SHORTCODE,
                "PartyB": normalize_phone(phone),
                "Remarks": remarks[:100],
                "QueueTimeOutURL": s.MPESA_B2C_QUEUE_URL,
                "ResultURL": s.MPESA_B2C_RESULT_URL,
                "Occasion": occasion[:100],
            },
        )
        r.raise_for_status()
        return r.json()
