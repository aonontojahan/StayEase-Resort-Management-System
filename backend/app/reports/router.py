import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.auth.dependencies import require_role
from app.auth.models import User
from app.bookings.models import Booking, BookingStatus
from app.core.database import get_db
from app.payments.models import Payment, PaymentStatus
from app.payments.repository import PaymentRepository
from app.rooms.models import Room, RoomStatus

router = APIRouter(prefix="/reports", tags=["Reports"])

ANALYTICS_ROLES = ["Resort Owner", "Manager", "Accountant"]


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
        select(Payment.created_at, Payment.amount).where(
            Payment.status == PaymentStatus.completed
        )
    )
    rows = result.all()

    monthly_data = {}
    for row in rows:
        if not row.created_at:
            continue
        month_str = row.created_at.strftime("%Y-%m")
        if month_str not in monthly_data:
            monthly_data[month_str] = {"revenue": 0.0, "count": 0}

        monthly_data[month_str]["revenue"] += float(row.amount or 0)
        monthly_data[month_str]["count"] += 1

    sorted_months = sorted(monthly_data.keys())
    return [
        {
            "month": m,
            "revenue": monthly_data[m]["revenue"],
            "count": monthly_data[m]["count"],
        }
        for m in sorted_months
    ]


@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    _: User = require_role(["Resort Owner", "Manager", "Accountant"]),
    db: AsyncSession = Depends(get_db),
):
    pay_repo = PaymentRepository(db)
    payments = await pay_repo.get_all(skip=0, limit=10000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Date",
            "Booking ID",
            "Guest",
            "Amount",
            "Method",
            "Status",
            "Transaction Ref",
            "Recorded By",
        ]
    )

    for p in payments:
        writer.writerow(
            [
                p.created_at.strftime("%Y-%m-%d %H:%M")
                if hasattr(p.created_at, "strftime")
                else str(p.created_at),
                str(p.booking_id),
                p.booking.guest.full_name
                if hasattr(p, "booking") and p.booking
                else "",
                f"{p.amount:.2f}",
                p.payment_method,
                p.status,
                p.transaction_ref or "",
                p.recorded_by.full_name
                if hasattr(p, "recorded_by") and p.recorded_by
                else "",
            ]
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=stayease-{report_type}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
        },
    )
