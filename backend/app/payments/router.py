import asyncio
import uuid
import stripe
from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.bookings.repository import BookingRepository
from app.bookings.models import BookingStatus
from app.core.database import get_db
from app.core.config import settings
from app.core.email import send_html_email, get_booking_confirmation_html
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.pagination import PaginationParams
from app.invoices.schemas import InvoiceCreate, InvoiceItemCreate
from app.invoices.repository import InvoiceRepository
from app.payments.repository import PaymentRepository
from app.payments.schemas import (
    MobileBankingPayment,
    PaymentCreate,
    PaymentRead,
    RevenueSummary,
    StripeIntentCreate,
    StripePaymentConfirm,
)


router = APIRouter(prefix="/payments", tags=["Payments"])

FINANCE_ROLES = ["Resort Owner", "Manager", "Accountant", "Receptionist"]
REFUND_ROLES = ["Resort Owner", "Manager", "Accountant"]


@router.get("/", response_model=List[PaymentRead])
async def list_payments(
    pagination: PaginationParams = Depends(),
    _: User = require_role(FINANCE_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = PaymentRepository(db)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
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

    repo = PaymentRepository(db)
    payment = await repo.create(data, current_user.id)

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


@router.post("/stripe/create-intent")
async def create_stripe_intent(
    body: StripeIntentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(body.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    if current_user.role.name == "Guest" and booking.guest_id != current_user.id:
        raise BadRequestException("You can only pay for your own bookings.")

    remaining_balance = float(booking.total_amount) - float(booking.paid_amount)
    if remaining_balance <= 0:
        raise BadRequestException("Booking is already fully paid.")

    amount = remaining_balance

    if amount <= 0:
        raise BadRequestException("Payment amount must be greater than zero.")

    if settings.STRIPE_SECRET_KEY:
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),
                currency="usd",
                metadata={
                    "booking_id": str(booking.id),
                    "guest_id": str(booking.guest_id),
                },
            )
            return {
                "client_secret": intent.client_secret,
                "amount": amount,
                "currency": "USD",
                "payment_intent_id": intent.id,
                "is_mock": False,
            }
        except Exception as e:
            raise BadRequestException(f"Stripe PaymentIntent creation failed: {str(e)}")
    else:
        mock_id = f"pi_mock_{uuid.uuid4().hex[:12]}"
        return {
            "client_secret": f"mock_secret_{booking.id}_{int(amount)}_{uuid.uuid4().hex[:6]}",
            "amount": amount,
            "currency": "BDT",
            "payment_intent_id": mock_id,
            "is_mock": True,
        }


@router.post("/stripe/confirm")
async def confirm_stripe_payment(
    body: StripePaymentConfirm,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(body.booking_id)
    if not booking:
        raise NotFoundException("Booking not found.")

    if current_user.role.name == "Guest" and booking.guest_id != current_user.id:
        raise BadRequestException(
            "You can only confirm payments for your own bookings."
        )

    payment_repo = PaymentRepository(db)
    existing_payments = await payment_repo.get_by_booking(booking.id)
    for p in existing_payments:
        if p.transaction_ref == body.payment_intent_id:
            return {"payment": PaymentRead.model_validate(p).model_dump()}

    remaining_balance = float(booking.total_amount) - float(booking.paid_amount)
    if remaining_balance <= 0:
        raise BadRequestException("Booking is already fully paid.")

    amount = remaining_balance

    is_mock = body.payment_intent_id.startswith("pi_mock_")
    if settings.STRIPE_SECRET_KEY and not is_mock:
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            intent = stripe.PaymentIntent.retrieve(body.payment_intent_id)
            if intent.status != "succeeded":
                raise BadRequestException(
                    f"Stripe payment was not successful: status is {intent.status}"
                )
            stripe_amount = intent.amount / 100.0
            if abs(stripe_amount - amount) > 0.1:
                amount = stripe_amount
        except Exception as e:
            raise BadRequestException(f"Failed to verify payment with Stripe: {str(e)}")

    payment_data = PaymentCreate(
        booking_id=booking.id,
        amount=amount,
        payment_method="Card",
        transaction_ref=body.payment_intent_id,
        notes="Stripe payment (full).",
    )
    payment = await payment_repo.create(payment_data, current_user.id)

    if booking.status == BookingStatus.pending:
        await booking_repo.update_status(booking, BookingStatus.confirmed)

    booking_total = float(booking.total_amount)
    nights = 1
    room_info = ""
    for br in booking.booking_rooms:
        br_nights = (br.check_out_date - br.check_in_date).days
        nights = max(nights, br_nights)
        room_info += f"{br.room.room_type.name} x {br_nights} nights, "

    desc = f"Full Payment - {room_info}"
    inv_data = InvoiceCreate(
        booking_id=booking.id,
        due_date=booking.booking_rooms[0].check_in_date
        if booking.booking_rooms
        else booking.created_at.date(),
        subtotal=amount,
        tax_rate=0,
        items=[
            InvoiceItemCreate(
                description=desc,
                quantity=1,
                unit_price=amount,
                amount=amount,
            )
        ],
    )
    invoice_repo = InvoiceRepository(db)
    invoice = await invoice_repo.create(inv_data, booking.guest_id)

    new_paid = float(booking.paid_amount)
    new_remaining = booking_total - new_paid

    email_html = get_booking_confirmation_html(
        guest_name=booking.guest.full_name,
        room_name=room_info,
        room_number=", ".join([br.room.room_number for br in booking.booking_rooms]),
        check_in=str(booking.booking_rooms[0].check_in_date)
        if booking.booking_rooms
        else "",
        check_out=str(booking.booking_rooms[0].check_out_date)
        if booking.booking_rooms
        else "",
        nights=nights,
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

    return {
        "payment": PaymentRead.model_validate(payment).model_dump(),
        "invoice_id": str(invoice.id),
    }


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

    capped = min(body.amount, remaining)
    if capped <= 0:
        raise BadRequestException("Payment amount must be greater than zero.")

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
        await booking_repo.update_status(booking, BookingStatus.confirmed)

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
        nights=1,
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

    return {
        "payment": PaymentRead.model_validate(payment).model_dump(),
        "invoice_id": str(invoice.id),
    }
