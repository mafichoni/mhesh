from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_token,
    get_current_user,
    hash_password,
    is_admin_email,
    verify_password,
)
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: str | None = None
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None


class LoginIn(BaseModel):
    identifier: str
    password: str


@router.post("/register")
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)) -> dict:
    if not payload.email and not payload.phone:
        raise HTTPException(400, "email or phone required")
    conds = []
    email_clean = payload.email.lower().strip() if payload.email else None
    if email_clean:
        conds.append(User.email == email_clean)
    if payload.phone:
        conds.append(User.phone == payload.phone)
    if (await db.execute(select(User).where(or_(*conds)))).scalar_one_or_none():
        raise HTTPException(400, "Account already exists")
    user = User(
        email=email_clean,
        phone=payload.phone,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_admin=is_admin_email(email_clean),
    )
    db.add(user)
    await db.commit()
    return {"access_token": create_token(user.id), "token_type": "bearer"}


@router.post("/login")
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> dict:
    ident = payload.identifier.strip()
    user = (await db.execute(
        select(User).where(or_(User.email == ident.lower(), User.phone == ident))
    )).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    if user.email and is_admin_email(user.email) and not user.is_admin:
        user.is_admin = True
        await db.commit()
    return {"access_token": create_token(user.id), "token_type": "bearer"}


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "is_admin": user.is_admin or is_admin_email(user.email),
    }
