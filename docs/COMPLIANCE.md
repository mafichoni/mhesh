# Kenya 2027 Electoral & Data Compliance Guide

This document outlines how the **Mhesh** platform adheres to Kenyan statutory regulations, including the **Data Protection Act (2019)**, **ODPC Regulations**, and the **Elections Act** ahead of the August 2027 General Election.

---

## 1. Office of the Data Protection Commissioner (ODPC)

Under the Data Protection Act (2019), any digital system processing personal and political data of Kenyan citizens must register as a Data Controller and Data Processor.

### Enforcement in Code
1. **Tenant Switch**:
   - The environment variable `MHESH_ODPC_REGISTERED` serves as an immutable operational gate.
   - Handled in `backend/app/main.py`:
     ```python
     @app.middleware("http")
     async def mhesh_odpc_gate(request: Request, call_next):
         path = request.url.path
         if path.startswith("/api/mhesh") and path not in MHESH_ALWAYS_OPEN:
             if not get_settings().MHESH_ODPC_REGISTERED:
                 return JSONResponse(
                     {"detail": "Mhesh is not yet available"},
                     status_code=503
                 )
         return await call_next(request)
     ```
2. **Data Minimization & Voter Consent**:
   - Voter follower signups explicitly record consent timestamps.
   - Public WhatsApp numbers are displayed only with explicit opt-in from candidates.
   - Supporters' geolocation data is captured solely for task verification and not tracked persistently.

---

## 2. Statutory Campaign Blackout

Kenyan electoral law mandates a complete cessation of all public campaign activities, advertising, and distribution 48 hours before polling day.

- **Blackout Start**: `2027-08-05T00:00:00+03:00`
- **Blackout End**: `2027-08-11T00:00:00+03:00`
- **Enforcement Mechanics**:
  - Middleware intercepts all write actions (`POST`, `PATCH`, `PUT`, `DELETE`) across `/api/mhesh/*`.
  - Automated worker `backend/app/workers/mhesh_cron.py` verifies blackout timing on a persistent heartbeat.
  - Read-only historical access to candidate profiles remains open for civic informational transparency.

---

## 3. Synthetic Media & AI Content Disclosure

To combat misinformation and deepfakes in the 2027 election, Mhesh applies rigorous provenance safeguards to every AI-generated asset:

1. **EXIF Provenance Watermarking**:
   - Prior to storing images in Cloudflare R2, `ai_mhesh.py` embeds an invisible EXIF metadata tag including:
     - Model Name (`Wan2.2-Image` / `SDXL`)
     - Candidate User ID
     - Prompt & Generation Timestamp
     - Cryptographic audit digest
2. **Visible UI Disclosures**:
   - All image previews and downloaded outputs contain the visible `<AiGeneratedTag />` badge: `AI-generated • Mhesh 2027`.
3. **Audit Ledger**:
   - Every generation is permanently recorded in `mhesh_ai_generations` with full prompt text, style template, and IP audit metadata.

---

## 4. Defamation, Third-Party Consent & Hate Speech Moderation

The platform enforces zero tolerance for defamatory, derogatory, or incitement content:

1. **Non-Consenting Persons Policy**:
   - The AI generation pipeline rejects any prompt attempting to depict political opponents, third parties, or private citizens. Only the verified candidate's registered face embedding may be synthesized.
2. **Multilingual Blocklist**:
   - Screened at the handler level before LLM/GPU execution across:
     - **English**
     - **Kiswahili**
     - **Sheng** (Nairobi urban youth dialect)
3. **Ops Escalation**:
   - Any rejected attempt logs a record in `mhesh_reports` flagged for human administrative review.

---

## 5. Non-Custodial Escrow Legal Structure

Mhesh operates strictly as a **technology and payment facilitation service**, not a campaign finance custodian:
- Escrow records (`mhesh_escrows`) store designated candidate source account references.
- Campaign funds are never commingled or pooled in a central holding treasury.
- Payouts are directly triggered through Safaricom Daraja B2C APIs upon verified delivery of grassroots work.
- Every profile displays the statutory platform disclaimer:
  > *"Mhesh is a technology platform. It does not endorse any candidate. All content is published by the user."*
