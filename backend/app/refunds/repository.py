import uuid
from datetime import datetime, timezone
from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.refunds.models import Refund, RefundStatus, RefundMethod


class RefundRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[Refund]:
        result = await self.db.execute(
            select(Refund)
            .options(selectinload(Refund.payment), selectinload(Refund.booking))
            .order_by(Refund.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_all(self) -> int:
        result = await self.db.execute(select(func.count(Refund.id)))
        return int(result.scalar() or 0)

    async def get_by_id(self, refund_id: uuid.UUID) -> Optional[Refund]:
        result = await self.db.execute(
            select(Refund)
            .where(Refund.id == refund_id)
            .options(selectinload(Refund.payment), selectinload(Refund.booking))
        )
        return result.scalar_one_or_none()

    async def get_by_payment(self, payment_id: uuid.UUID) -> Sequence[Refund]:
        result = await self.db.execute(
            select(Refund)
            .where(Refund.payment_id == payment_id)
            .options(selectinload(Refund.payment), selectinload(Refund.booking))
            .order_by(Refund.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_booking(self, booking_id: uuid.UUID) -> Sequence[Refund]:
        result = await self.db.execute(
            select(Refund)
            .where(Refund.booking_id == booking_id)
            .options(selectinload(Refund.payment))
            .order_by(Refund.created_at.desc())
        )
        return result.scalars().all()

    async def create(
        self,
        payment_id: uuid.UUID,
        booking_id: uuid.UUID,
        amount: float,
        cancellation_fee: float,
        refund_method: str,
        initiated_by_id: uuid.UUID,
        status: RefundStatus = RefundStatus.pending,
        notes: Optional[str] = None,
    ) -> Refund:
        refund = Refund(
            payment_id=payment_id,
            booking_id=booking_id,
            amount=amount,
            cancellation_fee=cancellation_fee,
            refund_method=RefundMethod(refund_method) if refund_method else None,
            status=status,
            initiated_by_id=initiated_by_id,
            notes=notes,
        )
        if status == RefundStatus.completed:
            refund.completed_at = datetime.now(timezone.utc)
        self.db.add(refund)
        await self.db.flush()
        return await self.get_by_id(refund.id)

    async def complete(
        self,
        refund_id: uuid.UUID,
        transaction_ref: str,
        notes: Optional[str] = None,
    ) -> Optional[Refund]:
        refund = await self.get_by_id(refund_id)
        if not refund:
            return None
        refund.status = RefundStatus.completed
        refund.transaction_ref = transaction_ref
        refund.completed_at = datetime.now(timezone.utc)
        if notes:
            refund.notes = notes
        self.db.add(refund)
        await self.db.flush()
        return await self.get_by_id(refund_id)

    async def mark_failed(self, refund_id: uuid.UUID, error: str) -> Optional[Refund]:
        refund = await self.get_by_id(refund_id)
        if not refund:
            return None
        refund.status = RefundStatus.failed
        refund.notes = (refund.notes or "") + f" | Failed: {error}"
        self.db.add(refund)
        await self.db.flush()
        return await self.get_by_id(refund_id)

    async def get_summary_stats(self) -> dict:
        pending_result = await self.db.execute(
            select(func.count(Refund.id)).where(Refund.status == RefundStatus.pending)
        )
        pending_count = int(pending_result.scalar() or 0)

        total_refunded_result = await self.db.execute(
            select(func.sum(Refund.amount)).where(
                Refund.status == RefundStatus.completed
            )
        )
        total_refunded = float(total_refunded_result.scalar() or 0)

        fees_result = await self.db.execute(
            select(func.sum(Refund.cancellation_fee)).where(
                Refund.status == RefundStatus.completed
            )
        )
        total_fees = float(fees_result.scalar() or 0)

        return {
            "pending_count": pending_count,
            "total_refunded": total_refunded,
            "total_cancellation_fees": total_fees,
        }
