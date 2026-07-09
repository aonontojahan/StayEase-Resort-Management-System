import uuid
import enum
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Column, ForeignKey, String, Table, DateTime, Boolean, Numeric, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.core.database import Base


class RoomStatus(str, enum.Enum):
    available = "Available"
    occupied = "Occupied"
    maintenance = "Maintenance"
    cleaning = "Cleaning"


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    base_price_per_night: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    max_occupancy: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    amenities: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    image_urls: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)

    # Relationships
    rooms: Mapped[List["Room"]] = relationship("Room", back_populates="room_type")

    def __repr__(self) -> str:
        return f"<RoomType(name={self.name}, price={self.base_price_per_night})>"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_number: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    floor: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[RoomStatus] = mapped_column(SAEnum(RoomStatus, name="roomstatus"), nullable=False, default=RoomStatus.available)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    room_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room_types.id", ondelete="RESTRICT"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    room_type: Mapped[RoomType] = relationship("RoomType", back_populates="rooms", lazy="selectin")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="room")
    housekeeping_tasks: Mapped[List["HousekeepingTask"]] = relationship("HousekeepingTask", back_populates="room")

    def __repr__(self) -> str:
        return f"<Room(number={self.room_number}, status={self.status})>"


# Avoid circular imports by importing Booking/HousekeepingTask lazily
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.bookings.models import Booking
    from app.housekeeping.models import HousekeepingTask
