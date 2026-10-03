# Mhesh Backend

FastAPI service powering the Mhesh campaign platform. Provides async PostgreSQL models, M-Pesa Daraja integration, Cloudflare R2 storage, Redis rate limiting, and AI generation pipelines.

---

## Quick Start

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Ensure the following key variables are set for local development:
```env
ENV=development
DATABASE_URL=postgresql+asyncpg://mhesh:mhesh@localhost:5435/mhesh
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-jwt-secret-key-mhesh-2027
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000
ADMIN_EMAILS=wainaina.mungai@gmail.com
MHESH_ODPC_REGISTERED=true
MHESH_PUBLIC_URL=https://mhesh.app
```

### 2. Install Dependencies

```bash
python -m venv .venv
# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt -r requirements-dev.txt
```

### 3. Migrations & Database Setup

Apply Alembic migrations to create all Mhesh tables:
```bash
alembic upgrade head
```

### 4. Run Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

- API Docs (Swagger): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health` or `http://localhost:8000/api/mhesh/health`

---

## Running Background Workers

The periodic cron worker enforces electoral blackout timing and recalculates trust scores:
```bash
python -m app.workers.mhesh_cron
```

---

## Running Tests

Run the full pytest suite (84 tests):
```bash
pytest -v
```

Run test suite with coverage report:
```bash
pytest --cov=app tests/
```
