import uuid
from datetime import date
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.bookings.models import Booking, BookingStatus
from app.bookings.schemas import BookingCreate
from app.rooms.models import Room


class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> Sequence[Booking]:
        result = await self.db.execute(
            select(Booking)
            .options(
                selectinload(Booking.guest),
                selectinload(Booking.room).selectinload(Room.room_type),
                selectinload(Booking.created_by),
            )
            .order_by(Booking.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_id(self, booking_id: uuid.UUID) -> Optional[Booking]:
        result = await self.db.execute(
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.guest),
                selectinload(Booking.room).selectinload(Room.room_type),
                selectinload(Booking.created_by),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_guest(self, guest_id: uuid.UUID) -> Sequence[Booking]:
        result = await self.db.execute(
            select(Booking)
            .where(Booking.guest_id == guest_id)
            .options(
                selectinload(Booking.guest),
                selectinload(Booking.room).selectinload(Room.room_type),
            )
            .order_by(Booking.created_at.desc())
        )
        return result.scalars().all()

    async def has_conflict(self, room_id: uuid.UUID, check_in: date, check_out: date, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Return True if there's an overlapping active booking for the room."""
        query = (
            select(Booking)
            .where(
                Booking.room_id == room_id,
                Booking.status.in_([BookingStatus.confirmed, BookingStatus.checked_in]),
                Booking.check_in_date < check_out,
                Booking.check_out_date > check_in,
            )
        )
        if exclude_id:
            query = query.where(Booking.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def create(self, data: BookingCreate, guest_id: uuid.UUID, created_by_id: uuid.UUID, total_amount: float) -> Booking:
        booking = Booking(
            guest_id=guest_id,
            created_by_id=created_by_id,
            room_id=data.room_id,
            check_in_date=data.check_in_date,
            check_out_date=data.check_out_date,
            num_guests=data.num_guests,
            special_requests=data.special_requests,
            total_amount=total_amount,
            status=BookingStatus.confirmed,
        )
        self.db.add(booking)
        await self.db.flush()
        return await self.get_by_id(booking.id)

    async def update_status(self, booking: Booking, new_status: BookingStatus) -> Booking:
        booking.status = new_status
        self.db.add(booking)
        await self.db.flush()
        return await self.get_by_id(booking.id)

    async def delete(self, booking: Booking) -> None:
        await self.db.delete(booking)
        await self.db.flush()
