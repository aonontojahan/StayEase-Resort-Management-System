import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

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
from app.core.pagination import PaginationParams
from app.invoices.repository import InvoiceRepository
from app.invoices.schemas import InvoiceCreate, InvoiceItemCreate
from app.rooms.repository import RoomRepository

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
    confirm_without_payment: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.check_out_date <= data.check_in_date:
        raise BadRequestException("Check-out must be after check-in.")

    room_repo = RoomRepository(db)
    room = await room_repo.get_by_id(data.room_id)
    if not room:
        raise NotFoundException("Room not found.")
    if room.status.value == "Maintenance":
        raise BadRequestException("Room is under maintenance and cannot be booked.")

    booking_repo = BookingRepository(db)
    conflict = await booking_repo.has_conflict(
        data.room_id, data.check_in_date, data.check_out_date
    )
    if conflict:
        raise BadRequestException("Room is not available for the selected dates.")

    nights = (data.check_out_date - data.check_in_date).days
    total_amount = float(room.room_type.base_price_per_night) * nights

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
    if confirm_without_payment:
        booking = await booking_repo.update_status(booking, BookingStatus.confirmed)
        inv_repo = InvoiceRepository(db)
        await inv_repo.create(
            InvoiceCreate(
                booking_id=booking.id,
                due_date=booking.check_in_date,
                subtotal=total_amount,
                tax_rate=0,
                items=[
                    InvoiceItemCreate(
                        description=f"Pay at Resort - {room.room_type.name} x {nights} nights",
                        quantity=nights,
                        unit_price=float(room.room_type.base_price_per_night),
                        amount=total_amount,
                    )
                ],
            ),
            guest_id,
        )
    return booking


@router.patch("/{booking_id}/status", response_model=BookingRead)
async def update_booking_status(
    booking_id: uuid.UUID,
    body: BookingStatusUpdate,
    current_user: User = require_role(STAFF_ROLES),
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

    room_repo = RoomRepository(db)
    room = await room_repo.get_by_id(booking.room_id)
    if room:
        if new_status == BookingStatus.checked_in:
            await room_repo.update(room, {"status": "Occupied"})
        elif new_status in [BookingStatus.checked_out, BookingStatus.cancelled]:
            await room_repo.update(room, {"status": "Cleaning"})

    return await repo.update_status(booking, new_status)


@router.get("/guests", response_model=List[UserRead])
async def list_guests(
    search: str = "",
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
    query = query.order_by(User.full_name).limit(50)
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: uuid.UUID,
    _: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")
    await repo.delete(booking)
