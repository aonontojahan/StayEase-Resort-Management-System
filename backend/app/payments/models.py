import uuid
import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import ForeignKey, String, Text, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    cash = "Cash"
    card = "Card"
    bank_transfer = "BankTransfer"
    bKash = "bKash"
    nagad = "Nagad"
    rocket = "Rocket"


class PaymentStatus(str, enum.Enum):
    completed = "Completed"
    refunded = "Refunded"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    recorded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SAEnum(PaymentMethod, name="paymentmethod"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="paymentstatus"),
        nullable=False,
        default=PaymentStatus.completed,
    )
    transaction_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_fee: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2), nullable=True, default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    booking: Mapped["Booking"] = relationship(
        "Booking", back_populates="payments", lazy="selectin"
    )
    recorded_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[recorded_by_id], lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, amount={self.amount}, method={self.payment_method})>"


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.bookings.models import Booking
    from app.auth.models import User
