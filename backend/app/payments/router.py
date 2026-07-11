import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.bookings.repository import BookingRepository
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.payments.repository import PaymentRepository
from app.payments.schemas import PaymentCreate, PaymentRead, RevenueSummary, PaymentStatusUpdate

router = APIRouter(prefix="/payments", tags=["Payments"])

FINANCE_ROLES = ["Resort Owner", "Manager", "Accountant", "Receptionist"]
REFUND_ROLES  = ["Resort Owner", "Manager", "Accountant"]


@router.get("/", response_model=List[PaymentRead])
async def list_payments(
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """List all payments."""
    repo = PaymentRepository(db)
    return await repo.get_all()


@router.get("/my", response_model=List[PaymentRead])
async def list_my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current guest's payments."""
    repo = PaymentRepository(db)
    return await repo.get_by_guest(current_user.id)


@router.get("/summary", response_model=RevenueSummary)
async def revenue_summary(
    _: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated revenue summary."""
    repo = PaymentRepository(db)
    return await repo.get_revenue_summary()


@router.get("/booking/{booking_id}", response_model=List[PaymentRead])
async def payments_for_booking(
    booking_id: uuid.UUID,
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Get payments for a specific booking."""
    repo = PaymentRepository(db)
    return await repo.get_by_booking(booking_id)


@router.post("/", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
async def record_payment(
    data: PaymentCreate,
    current_user: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Record a new payment."""
    # Verify booking exists
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(data.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    repo = PaymentRepository(db)
    return await repo.create(data, current_user.id)


@router.patch("/{payment_id}/refund", response_model=PaymentRead)
async def refund_payment(
    payment_id: uuid.UUID,
    _: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Mark a payment as refunded. Only Resort Owner, Manager, or Accountant can do this."""
    repo = PaymentRepository(db)
    payment = await repo.get_by_id(payment_id)
    if not payment:
        raise NotFoundException("Payment not found.")
    if payment.status != "Completed":
        raise BadRequestException("Only completed payments can be refunded.")
    updated = await repo.refund_payment(payment_id)
    return updated
