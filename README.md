# Mhesh (mhesh.co.ke) — Kenya 2027 Political Campaign Platform

> **The Operating System for Kenyan Political Campaigns ahead of the August 2027 General Election.**  
> Built as the fourth tenant of the **Mafichoni AI Stack** alongside Fichua, WingMan, and Ibada.

---

## 1. Overview & Strategy

Mhesh is a multi-sided political campaign platform designed to serve three key demographics in Kenya's electoral ecosystem:

- **Aspirants / Candidates**: Candidates running for **President**, **Governor**, **Senator**, **Woman Representative**, **Member of Parliament (MP)**, or **Member of County Assembly (MCA)** who need:
  - Verified public campaign profiles at `mhesh.co.ke/p/{slug}`.
  - Face-preserving AI campaign materials generation (posters, billboards, social media formats).
  - Escrow-backed grassroots campaign task delegation.
  - Bulk merchandise printing via a verified print partner marketplace.
- **Supporters / Field Agents**: Grassroots constituents who earn direct income (via M-Pesa B2C payouts) by performing physical and digital campaign tasks (flyer distribution, poster pasting, canvassing, event staffing).
- **Voters / Citizens**: The public who discover verified aspirants by county and office, follow campaigns for real-time manifesto and event updates, and share verified candidate profiles.

**Core Strategic Bet**: *The campaign that transparently mobilizes and directly compensates its grassroots constituents wins.*

---

## 2. Four Core Products

| Product | Route | Description |
|---|---|---|
| **Mhesh Profiles** | `/mhesh/p/[slug]` | Verified public candidate pages featuring manifesto, achievements, county/ward badges, social links, follower subscription, and WhatsApp contact. |
| **Mhesh Studio** | `/mhesh/dashboard/studio` | Face-preserving AI image generation powered by LoRA fine-tuning and diffusion pipelines. Generates story, post, banner, and billboard formats with visible & invisible AI disclosures. |
| **Mhesh Work** | `/mhesh/work` | Escrow-protected campaign task marketplace. Aspirants fund tasks via M-Pesa STK; supporters submit geotagged photo evidence; automated AI verification scores validity before B2C payout release. |
| **Mhesh Partners** | `/mhesh/partners` | Verified Kenyan print shop directory and order routing platform with dispute management and escrow protection. |

---

## 3. Strict Compliance & Legal Requirements (Kenya 2027)

Kenya's electoral cycle is strictly regulated by the **IEBC** (Independent Electoral and Boundaries Commission) and the **ODPC** (Office of the Data Protection Commissioner). The codebase enforces these constraints at the engine level:

1. **ODPC Tenant Gate**:
   - Env var `MHESH_ODPC_REGISTERED=true` controls tenant availability.
   - If `false`, all `/api/mhesh/*` endpoints return `503 Service Unavailable` (except health checks).
2. **Escrow Structure (Payment Facilitation Only)**:
   - Mhesh is a **payment facilitation service**, not a campaign fund custodian.
   - Funds are tied to designated campaign accounts and escrow ledgers. No pooling of candidate funds.
3. **Mandatory Platform Disclaimers**:
   - Rendered across all public profile, partner, and work pages via `<ComplianceBanner />`:
     > *"Mhesh is a technology platform. It does not endorse any candidate. All content is published by the user."*
4. **AI Content Disclosure**:
   - Every generated image carries an invisible EXIF metadata tag and JSON audit log in `mhesh_ai_generations`.
   - Downloaded assets include the visible `<AiGeneratedTag />` watermark in the corner.
5. **Non-Consenting Persons & Defamation Filter**:
   - Prompt moderation blocks generating depictions of non-consenting individuals.
   - Blocklist filtering across English, Swahili, and Sheng for defamatory or violent statements with rejections logged for moderation in `mhesh_reports`.
6. **Electoral Blackout Enforcement**:
   - Statutory blackout window begins **2027-08-05T00:00:00+03:00** until poll closing.
   - Enforced by backend middleware check and automated cron job (`mhesh_cron.py`).
7. **Rate Limiting**:
   - Redis counters enforce daily quotas:
     - **20** AI generations per candidate/day.
     - **5** profile updates per candidate/day.
     - **10** task applications per supporter/day.

---

## 4. System Architecture

```
                          ┌─────────────────────────────────────┐
                          │   Next.js 14 App Router Frontend   │
                          │   Tailwind CSS / Lucide / Axios     │
                          └──────────────────┬──────────────────┘
                                             │ HTTP / JWT Bearer
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         FastAPI Backend API         │
                          │   ODPC Gate / Blackout Middleware   │
                          └──────┬───────────┬────────────┬─────┘
                                 │           │            │
            ┌────────────────────┘           │            └───────────────────┐
            ▼                                ▼                                ▼
┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
│  PostgreSQL Database  │       │     Redis Service     │       │    External APIs      │
│  SQLAlchemy 2.0 Async │       │  Rate Limits & Quotas │       │  • M-Pesa STK & B2C   │
│  Alembic Migrations   │       │  Audit Cache & Queues │       │  • Cloudflare R2      │
└───────────────────────┘       └───────────────────────┘       │  • WhatsApp Cloud API │
                                                                │  • Resend Email       │
                                                                └───────────────────────┘
```

### Directory Structure

```
mhesh/
├── backend/
│   ├── alembic/                       # Alembic database migration scripts
│   ├── app/
│   │   ├── auth.py                    # JWT token creation, hashing, user dependencies
│   │   ├── config.py                  # Pydantic BaseSettings & environment config
│   │   ├── database.py                # Async SQLAlchemy engine & session factory
│   │   ├── main.py                    # FastAPI root application & ODPC middleware
│   │   ├── mhesh_models.py            # Mhesh database models (Aspirants, Tasks, etc.)
│   │   ├── models.py                  # Mafichoni core User & payment models
│   │   ├── schemas_mhesh.py           # Pydantic v2 validation schemas
│   │   ├── routers/
│   │   │   ├── auth.py                # Registration (/api/auth/register) & Login (/api/auth/login)
│   │   │   ├── mhesh_aspirants.py     # Candidate profiles, verification, followers
│   │   │   ├── mhesh_ops.py           # Content reports & dispute moderation queue
│   │   │   ├── mhesh_partners.py      # Print shop marketplace & order routing
│   │   │   ├── mhesh_public.py        # Public listings, search, county/office filters
│   │   │   ├── mhesh_studio.py        # AI LoRA training & image generation pipeline
│   │   │   ├── mhesh_tasks.py         # Grassroots task management & evidence review
│   │   │   └── payments.py            # M-Pesa STK push & B2C payouts
│   │   ├── services/
│   │   │   ├── ai_mhesh.py            # Moderation, EXIF watermarking, verification
│   │   │   ├── compliance_mhesh.py    # Blackout checks & Redis rate limiters
│   │   │   ├── escrow_mhesh.py        # Escrow ledger management & B2C triggers
│   │   │   ├── mpesa.py               # Daraja STK Push & B2C payout client
│   │   │   └── storage.py             # Cloudflare R2 presigned upload & URLs
│   │   └── workers/
│   │       └── mhesh_cron.py          # Blackout enforcer, trust score recomputer
│   └── tests/                         # Comprehensive pytest suite (84 tests)
├── frontend/
│   ├── app/
│   │   ├── login/                     # Root login alias
│   │   ├── register/                  # Root register alias
│   │   └── mhesh/
│   │       ├── county/[county]/       # Aspirant directory by county
│   │       ├── dashboard/             # Candidate Command Center & Setup Wizard
│   │       │   ├── followers/         # Follower management & outreach
│   │       │   ├── orders/            # Print orders tracking
│   │       │   ├── profile/           # Profile editor & manifesto builder
│   │       │   ├── studio/            # AI Studio campaign poster generator
│   │       │   │   └── train/         # LoRA photo upload & fine-tuning
│   │       │   └── tasks/             # Grassroots task delegator
│   │       ├── login/                 # Dedicated Mhesh login page
│   │       ├── office/[office]/       # Aspirants filtered by office
│   │       ├── p/[slug]/              # Public profile page
│   │       ├── partner/dashboard/     # Print partner operational view
│   │       ├── partners/              # Print partners directory & application
│   │       ├── register/              # Dedicated Mhesh registration page
│   │       ├── s/[code]/              # Shortlink redirect tracker
│   │       └── work/                  # Supporter task marketplace & earnings ledger
│   ├── components/mhesh/              # Reusable typed UI components
│   └── lib/api.ts                     # Axios client with JWT auth interceptors
└── docs/                              # Detailed architectural & compliance docs
```

---

## 5. Getting Started

### Prerequisites

- **Python**: 3.11 or 3.12
- **Node.js**: v18+ (tested on Node v20/v24)
- **PostgreSQL**: 15+ (with `uuid-ossp`)
- **Redis**: 6+ (optional locally, mockable via fakeredis)

### Environment Setup

Create `.env` in the repository root and `backend/.env`:

```bash
# Core Configuration
ENV=development
DATABASE_URL=postgresql+asyncpg://mhesh:mhesh@localhost:5435/mhesh
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secure-jwt-secret-key
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,https://mhesh.co.ke
ADMIN_EMAILS=wainaina.mungai@gmail.com

# Mhesh Compliance & Gates
MHESH_ODPC_REGISTERED=true
MHESH_PUBLIC_URL=https://mhesh.app
MHESH_BLACKOUT_START=2027-08-05T00:00:00+03:00
MHESH_BLACKOUT_END=2027-08-11T00:00:00+03:00
MHESH_VERIFY_KES=1
MHESH_IMAGE_COST_KES=200
MHESH_ESCROW_FEE_PCT=0.03
MHESH_PLATFORM_FEE_PCT=0.02

# Cloudflare R2 Storage (Optional for local mocks)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=mafichoni
R2_PUBLIC_BASE_URL=https://cdn.mhesh.app

# M-Pesa Daraja STK Push & B2C (Sandbox credentials)
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=http://localhost:8000/api/payments/mpesa/callback?secret=dev
MPESA_CALLBACK_SECRET=dev
MPESA_B2C_SHORTCODE=
MPESA_B2C_INITIATOR_NAME=
MPESA_B2C_SECURITY_CREDENTIAL=
MPESA_B2C_RESULT_URL=http://localhost:8000/api/payments/mpesa/b2c/result?secret=dev
MPESA_B2C_QUEUE_URL=http://localhost:8000/api/payments/mpesa/b2c/timeout?secret=dev
```

### Backend Setup

```bash
cd backend

# Create virtual environment and install dependencies
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt

# Run database migrations
alembic upgrade head

# Start development API server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` (docs at `http://localhost:8000/docs`).

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` or `http://localhost:3000/mhesh` in your browser.

---

## 6. Testing

### Run Backend Test Suite

The test suite covers full lifecycles for authentication, aspirant profiles, M-Pesa STK push and B2C escrow, task evidence evaluation, print partner orders, and ODPC/blackout compliance:

```bash
cd backend
pytest -v
```

### Run Frontend Typecheck & Build

```bash
cd frontend
npm run build
```

---

## 7. Key User Flows

### Aspirant Registration & Campaign Launch
1. Candidate navigates to `/mhesh/register` and chooses **Candidate**.
2. Creates an account with Name, Email/Phone, and Password.
3. Automatically redirected to `/mhesh/dashboard`.
4. If it's a new account, the **Campaign Setup Wizard** is displayed.
5. Candidate enters Title, Official Name, Office (e.g. MP, Governor), County (all 47 supported), Party, and WhatsApp number.
6. Clicks **"Launch My Campaign Profile"** &rarr; public page is immediately published at `mhesh.co.ke/p/{slug}` and Command Center is activated.

### AI Campaign Studio
1. Candidate goes to `/mhesh/dashboard/studio`.
2. Selects a style template (*Rally Podium*, *Market Visit*, *Formal Portrait*, *Billboard*, etc.) and output format (*Story*, *Post*, *Billboard*, *Banner*, etc.).
3. Enters prompt text &rarr; passes moderation filter.
4. Generates face-preserving campaign graphics tagged with `<AiGeneratedTag />` and EXIF provenance.

### Grassroots Tasks (Mhesh Work)
1. Aspirant creates a task (e.g. "Distribute 500 flyers in Westlands") and funds reward escrow via M-Pesa STK push.
2. Supporters browse tasks at `/mhesh/work` and apply.
3. Supporter submits geotagged photo evidence.
4. Candidate reviews AI-scored evidence and clicks **Approve** &rarr; M-Pesa B2C initiates direct payout to supporter's phone.

---

## 8. Documentation Index

- [Architecture & Isolation](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Compliance & Electoral Regulations](docs/COMPLIANCE.md)

---

## 9. License & Attribution

Part of the **Mafichoni Stack**. All rights reserved. Built for the Kenyan 2027 General Election.
