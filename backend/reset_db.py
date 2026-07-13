"""
Database reset script — clears all operational data while preserving staff users & roles.

Keeps:
  - All roles & permissions
  - Users with roles: Resort Owner, Manager, Accountant, Housekeeping, Receptionist
  - The role definitions (all of them)

Deletes:
  - All guest users (role = Guest)
  - All rooms (room types preserved)
  - All bookings, payments, invoices, invoice items
  - All housekeeping tasks
  - Token blacklist entries

Usage:
    cd backend
    python -m app.core.seed    # first ensure roles exist
    python reset_db.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.database import Base


async def reset():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    Session = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    KEEP_ROLES = [
        "Resort Owner",
        "Manager",
        "Accountant",
        "Housekeeping",
        "Receptionist",
    ]

    async with Session() as db:
        await db.execute(text("SET session_replication_role = 'replica';"))

        tables = [
            "token_blacklist",
            "invoice_items",
            "payments",
            "housekeeping_tasks",
            "invoices",
            "bookings",
            "rooms",
        ]
        for t in tables:
            await db.execute(text(f"DELETE FROM {t};"))
            print(f"  Cleared table: {t}")

        delete_guests = text("""
            DELETE FROM users
            WHERE role_id IN (
                SELECT id FROM roles WHERE name = 'Guest'
            );
        """)
        result = await db.execute(delete_guests)
        print(f"  Deleted {result.rowcount} guest user(s)")

        await db.execute(text("SET session_replication_role = 'origin';"))
        await db.commit()
        print("Done! Database reset complete. Staff users and roles preserved.")


if __name__ == "__main__":
    confirm = input(
        "This will DELETE ALL operational data (bookings, rooms, guests, etc.). Proceed? (y/N): "
    )
    if confirm.strip().lower() == "y":
        asyncio.run(reset())
    else:
        print("Aborted.")
