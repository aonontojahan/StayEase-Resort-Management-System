import asyncio
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.bookings.repository import BookingRepository
from app.bookings.models import BookingStatus
from app.rooms.repository import RoomRepository
from app.core.database import get_db
from app.core.email import send_html_email, get_booking_confirmation_html
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.pagination import PaginationParams
from app.invoices.schemas import InvoiceCreate, InvoiceItemCreate
from app.invoices.models import InvoiceStatus
from app.invoices.repository import InvoiceRepository
from app.payments.repository import PaymentRepository
from app.payments.schemas import (
    CardPayment,
    MobileBankingPayment,
    PaymentCreate,
    PaymentRead,
    RevenueSummary,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

FINANCE_ROLES = ["Resort Owner", "Manager", "Accountant", "Receptionist"]
REFUND_ROLES = ["Resort Owner", "Manager", "Accountant"]


@router.get("/", response_model=List[PaymentRead])
async def list_payments(
    pagination: PaginationParams = Depends(),
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    max_limit = 1000
    safe_limit = min(pagination.limit, max_limit)
    repo = PaymentRepository(db)
    items = await repo.get_all(skip=pagination.skip, limit=safe_limit)
    total = await repo.count_all()
    return JSONResponse(
        content=jsonable_encoder([PaymentRead.model_validate(p) for p in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/my", response_model=List[PaymentRead])
async def list_my_payments(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentRepository(db)
    items = await repo.get_by_guest(
        current_user.id, skip=pagination.skip, limit=pagination.limit
    )
    total = await repo.count_by_guest(current_user.id)
    return JSONResponse(
        content=jsonable_encoder([PaymentRead.model_validate(p) for p in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/summary", response_model=RevenueSummary)
async def revenue_summary(
    _: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentRepository(db)
    return await repo.get_revenue_summary()


@router.get("/booking/{booking_id}", response_model=List[PaymentRead])
async def payments_for_booking(
    booking_id: uuid.UUID,
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentRepository(db)
    return await repo.get_by_booking(booking_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def record_payment(
    data: PaymentCreate,
    current_user: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(data.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    if booking.status in (BookingStatus.cancelled, BookingStatus.checked_out):
        raise BadRequestException(
            f"Cannot record payment for a {booking.status.value} booking."
        )

    remaining = float(booking.total_amount) - float(booking.paid_amount)
    if data.amount > remaining + 0.01:
        raise BadRequestException(
            f"Amount ({data.amount}) exceeds remaining balance ({remaining:.2f})."
        )

    repo = PaymentRepository(db)
    payment = await repo.create(data, current_user.id)

    if booking.status == BookingStatus.pending:
        room_ids = [br.room_id for br in booking.booking_rooms]
        await booking_repo.update_status(booking, BookingStatus.confirmed)
        room_repo = RoomRepository(db)
        for rid in room_ids:
            room = await room_repo.get_by_id(rid)
            if room:
                await room_repo.update(room, {"status": "Occupied"})

    await db.refresh(booking, ["payments"])

    try:
        from app.ws.manager import manager
        await manager.broadcast({"type": "dashboard_update"})
    except Exception:
        logger.warning("WebSocket broadcast failed")

    desc = f"Full Payment - {booking.id}"
    inv_data = InvoiceCreate(
        booking_id=booking.id,
        due_date=booking.booking_rooms[0].check_in_date
        if booking.booking_rooms
        else booking.created_at.date(),
        subtotal=payment.amount,
        tax_rate=0,
        items=[
            InvoiceItemCreate(
                description=desc,
                quantity=1,
                unit_price=payment.amount,
                amount=payment.amount,
            )
        ],
    )
    invoice_repo = InvoiceRepository(db)
    invoice = await invoice_repo.create(inv_data, booking.guest_id)
    invoice = await invoice_repo.update_status(invoice, InvoiceStatus.paid)

    return {
        "payment": PaymentRead.model_validate(payment).model_dump(),
        "invoice_id": str(invoice.id),
    }


@router.patch("/{payment_id}/refund", response_model=PaymentRead)
async def refund_payment(
    payment_id: uuid.UUID,
    _: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentRepository(db)
    payment = await repo.get_by_id(payment_id)
    if not payment:
        raise NotFoundException("Payment not found.")
    if payment.status != "Completed":
        raise BadRequestException("Only completed payments can be refunded.")
    updated = await repo.refund_payment(payment_id)
    return updated


@router.post("/mobile-banking")
async def pay_via_mobile_banking(
    body: MobileBankingPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(body.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    if current_user.role.name == "Guest" and booking.guest_id != current_user.id:
        raise BadRequestException("You can only pay for your own bookings.")

    remaining = float(booking.total_amount) - float(booking.paid_amount)
    if remaining <= 0:
        raise BadRequestException("Booking is already fully paid.")

    if body.amount > remaining + 0.01:
        raise BadRequestException(
            f"Amount ({body.amount}) exceeds remaining balance ({remaining:.2f}). "
            f"Please enter an amount up to TK {remaining:.2f}."
        )
    capped = body.amount

    payment_data = PaymentCreate(
        booking_id=booking.id,
        amount=capped,
        payment_method=body.payment_method,
        transaction_ref=body.transaction_ref,
        notes=f"{body.payment_method} payment via {body.sender_phone} (full)",
    )
    payment_repo = PaymentRepository(db)
    payment = await payment_repo.create(payment_data, current_user.id)

    if booking.status == BookingStatus.pending:
        room_ids = [br.room_id for br in booking.booking_rooms]
        await booking_repo.update_status(booking, BookingStatus.confirmed)
        room_repo = RoomRepository(db)
        for rid in room_ids:
            room = await room_repo.get_by_id(rid)
            if room:
                await room_repo.update(room, {"status": "Occupied"})

    await db.refresh(booking, ["payments"])

    booking_total = float(booking.total_amount)

    desc = f"Full Payment via {body.payment_method}"
    inv_data = InvoiceCreate(
        booking_id=booking.id,
        due_date=booking.booking_rooms[0].check_in_date
        if booking.booking_rooms
        else booking.created_at.date(),
        subtotal=capped,
        tax_rate=0,
        items=[
            InvoiceItemCreate(
                description=desc,
                quantity=1,
                unit_price=capped,
                amount=capped,
            )
        ],
    )
    invoice_repo = InvoiceRepository(db)
    invoice = await invoice_repo.create(inv_data, booking.guest_id)
    invoice = await invoice_repo.update_status(invoice, InvoiceStatus.paid)

    new_paid = float(booking.paid_amount)
    new_remaining = booking_total - new_paid

    email_html = get_booking_confirmation_html(
        guest_name=booking.guest.full_name,
        room_name=", ".join([br.room.room_type.name for br in booking.booking_rooms]),
        room_number=", ".join([br.room.room_number for br in booking.booking_rooms]),
        check_in=str(booking.booking_rooms[0].check_in_date)
        if booking.booking_rooms
        else "",
        check_out=str(booking.booking_rooms[0].check_out_date)
        if booking.booking_rooms
        else "",
        nights=max(
            (br.check_out_date - br.check_in_date).days for br in booking.booking_rooms
        )
        if booking.booking_rooms
        else 1,
        total_amount=booking_total,
        amount_paid=new_paid,
        remaining_balance=new_remaining,
        payment_status="Fully Settled",
        booking_id=str(booking.id),
    )
    await asyncio.to_thread(
        send_html_email,
        to_email=booking.guest.email,
        subject=f"StayEase Resort - Booking Confirmation #{booking.id}",
        html_content=email_html,
        text_content=f"Your booking at StayEase Resort has been confirmed! Booking ID: {booking.id}. Total: TK {booking_total:.2f}. Paid: TK {new_paid:.2f}.",
    )

    try:
        from app.ws.manager import manager
        await manager.broadcast({"type": "dashboard_update"})
    except Exception:
        logger.warning("WebSocket broadcast failed")

    return {
        "payment": PaymentRead.model_validate(payment).model_dump(),
        "invoice_id": str(invoice.id),
    }


@router.post("/card")
async def pay_via_card(
    body: CardPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(body.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    if current_user.role.name == "Guest" and booking.guest_id != current_user.id:
        raise BadRequestException("You can only pay for your own bookings.")

    remaining = float(booking.total_amount) - float(booking.paid_amount)
    if remaining <= 0:
        raise BadRequestException("Booking is already fully paid.")

    if body.amount > remaining + 0.01:
        raise BadRequestException(
            f"Amount ({body.amount}) exceeds remaining balance ({remaining:.2f}). "
            f"Please enter an amount up to TK {remaining:.2f}."
        )

    payment_data = PaymentCreate(
        booking_id=booking.id,
        amount=body.amount,
        payment_method="Card",
        transaction_ref=f"CARD-{body.card_number[-4:]}-{uuid.uuid4().hex[:8].upper()}",
        notes=f"Card payment by {body.card_holder_name} (****{body.card_number[-4:]})",
    )
    payment_repo = PaymentRepository(db)
    payment = await payment_repo.create(payment_data, current_user.id)

    if booking.status == BookingStatus.pending:
        room_ids = [br.room_id for br in booking.booking_rooms]
        await booking_repo.update_status(booking, BookingStatus.confirmed)
        room_repo = RoomRepository(db)
        for rid in room_ids:
            room = await room_repo.get_by_id(rid)
            if room:
                await room_repo.update(room, {"status": "Occupied"})

    await db.refresh(booking, ["payments"])

    booking_total = float(booking.total_amount)

    desc = "Full Payment via Card"
    inv_data = InvoiceCreate(
        booking_id=booking.id,
        due_date=booking.booking_rooms[0].check_in_date
        if booking.booking_rooms
        else booking.created_at.date(),
        subtotal=body.amount,
        tax_rate=0,
        items=[
            InvoiceItemCreate(
                description=desc,
                quantity=1,
                unit_price=body.amount,
                amount=body.amount,
            )
        ],
    )
    invoice_repo = InvoiceRepository(db)
    invoice = await invoice_repo.create(inv_data, booking.guest_id)
    invoice = await invoice_repo.update_status(invoice, InvoiceStatus.paid)

    new_paid = float(booking.paid_amount)
    new_remaining = booking_total - new_paid

    email_html = get_booking_confirmation_html(
        guest_name=booking.guest.full_name,
        room_name=", ".join([br.room.room_type.name for br in booking.booking_rooms]),
        room_number=", ".join([br.room.room_number for br in booking.booking_rooms]),
        check_in=str(booking.booking_rooms[0].check_in_date)
        if booking.booking_rooms
        else "",
        check_out=str(booking.booking_rooms[0].check_out_date)
        if booking.booking_rooms
        else "",
        nights=max(
            (br.check_out_date - br.check_in_date).days for br in booking.booking_rooms
        )
        if booking.booking_rooms
        else 1,
        total_amount=booking_total,
        amount_paid=new_paid,
        remaining_balance=new_remaining,
        payment_status="Fully Settled",
        booking_id=str(booking.id),
    )
    await asyncio.to_thread(
        send_html_email,
        to_email=booking.guest.email,
        subject=f"StayEase Resort - Booking Confirmation #{booking.id}",
        html_content=email_html,
        text_content=f"Your booking at StayEase Resort has been confirmed! Booking ID: {booking.id}. Total: TK {booking_total:.2f}. Paid: TK {new_paid:.2f}.",
    )

    try:
        from app.ws.manager import manager
        await manager.broadcast({"type": "dashboard_update"})
    except Exception:
        logger.warning("WebSocket broadcast failed")

    return {
        "payment": PaymentRead.model_validate(payment).model_dump(),
        "invoice_id": str(invoice.id),
    }
