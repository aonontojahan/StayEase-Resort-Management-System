import uuid
from datetime import date
from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.rooms.models import Room, RoomType
from app.rooms.schemas import RoomCreate, RoomUpdate, RoomTypeCreate


class RoomTypeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> Sequence[RoomType]:
        result = await self.db.execute(select(RoomType))
        return result.scalars().all()

    async def get_by_id(self, room_type_id: uuid.UUID) -> Optional[RoomType]:
        result = await self.db.execute(
            select(RoomType).where(RoomType.id == room_type_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[RoomType]:
        result = await self.db.execute(select(RoomType).where(RoomType.name == name))
        return result.scalar_one_or_none()

    async def create(self, data: RoomTypeCreate) -> RoomType:
        rt = RoomType(**data.model_dump())
        self.db.add(rt)
        await self.db.flush()
        await self.db.refresh(rt)
        return rt

    async def update(self, rt: RoomType, data: dict) -> RoomType:
        for k, v in data.items():
            setattr(rt, k, v)
        self.db.add(rt)
        await self.db.flush()
        await self.db.refresh(rt)
        return rt

    async def delete(self, rt: RoomType) -> None:
        await self.db.delete(rt)
        await self.db.flush()


class RoomRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[Room]:
        result = await self.db.execute(
            select(Room)
            .options(selectinload(Room.room_type))
            .order_by(Room.room_number)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_all(self) -> int:
        result = await self.db.execute(select(func.count(Room.id)))
        return int(result.scalar() or 0)

    async def get_by_id(self, room_id: uuid.UUID) -> Optional[Room]:
        result = await self.db.execute(
            select(Room).where(Room.id == room_id).options(selectinload(Room.room_type))
        )
        return result.scalar_one_or_none()

    async def get_by_number(self, room_number: str) -> Optional[Room]:
        result = await self.db.execute(
            select(Room).where(Room.room_number == room_number)
        )
        return result.scalar_one_or_none()

    async def get_available(self, check_in: date, check_out: date) -> Sequence[Room]:
        from app.bookings.models import BookingRoom, BookingStatus

        booked_subq = select(BookingRoom.room_id).where(
            BookingRoom.status.in_([BookingStatus.confirmed, BookingStatus.checked_in]),
            BookingRoom.check_in_date < check_out,
            BookingRoom.check_out_date > check_in,
        )
        result = await self.db.execute(
            select(Room)
            .options(selectinload(Room.room_type))
            .where(
                Room.id.notin_(booked_subq),
                Room.status.in_(["Available", "Cleaning"]),
            )
            .order_by(Room.room_number)
        )
        return result.scalars().all()

    async def create(self, data: RoomCreate) -> Room:
        room = Room(**data.model_dump())
        self.db.add(room)
        await self.db.flush()
        await self.db.refresh(room)
        return room

    async def update(self, room: Room, data: dict) -> Room:
        for k, v in data.items():
            setattr(room, k, v)
        self.db.add(room)
        await self.db.flush()
        await self.db.refresh(room)
        return room

    async def delete(self, room: Room) -> None:
        await self.db.delete(room)
        await self.db.flush()
