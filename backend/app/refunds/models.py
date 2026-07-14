import uuid
import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import ForeignKey, String, Text, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.core.database import Base


class RefundStatus(str, enum.Enum):
    pending = "Pending"
    completed = "Completed"
    failed = "Failed"


class RefundMethod(str, enum.Enum):
    stripe = "Stripe"
    cash = "Cash"
    bank_transfer = "BankTransfer"
    bKash = "bKash"
    nagad = "Nagad"
    rocket = "Rocket"


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False
    )
    initiated_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cancellation_fee: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2), nullable=True, default=0
    )
    refund_method: Mapped[Optional[RefundMethod]] = mapped_column(
        SAEnum(RefundMethod, name="refundmethod"), nullable=True
    )
    status: Mapped[RefundStatus] = mapped_column(
        SAEnum(RefundStatus, name="refundstatus"),
        nullable=False,
        default=RefundStatus.pending,
    )
    transaction_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    payment: Mapped["Payment"] = relationship("Payment", lazy="selectin")
    booking: Mapped["Booking"] = relationship("Booking", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Refund(id={self.id}, amount={self.amount}, status={self.status})>"


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.bookings.models import Booking
    from app.payments.models import Payment
