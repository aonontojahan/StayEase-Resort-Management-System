import uuid
import enum
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Text, Date, DateTime, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.core.database import Base


class BookingStatus(str, enum.Enum):
    pending = "Pending"
    confirmed = "Confirmed"
    checked_in = "CheckedIn"
    checked_out = "CheckedOut"
    cancelled = "Cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    guest_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False
    )
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    check_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    check_out_date: Mapped[date] = mapped_column(Date, nullable=False)
    num_guests: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="bookingstatus"),
        nullable=False,
        default=BookingStatus.pending,
    )
    special_requests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    guest: Mapped["User"] = relationship(
        "User", foreign_keys=[guest_id], lazy="selectin"
    )
    created_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by_id], lazy="selectin"
    )
    room: Mapped["Room"] = relationship(
        "Room", back_populates="bookings", lazy="selectin"
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="booking"
    )
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice", back_populates="booking"
    )

    @property
    def paid_amount(self) -> float:
        if not self.payments:
            return 0.0
        return sum(float(p.amount) for p in self.payments if p.status == "Completed")

    def __repr__(self) -> str:
        return f"<Booking(id={self.id}, guest={self.guest_id}, room={self.room_id}, status={self.status})>"


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.auth.models import User
    from app.rooms.models import Room
    from app.payments.models import Payment
    from app.invoices.models import Invoice
