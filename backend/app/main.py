from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import (
    auth,
    mhesh_aspirants,
    mhesh_ops,
    mhesh_partners,
    mhesh_public,
    mhesh_studio,
    mhesh_tasks,
    payments,
)

app = FastAPI(title="Mafichoni API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MHESH_PREFIX = "/api/mhesh"
MHESH_ALWAYS_OPEN = {"/api/mhesh/health"}


@app.middleware("http")
async def mhesh_odpc_gate(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Section 2.1: the whole Mhesh tenant is closed until ODPC registration is confirmed."""
    path = request.url.path
    if (path == MHESH_PREFIX or path.startswith(MHESH_PREFIX + "/")) and path not in MHESH_ALWAYS_OPEN \
            and not get_settings().MHESH_ODPC_REGISTERED:
        return JSONResponse({"detail": "Mhesh is not yet available"}, status_code=503)
    return await call_next(request)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


app.include_router(auth.router)
app.include_router(payments.router)
app.include_router(mhesh_public.router)
app.include_router(mhesh_aspirants.router)
app.include_router(mhesh_studio.router)
app.include_router(mhesh_tasks.router)
app.include_router(mhesh_partners.router)
app.include_router(mhesh_ops.router)
