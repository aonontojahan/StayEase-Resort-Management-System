import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.bookings.models import BookingStatus
from app.bookings.repository import BookingRepository
from app.bookings.schemas import BookingCreate, BookingRead, BookingStatusUpdate
from app.core.database import get_db
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.rooms.repository import RoomRepository

router = APIRouter(prefix="/bookings", tags=["Bookings"])

STAFF_ROLES = ["Super Admin", "Resort Owner", "Manager", "Receptionist", "Accountant"]


@router.get("/", response_model=List[BookingRead])
async def list_all_bookings(
    current_user: User = require_role(STAFF_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """List all bookings — staff only."""
    repo = BookingRepository(db)
    return await repo.get_all()


@router.get("/my", response_model=List[BookingRead])
async def list_my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current guest's own bookings."""
    repo = BookingRepository(db)
    return await repo.get_by_guest(current_user.id)


@router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single booking. Guests can only view their own."""
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
    """Create a new booking. Guests book for themselves; staff can book for any guest."""
    if data.check_out_date <= data.check_in_date:
        raise BadRequestException("Check-out must be after check-in.")

    room_repo = RoomRepository(db)
    room = await room_repo.get_by_id(data.room_id)
    if not room:
        raise NotFoundException("Room not found.")
    if room.status.value == "Maintenance":
        raise BadRequestException("Room is under maintenance and cannot be booked.")

    booking_repo = BookingRepository(db)
    conflict = await booking_repo.has_conflict(data.room_id, data.check_in_date, data.check_out_date)
    if conflict:
        raise BadRequestException("Room is not available for the selected dates.")

    # Calculate total
    nights = (data.check_out_date - data.check_in_date).days
    total_amount = float(room.room_type.base_price_per_night) * nights

    # Guest books for themselves; staff creates on behalf of a guest (guest_id = current_user for simplicity)
    guest_id = current_user.id

    booking = await booking_repo.create(data, guest_id, current_user.id, total_amount)
    return booking


@router.patch("/{booking_id}/status", response_model=BookingRead)
async def update_booking_status(
    booking_id: uuid.UUID,
    body: BookingStatusUpdate,
    current_user: User = require_role(STAFF_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Update booking status (CheckIn, CheckOut, Cancel, etc.)."""
    try:
        new_status = BookingStatus(body.status)
    except ValueError:
        valid = [s.value for s in BookingStatus]
        raise BadRequestException(f"Invalid status. Valid values: {valid}")

    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    # Room status sync
    room_repo = RoomRepository(db)
    room = await room_repo.get_by_id(booking.room_id)
    if room:
        if new_status == BookingStatus.checked_in:
            await room_repo.update(room, {"status": "Occupied"})
        elif new_status in [BookingStatus.checked_out, BookingStatus.cancelled]:
            await room_repo.update(room, {"status": "Cleaning"})

    return await repo.update_status(booking, new_status)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: uuid.UUID,
    _: User = require_role(["Super Admin", "Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    """Delete a booking."""
    repo = BookingRepository(db)
    booking = await repo.get_by_id(booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")
    await repo.delete(booking)
