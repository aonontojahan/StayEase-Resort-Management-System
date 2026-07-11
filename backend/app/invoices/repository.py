import uuid
from datetime import date, datetime, timezone
from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.invoices.models import Invoice, InvoiceItem, InvoiceStatus
from app.invoices.schemas import InvoiceCreate


class InvoiceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _generate_number(self) -> str:
        today = date.today()
        prefix = f"INV-{today.year}-{today.month:02d}"
        result = await self.db.execute(
            select(func.count(Invoice.id)).where(
                Invoice.invoice_number.like(f"{prefix}%")
            )
        )
        count = int(result.scalar() or 0) + 1
        return f"{prefix}-{count:05d}"

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.booking),
                selectinload(Invoice.guest),
            )
            .order_by(Invoice.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_all(self) -> int:
        result = await self.db.execute(select(func.count(Invoice.id)))
        return int(result.scalar() or 0)

    async def get_by_id(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .where(Invoice.id == invoice_id)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.booking),
                selectinload(Invoice.guest),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_booking(self, booking_id: uuid.UUID) -> Sequence[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .where(Invoice.booking_id == booking_id)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.booking),
                selectinload(Invoice.guest),
            )
            .order_by(Invoice.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_guest(
        self, guest_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> Sequence[Invoice]:
        result = await self.db.execute(
            select(Invoice)
            .where(Invoice.guest_id == guest_id)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.booking),
                selectinload(Invoice.guest),
            )
            .order_by(Invoice.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_by_guest(self, guest_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(Invoice.id)).where(Invoice.guest_id == guest_id)
        )
        return int(result.scalar() or 0)

    async def create(self, data: InvoiceCreate, guest_id: uuid.UUID) -> Invoice:
        tax_amount = round(data.subtotal * data.tax_rate / 100, 2)
        total_amount = round(data.subtotal + tax_amount, 2)

        invoice = Invoice(
            invoice_number=await self._generate_number(),
            booking_id=data.booking_id,
            guest_id=guest_id,
            issue_date=data.issue_date or date.today(),
            due_date=data.due_date,
            subtotal=data.subtotal,
            tax_rate=data.tax_rate,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status=InvoiceStatus.draft,
            notes=data.notes,
        )
        self.db.add(invoice)
        await self.db.flush()

        for item_data in data.items:
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                amount=item_data.amount,
            )
            self.db.add(item)

        await self.db.flush()
        return await self.get_by_id(invoice.id)

    async def update_status(
        self, invoice: Invoice, new_status: InvoiceStatus
    ) -> Invoice:
        invoice.status = new_status
        self.db.add(invoice)
        await self.db.flush()
        return await self.get_by_id(invoice.id)

    async def get_summary(self) -> dict:
        total_result = await self.db.execute(
            select(
                func.count(Invoice.id),
                func.sum(Invoice.total_amount).filter(
                    Invoice.status == InvoiceStatus.paid
                ),
                func.sum(Invoice.total_amount).filter(
                    Invoice.status.in_([InvoiceStatus.issued, InvoiceStatus.draft])
                ),
                func.sum(Invoice.total_amount).filter(
                    Invoice.status == InvoiceStatus.cancelled
                ),
                func.count(Invoice.id).filter(Invoice.status == InvoiceStatus.paid),
                func.count(Invoice.id).filter(
                    Invoice.status.in_([InvoiceStatus.issued, InvoiceStatus.draft])
                ),
            )
        )
        row = total_result.one()
        return {
            "total_invoices": int(row[0] or 0),
            "total_paid": float(row[1] or 0),
            "total_unpaid": float(row[2] or 0),
            "total_cancelled": float(row[3] or 0),
            "paid_count": int(row[4] or 0),
            "unpaid_count": int(row[5] or 0),
        }
