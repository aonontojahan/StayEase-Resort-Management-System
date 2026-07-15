import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.audit.service import get_client_ip, log_action
from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.auth.repository import UserRepository
from app.auth.schemas import UserRead
from app.bookings.models import BookingStatus
from app.bookings.repository import BookingRepository
from app.bookings.schemas import BookingCreate, BookingRead, BookingStatusUpdate
from app.core.database import get_db
from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from app.core.config import settings
from app.core.email import send_html_email, get_refund_notification_html
from app.core.pagination import PaginationParams
from app.invoices.repository import InvoiceRepository
from app.invoices.schemas import InvoiceCreate, InvoiceItemCreate
from app.payments.models import PaymentStatus
from app.payments.repository import PaymentRepository
from app.refunds.models import RefundStatus
from app.refunds.repository import RefundRepository
from app.rooms.repository import RoomRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["Bookings"])

STAFF_ROLES = ["Resort Owner", "Manager", "Receptionist", "Accountant"]


@router.get("/", response_model=List[BookingRead])
async def list_all_bookings(
    pagination: PaginationParams = Depends(),
    current_user: User = require_role(STAFF_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = BookingRepository(db)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await repo.count_all()
    return JSONResponse(
        content=jsonable_encoder([BookingRead.model_validate(b) for b in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/my", response_model=List[BookingRead])
async def list_my_bookings(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = BookingRepository(db)
    items = await repo.get_by_guest(
        current_user.id, skip=pagination.skip, limit=pagination.limit
    )
    total = await repo.count_by_guest(current_user.id)
    return JSONResponse(
        content=jsonable_encoder([BookingRead.model_validate(b) for b in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")
    if current_user.role.name == "Guest" and booking.guest_id != current_user.id:
        raise ForbiddenException("You can only view your own bookings.")
    return booking


@router.post("/", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room_repo = RoomRepository(db)
    booking_repo = BookingRepository(db)

    total_amount = 0.0
    resolved_rooms = []

    for room_data in data.rooms:
        if room_data.check_out_date <= room_data.check_in_date:
            raise BadRequestException("Check-out must be after check-in.")

        room = await room_repo.get_by_id(room_data.room_id)
        if not room:
            raise NotFoundException(f"Room {room_data.room_id} not found.")
        if room.status.value == "Maintenance":
            raise BadRequestException(
                f"Room {room.room_number} is under maintenance and cannot be booked."
            )

        conflict = await booking_repo.has_conflict(
            room_data.room_id, room_data.check_in_date, room_data.check_out_date
        )
        if conflict:
            raise BadRequestException(
                f"Room {room.room_number} is not available for the selected dates."
            )

        nights = (room_data.check_out_date - room_data.check_in_date).days
        room_total = float(room.room_type.base_price_per_night) * nights
        total_amount += room_total

        resolved_rooms.append(
            {
                "room_data": room_data,
                "room": room,
                "nights": nights,
                "room_total": room_total,
            }
        )

    is_staff = current_user.role.name in STAFF_ROLES
    if data.guest_id and is_staff:
        guest_repo = UserRepository(db)
        target_guest = await guest_repo.get_by_id(data.guest_id)
        if not target_guest:
            raise NotFoundException("Specified guest not found.")
        guest_id = data.guest_id
    else:
        guest_id = current_user.id

    booking = await booking_repo.create(data, guest_id, current_user.id, total_amount)

    booking = await booking_repo.get_by_id(booking.id)
    for br, resolved in zip(booking.booking_rooms, resolved_rooms):
        br.room_price_per_night = resolved["room"].room_type.base_price_per_night
        br.total_amount = resolved["room_total"]
        db.add(br)
    await db.flush()

    return await booking_repo.get_by_id(booking.id)


@router.patch("/{booking_id}/status", response_model=BookingRead)
async def update_booking_status(
    booking_id: uuid.UUID,
    body: BookingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        new_status = BookingStatus(body.status)
    except ValueError:
        valid = [s.value for s in BookingStatus]
        raise BadRequestException(f"Invalid status. Valid values: {valid}")

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    is_staff = current_user.role.name in STAFF_ROLES
    is_owner = booking.guest_id == current_user.id

    if new_status == BookingStatus.cancelled:
        if not is_staff and not is_owner:
            raise ForbiddenException("You cannot cancel this booking.")
        if booking.status == BookingStatus.cancelled:
            raise BadRequestException("Booking is already cancelled.")
        if booking.status in (BookingStatus.checked_out,):
            raise BadRequestException("Cannot cancel a completed booking.")
    else:
        if not is_staff:
            raise ForbiddenException("Only staff can change booking status.")

    if new_status == BookingStatus.cancelled:
        total = float(booking.total_amount)
        paid = float(booking.paid_amount)

        if paid > 0:
            total_cancellation_fee = total * settings.CANCELLATION_FEE_PERCENTAGE
            total_refund_amount = max(paid - total_cancellation_fee, 0)

            payment_repo = PaymentRepository(db)
            refund_repo = RefundRepository(db)
            payments = await payment_repo.get_by_booking(booking.id)
            completed_payments = [
                p for p in payments if p.status == PaymentStatus.completed
            ]

            for p in completed_payments:
                payment_portion = float(p.amount) / paid if paid > 0 else 0
                payment_fee = total_cancellation_fee * payment_portion
                payment_fee = min(payment_fee, float(p.amount))

                p.cancellation_fee = payment_fee
                p.status = PaymentStatus.refunded
                db.add(p)

                refund_amount = float(p.amount) - payment_fee
                try:
                    if (
                        p.payment_method.value == "Card"
                        and p.transaction_ref
                        and not p.transaction_ref.startswith("pi_mock_")
                    ):
                        import stripe

                        stripe.api_key = settings.STRIPE_SECRET_KEY
                        stripe.Refund.create(
                            payment_intent=p.transaction_ref,
                            amount=int(refund_amount * 100),
                        )
                except Exception as stripe_err:
                    logger.warning(
                        f"Stripe refund failed for payment {p.id}: {stripe_err}"
                    )

                refund_rec = await refund_repo.create(
                    payment_id=p.id,
                    booking_id=booking.id,
                    amount=refund_amount,
                    cancellation_fee=payment_fee,
                    refund_method="Stripe"
                    if p.payment_method.value == "Card"
                    else p.payment_method.value,
                    initiated_by_id=current_user.id,
                    status=RefundStatus.completed,
                    notes=f"Cancellation refund for booking {booking.id}",
                )
                await refund_repo.complete(
                    refund_rec.id,
                    p.transaction_ref or f"cancel_ref_{uuid.uuid4().hex[:8]}",
                )

            try:
                email_html = get_refund_notification_html(
                    guest_name=booking.guest.full_name,
                    booking_id=str(booking.id),
                    refund_amount=total_refund_amount,
                    cancellation_fee=total_cancellation_fee,
                    payment_method="Multiple",
                    transaction_ref=", ".join(
                        [str(p.id)[:8] for p in completed_payments]
                    ),
                )
                send_html_email(
                    to_email=booking.guest.email,
                    subject=f"StayEase Resort - Booking #{booking.id} Cancelled",
                    html_content=email_html,
                    text_content=f"Your booking has been cancelled. Refund: TK {total_refund_amount:.2f}, Fee: TK {total_cancellation_fee:.2f}.",
                )
            except Exception as email_err:
                logger.warning(f"Failed to send cancellation email: {email_err}")

            room_repo = RoomRepository(db)
            for br in booking.booking_rooms:
                room = await room_repo.get_by_id(br.room_id)
                if room:
                    await room_repo.update(room, {"status": "Cleaning"})
        return await repo.update_status(booking, new_status)

    room_repo = RoomRepository(db)
    if new_status == BookingStatus.checked_in:
        for br in booking.booking_rooms:
            room = await room_repo.get_by_id(br.room_id)
            if room:
                await room_repo.update(room, {"status": "Occupied"})
    elif new_status == BookingStatus.checked_out:
        from app.housekeeping.repository import HousekeepingRepository
        from app.housekeeping.schemas import TaskCreate

        hk_repo = HousekeepingRepository(db)
        assigned_hk_id = await hk_repo.find_least_busy_housekeeper()
        for br in booking.booking_rooms:
            room = await room_repo.get_by_id(br.room_id)
            room_label = room.room_number if room else br.room_id
            room_type_name = room.room_type.name if room else "Unknown"
            if room:
                await room_repo.update(room, {"status": "Cleaning"})
            task = await hk_repo.create(
                TaskCreate(
                    room_id=br.room_id,
                    assigned_to_id=assigned_hk_id,
                    title=f"Clean Room {room_label} after checkout",
                    description=f"Guest checked out. Booking #{str(booking.id)[:8]}. Room {room_label} ({room_type_name}).",
                    priority="Medium",
                ),
                created_by_id=current_user.id,
            )
            try:
                from app.ws.manager import manager

                await manager.broadcast_to_room(
                    "housekeeping",
                    {
                        "type": "housekeeping_task",
                        "task_id": str(task.id),
                        "room_number": room_label,
                        "room_type": room_type_name,
                        "assigned_to": str(assigned_hk_id) if assigned_hk_id else None,
                    },
                )
            except Exception as e:
                logger.warning(f"WebSocket broadcast failed: {e}")

    return await repo.update_status(booking, new_status)


@router.post("/{booking_id}/check-in", response_model=BookingRead)
async def check_in_booking(
    booking_id: uuid.UUID,
    current_user: User = require_role(["Receptionist", "Manager", "Resort Owner"]),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")
    if booking.status != BookingStatus.confirmed:
        raise BadRequestException("Booking must be confirmed before check-in.")

    room_repo = RoomRepository(db)
    for br in booking.booking_rooms:
        room = await room_repo.get_by_id(br.room_id)
        if room:
            await room_repo.update(room, {"status": "Occupied"})

    result = await repo.update_status(booking, BookingStatus.checked_in)

    await log_action(
        db=db,
        action="check_in",
        resource_type="booking",
        resource_id=str(booking_id),
        details={"guest_name": booking.guest.full_name},
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        ip_address=get_client_ip(request) if request else None,
    )

    return result


@router.post("/{booking_id}/check-out", response_model=BookingRead)
async def check_out_booking(
    booking_id: uuid.UUID,
    current_user: User = require_role(["Receptionist", "Manager", "Resort Owner"]),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")
    if booking.status != BookingStatus.checked_in:
        raise BadRequestException("Booking must be checked in before check-out.")

    room_repo = RoomRepository(db)
    from app.housekeeping.repository import HousekeepingRepository
    from app.housekeeping.schemas import TaskCreate

    hk_repo = HousekeepingRepository(db)
    assigned_hk_id = await hk_repo.find_least_busy_housekeeper()
    for br in booking.booking_rooms:
        room = await room_repo.get_by_id(br.room_id)
        room_label = room.room_number if room else br.room_id
        room_type_name = room.room_type.name if room else "Unknown"
        if room:
            await room_repo.update(room, {"status": "Cleaning"})
        task = await hk_repo.create(
            TaskCreate(
                room_id=br.room_id,
                assigned_to_id=assigned_hk_id,
                title=f"Clean Room {room_label} after checkout",
                description=f"Guest checked out. Booking #{str(booking.id)[:8]}. Room {room_label} ({room_type_name}).",
                priority="Medium",
            ),
            created_by_id=current_user.id,
        )
        try:
            from app.ws.manager import manager

            await manager.broadcast_to_room(
                "housekeeping",
                {
                    "type": "housekeeping_task",
                    "task_id": str(task.id),
                    "room_number": room_label,
                    "room_type": room_type_name,
                    "assigned_to": str(assigned_hk_id) if assigned_hk_id else None,
                },
            )
        except Exception as e:
            logger.warning(f"WebSocket broadcast failed: {e}")

    result = await repo.update_status(booking, BookingStatus.checked_out)

    await log_action(
        db=db,
        action="check_out",
        resource_type="booking",
        resource_id=str(booking_id),
        details={"guest_name": booking.guest.full_name},
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        ip_address=get_client_ip(request) if request else None,
    )

    return result


@router.get("/guests", response_model=List[UserRead])
async def list_guests(
    search: str = "",
    pagination: PaginationParams = Depends(),
    _: User = require_role(STAFF_ROLES),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(User).options(selectinload(User.role)).where(User.role.has(name="Guest"))
    )
    if search:
        query = query.where(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone_number.ilike(f"%{search}%"),
            )
        )
    count_query = select(User.id).where(User.role.has(name="Guest"))
    if search:
        count_query = count_query.where(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone_number.ilike(f"%{search}%"),
            )
        )
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())
    query = (
        query.order_by(User.full_name).offset(pagination.skip).limit(pagination.limit)
    )
    result = await db.execute(query)
    users = result.scalars().all()
    return JSONResponse(
        content=jsonable_encoder([UserRead.model_validate(u) for u in users]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")
    is_staff = current_user.role.name in ["Resort Owner", "Manager"]
    is_owner = booking.guest_id == current_user.id
    if not is_staff and not is_owner:
        raise ForbiddenException("You cannot delete this booking.")
    if not is_staff and booking.status != "Cancelled":
        raise BadRequestException("You can only delete cancelled bookings.")
    await repo.delete(booking)
