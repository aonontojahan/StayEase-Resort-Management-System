"""
Full database reset — drops ALL tables + enum types, recreates from scratch.
Import all models so Base.metadata has everything registered.
Run with backend stopped.
"""

import asyncio
from sqlalchemy import text
from app.core.database import Base, engine

# Import ALL models to register them with Base.metadata
import app.auth.models  # noqa
import app.rooms.models  # noqa
import app.bookings.models  # noqa
import app.housekeeping.models  # noqa
import app.payments.models  # noqa
import app.refunds.models  # noqa
import app.invoices.models  # noqa
import app.audit.models  # noqa

ENUM_TYPES = [
    "paymentmethod",
    "paymentstatus",
    "bookingstatus",
    "roomstatus",
    "taskstatus",
    "invoicestatus",
    "tokenblacklist",
    "bookingroomstatus",
    "refundmethod",
    "refundstatus",
]


async def reset():
    print("=== FULL DATABASE RESET ===")
    async with engine.begin() as conn:
        for enum in ENUM_TYPES:
            try:
                await conn.execute(text(f"DROP TYPE IF EXISTS {enum} CASCADE"))
                print(f"  Dropped enum: {enum}")
            except Exception as e:
                print(f"  Skipped enum {enum}: {e}")

        await conn.run_sync(Base.metadata.drop_all)
        print("  Dropped all tables.")

        await conn.run_sync(Base.metadata.create_all)
        print("  Created all tables fresh (all models registered).")

    await engine.dispose()
    print("=== DONE ===")
    print("Restart the backend to seed roles, permissions, and owner account.")


if __name__ == "__main__":
    asyncio.run(reset())
