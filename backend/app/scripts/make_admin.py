"""CLI script to promote a user to admin in the database."""
import asyncio
import sys
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import User


async def promote(email: str) -> None:
    clean_email = email.strip().lower()
    async with AsyncSessionLocal() as session:
        user = (await session.execute(
            select(User).where(User.email == clean_email)
        )).scalar_one_or_none()

        if not user:
            print(f"User with email '{clean_email}' not found in the database.")
            print(f"When they register or log in, their account will automatically have admin rights via ADMIN_EMAILS.")
            return

        user.is_admin = True
        await session.commit()
        print(f"Successfully promoted {clean_email} (ID: {user.id}) to admin (is_admin=True).")


def main() -> None:
    if len(sys.argv) < 2:
        email = "wainaina.mungai@gmail.com"
    else:
        email = sys.argv[1]
    asyncio.run(promote(email))


if __name__ == "__main__":
    main()
