from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.auth.dependencies import require_role
from app.auth.models import User
from app.bookings.models import Booking, BookingStatus
from app.core.database import get_db
from app.payments.models import Payment, PaymentStatus
from app.rooms.models import Room, RoomStatus

router = APIRouter(prefix="/reports", tags=["Reports"])

ANALYTICS_ROLES = ["Super Admin", "Resort Owner", "Manager", "Accountant"]


@router.get("/occupancy")
async def occupancy_report(
    _: User = require_role(ANALYTICS_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Return occupancy statistics."""
    total_rooms_result = await db.execute(select(func.count(Room.id)))
    total_rooms = int(total_rooms_result.scalar() or 0)

    occupied_result = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.occupied)
    )
    occupied = int(occupied_result.scalar() or 0)

    available_result = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.available)
    )
    available = int(available_result.scalar() or 0)

    cleaning_result = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.cleaning)
    )
    cleaning = int(cleaning_result.scalar() or 0)

    maintenance_result = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.maintenance)
    )
    maintenance = int(maintenance_result.scalar() or 0)

    occupancy_rate = round((occupied / total_rooms * 100), 1) if total_rooms > 0 else 0

    return {
        "total_rooms": total_rooms,
        "occupied": occupied,
        "available": available,
        "cleaning": cleaning,
        "maintenance": maintenance,
        "occupancy_rate": occupancy_rate,
    }


@router.get("/bookings-summary")
async def bookings_summary(
    _: User = require_role(ANALYTICS_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Return booking counts by status."""
    results = {}
    for s in BookingStatus:
        count_result = await db.execute(
            select(func.count(Booking.id)).where(Booking.status == s)
        )
        results[s.value] = int(count_result.scalar() or 0)
    
    total_result = await db.execute(select(func.count(Booking.id)))
    results["Total"] = int(total_result.scalar() or 0)
    return results


@router.get("/revenue")
async def revenue_report(
    _: User = require_role(ANALYTICS_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Return monthly revenue data."""
    result = await db.execute(
        select(
            func.date_trunc("month", Payment.created_at).label("month"),
            func.sum(Payment.amount).label("revenue"),
            func.count(Payment.id).label("count"),
        )
        .where(Payment.status == PaymentStatus.completed)
        .group_by("month")
        .order_by("month")
    )
    rows = result.all()
    return [
        {
            "month": row.month.strftime("%Y-%m") if row.month else None,
            "revenue": float(row.revenue or 0),
            "count": int(row.count or 0),
        }
        for row in rows
    ]
