"""
Proper database reset — deletes operational data in FK-safe order.
Shows counts before & after deletion.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings


async def count_rows(db: AsyncSession) -> dict[str, int]:
    tables = [
        "token_blacklist",
        "invoice_items",
        "invoices",
        "payments",
        "housekeeping_tasks",
        "bookings",
        "rooms",
        "users",
    ]
    counts = {}
    for t in tables:
        result = await db.execute(text(f"SELECT COUNT(*) FROM {t}"))
        counts[t] = int(result.scalar() or 0)
    return counts


async def reset():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with Session() as db:
        print("=== CURRENT DATABASE COUNTS ===")
        before = await count_rows(db)
        for t, c in before.items():
            print(f"  {t}: {c}")
        print()

        # Delete in FK-safe order (children first, then parents)
        # No session_replication_role hack needed
        delete_order = [
            "invoice_items",  # FK -> invoices (CASCADE)
            "payments",  # FK -> bookings (CASCADE)
            "housekeeping_tasks",  # FK -> rooms (CASCADE)
            "invoices",  # FK -> bookings (RESTRICT), users (RESTRICT)
            "bookings",  # FK -> rooms (RESTRICT), users (RESTRICT)
            "rooms",  # FK -> room_types (RESTRICT)
            "token_blacklist",  # no FKs
        ]

        for t in delete_order:
            if before.get(t, 0) == 0:
                print(f"  {t}: already empty, skipped")
                continue
            await db.execute(text(f"DELETE FROM {t};"))
            print(f"  Cleared: {t}")

        # Delete guest users
        result = await db.execute(
            text("""
                DELETE FROM users
                WHERE role_id IN (SELECT id FROM roles WHERE name = 'Guest')
            """)
        )
        print(f"  Deleted {result.rowcount} guest user(s)")

        await db.commit()

        print()
        print("=== DATABASE COUNTS AFTER RESET ===")
        after = await count_rows(db)
        for t, c in after.items():
            print(f"  {t}: {c}")

        print()
        print("Done! Operational data cleared. Staff users and roles preserved.")


if __name__ == "__main__":
    confirm = input(
        "This will DELETE all operational data (bookings, payments, invoices, rooms, guests). Proceed? (y/N): "
    )
    if confirm.strip().lower() == "y":
        asyncio.run(reset())
    else:
        print("Aborted.")
