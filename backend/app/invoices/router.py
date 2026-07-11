import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.bookings.repository import BookingRepository
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.pagination import PaginationParams
from app.invoices.models import InvoiceStatus
from app.invoices.repository import InvoiceRepository
from app.invoices.schemas import (
    InvoiceCreate,
    InvoiceItemCreate,
    InvoiceRead,
    InvoiceStatusUpdate,
    InvoiceSummary,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])

FINANCE_ROLES = ["Resort Owner", "Manager", "Accountant"]


@router.get("/", response_model=List[InvoiceRead])
async def list_invoices(
    pagination: PaginationParams = Depends(),
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = InvoiceRepository(db)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await repo.count_all()
    return JSONResponse(
        content=jsonable_encoder([InvoiceRead.model_validate(i) for i in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/summary", response_model=InvoiceSummary)
async def invoice_summary(
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = InvoiceRepository(db)
    summary = await repo.get_summary()
    return InvoiceSummary(**summary)


@router.get("/my", response_model=List[InvoiceRead])
async def list_my_invoices(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = InvoiceRepository(db)
    items = await repo.get_by_guest(
        current_user.id, skip=pagination.skip, limit=pagination.limit
    )
    total = await repo.count_by_guest(current_user.id)
    return JSONResponse(
        content=jsonable_encoder([InvoiceRead.model_validate(i) for i in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_by_id(invoice_id)
    if not invoice:
        raise NotFoundException("Invoice not found.")
    if current_user.role.name == "Guest" and invoice.guest_id != current_user.id:
        raise BadRequestException("You can only view your own invoices.")
    return invoice


@router.post("/", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(data.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    invoice_repo = InvoiceRepository(db)
    invoice = await invoice_repo.create(data, booking.guest_id)
    return invoice


@router.patch("/{invoice_id}/status", response_model=InvoiceRead)
async def update_invoice_status(
    invoice_id: uuid.UUID,
    body: InvoiceStatusUpdate,
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    try:
        new_status = InvoiceStatus(body.status)
    except ValueError:
        valid = [s.value for s in InvoiceStatus]
        raise BadRequestException(f"Invalid status. Valid values: {valid}")

    repo = InvoiceRepository(db)
    invoice = await repo.get_by_id(invoice_id)
    if not invoice:
        raise NotFoundException("Invoice not found.")
    return await repo.update_status(invoice, new_status)
