import asyncio
from sqlalchemy import text
from app.core.database import engine

async def clean_database():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Deleting payments...")
        await conn.execute(text("DELETE FROM payments;"))
        print("Deleting bookings...")
        await conn.execute(text("DELETE FROM bookings;"))
        print("Deleting housekeeping tasks...")
        await conn.execute(text("DELETE FROM housekeeping_tasks;"))
        print("Deleting users other than the resort owner...")
        await conn.execute(text("DELETE FROM users WHERE email != 'aonontojahan@gmail.com';"))
        print("Database cleaned successfully!")

if __name__ == "__main__":
    asyncio.run(clean_database())
