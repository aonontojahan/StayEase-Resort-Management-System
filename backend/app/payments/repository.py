import uuid
from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.payments.models import Payment, PaymentMethod, PaymentStatus
from app.payments.schemas import PaymentCreate, RevenueSummary
from app.bookings.models import Booking


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> Sequence[Payment]:
        result = await self.db.execute(
            select(Payment)
            .options(
                selectinload(Payment.booking),
                selectinload(Payment.recorded_by),
            )
            .order_by(Payment.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_booking(self, booking_id: uuid.UUID) -> Sequence[Payment]:
        result = await self.db.execute(
            select(Payment)
            .where(Payment.booking_id == booking_id)
            .options(
                selectinload(Payment.booking),
                selectinload(Payment.recorded_by),
            )
            .order_by(Payment.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_guest(self, guest_id: uuid.UUID) -> Sequence[Payment]:
        result = await self.db.execute(
            select(Payment)
            .join(Booking, Payment.booking_id == Booking.id)
            .where(Booking.guest_id == guest_id)
            .options(
                selectinload(Payment.booking),
                selectinload(Payment.recorded_by),
            )
            .order_by(Payment.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_id(self, payment_id: uuid.UUID) -> Optional[Payment]:
        result = await self.db.execute(
            select(Payment)
            .where(Payment.id == payment_id)
            .options(
                selectinload(Payment.booking),
                selectinload(Payment.recorded_by),
            )
        )
        return result.scalar_one_or_none()

    async def create(self, data: PaymentCreate, recorded_by_id: uuid.UUID) -> Payment:
        payment = Payment(
            booking_id=data.booking_id,
            recorded_by_id=recorded_by_id,
            amount=data.amount,
            payment_method=PaymentMethod(data.payment_method),
            transaction_ref=data.transaction_ref,
            notes=data.notes,
            status=PaymentStatus.completed,
        )
        self.db.add(payment)
        await self.db.flush()
        return await self.get_by_id(payment.id)

    async def get_revenue_summary(self) -> RevenueSummary:
        total_result = await self.db.execute(
            select(func.sum(Payment.amount), func.count(Payment.id))
            .where(Payment.status == PaymentStatus.completed)
        )
        total_row = total_result.one()
        completed = float(total_row[0] or 0)
        total_count = int(total_row[1] or 0)

        refund_result = await self.db.execute(
            select(func.sum(Payment.amount))
            .where(Payment.status == PaymentStatus.refunded)
        )
        refunded = float(refund_result.scalar() or 0)

        return RevenueSummary(
            total_revenue=completed - refunded,
            total_payments=total_count,
            completed_payments=completed,
            refunded_payments=refunded,
        )

    async def refund_payment(self, payment_id: uuid.UUID) -> Optional[Payment]:
        payment = await self.get_by_id(payment_id)
        if not payment:
            return None
        payment.status = PaymentStatus.refunded
        await self.db.flush()
        return await self.get_by_id(payment_id)
