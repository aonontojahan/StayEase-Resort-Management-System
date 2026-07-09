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
from app.payments.schemas import PaymentCreate, PaymentRead, RevenueSummary

router = APIRouter(prefix="/payments", tags=["Payments"])

FINANCE_ROLES = ["Super Admin", "Resort Owner", "Manager", "Accountant", "Receptionist"]


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
    _: User = require_role(["Super Admin", "Resort Owner", "Manager", "Accountant"]),
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
