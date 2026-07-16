import csv
import io
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.auth.dependencies import require_role
from app.auth.models import User
from app.bookings.models import Booking, BookingRoom, BookingStatus
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
    """Return occupancy statistics.

    A room is considered occupied if:
      - Its status is 'Occupied', OR
      - It has a BookingRoom with status Confirmed or CheckedIn
        whose date range includes today (check_in <= today < check_out).
    """
    today = date.today()

    total_rooms_result = await db.execute(select(func.count(Room.id)))
    total_rooms = int(total_rooms_result.scalar() or 0)

    # ── Rooms physically marked Occupied ──
    occupied_by_status_result = await db.execute(
        select(Room.id).where(Room.status == RoomStatus.occupied)
    )
    occupied_by_status = {row[0] for row in occupied_by_status_result.all()}

    # ── Rooms with an active booking overlapping today ──
    active_rooms_result = await db.execute(
        select(BookingRoom.room_id).where(
            BookingRoom.status.in_([BookingStatus.confirmed, BookingStatus.checked_in]),
            BookingRoom.check_in_date <= today,
            BookingRoom.check_out_date > today,
        )
    )
    active_booking_rooms = {row[0] for row in active_rooms_result.all()}

    occupied_ids = occupied_by_status | active_booking_rooms
    occupied = len(occupied_ids)

    # Remaining counts (cleaning / maintenance)
    cleaning_result = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.cleaning)
    )
    cleaning = int(cleaning_result.scalar() or 0)

    maintenance_result = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.maintenance)
    )
    maintenance = int(maintenance_result.scalar() or 0)

    available = max(total_rooms - occupied - cleaning - maintenance, 0)

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
    """Return monthly revenue data including cancellation fees."""
    # Completed payments
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

    # Cancellation fees from refunded payments (not counted as separate transactions)
    fee_result = await db.execute(
        select(Payment.created_at, Payment.cancellation_fee, Payment.amount).where(
            Payment.status == PaymentStatus.refunded,
            Payment.cancellation_fee > 0,
        )
    )
    for row in fee_result.all():
        if not row.created_at:
            continue
        month_str = row.created_at.strftime("%Y-%m")
        if month_str not in monthly_data:
            monthly_data[month_str] = {"revenue": 0.0, "count": 0}

        fee = float(row.cancellation_fee or 0)
        monthly_data[month_str]["revenue"] += fee

    sorted_months = sorted(monthly_data.keys())
    return [
        {
            "month": m,
            "revenue": monthly_data[m]["revenue"],
            "count": monthly_data[m]["count"],
        }
        for m in sorted_months
    ]


@router.get("/cancellation-fees")
async def cancellation_fees_report(
    _: User = require_role(ANALYTICS_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Return cancellation fee revenue data."""
    total_result = await db.execute(
        select(
            func.sum(Payment.cancellation_fee),
            func.count(Payment.id),
        ).where(
            Payment.status == PaymentStatus.refunded,
            Payment.cancellation_fee > 0,
        )
    )
    total_row = total_result.one()
    total_fees = float(total_row[0] or 0)
    fee_count = int(total_row[1] or 0)

    monthly_result = await db.execute(
        select(
            func.date_trunc("month", Payment.created_at).label("month"),
            func.sum(Payment.cancellation_fee),
            func.count(Payment.id),
        )
        .where(
            Payment.status == PaymentStatus.refunded,
            Payment.cancellation_fee > 0,
        )
        .group_by(func.date_trunc("month", Payment.created_at))
        .order_by(func.date_trunc("month", Payment.created_at))
    )

    monthly_data = []
    for row in monthly_result.all():
        month_str = row.month.strftime("%Y-%m") if row.month else "Unknown"
        monthly_data.append(
            {
                "month": month_str,
                "fees": float(row[1] or 0),
                "count": int(row[2] or 0),
            }
        )

    return {
        "total_fees": total_fees,
        "total_cancellations": fee_count,
        "monthly": monthly_data,
    }


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
