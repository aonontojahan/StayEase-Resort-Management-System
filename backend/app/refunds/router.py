import asyncio
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.audit.service import get_client_ip, log_action
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.pagination import PaginationParams
from app.core.email import send_html_email, get_refund_notification_html
from app.payments.models import PaymentStatus
from app.payments.repository import PaymentRepository
from app.refunds.repository import RefundRepository
from app.refunds.models import RefundStatus
from app.refunds.schemas import RefundCreate, RefundRead, RefundComplete

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/refunds", tags=["Refunds"])

REFUND_ROLES = ["Resort Owner", "Manager", "Accountant"]


@router.get("/", response_model=List[RefundRead])
async def list_refunds(
    pagination: PaginationParams = Depends(),
    _: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = RefundRepository(db)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await repo.count_all()
    return JSONResponse(
        content=jsonable_encoder([RefundRead.model_validate(r) for r in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.get("/summary")
async def refund_summary(
    _: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = RefundRepository(db)
    return await repo.get_summary_stats()


@router.post("/", response_model=RefundRead, status_code=status.HTTP_201_CREATED)
async def initiate_refund(
    body: RefundCreate,
    current_user: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    # Validate payment exists and is completed
    pay_repo = PaymentRepository(db)
    payment = await pay_repo.get_by_id(body.payment_id)
    if not payment:
        raise NotFoundException("Payment not found.")
    if payment.status != PaymentStatus.completed.value:
        raise BadRequestException("Only completed payments can be refunded.")

    booking = payment.booking
    refund_repo = RefundRepository(db)

    refund_method = body.refund_method
    refund_amount = body.amount
    total_paid = float(payment.amount)
    if refund_amount > total_paid:
        raise BadRequestException(
            f"Refund amount ({refund_amount}) cannot exceed payment amount ({total_paid})."
        )
    cancellation_fee = min(
        total_paid * settings.CANCELLATION_FEE_PERCENTAGE,
        refund_amount,
    )
    refund_status = RefundStatus.completed
    transaction_ref = f"{refund_method.lower()}_ref_{uuid.uuid4().hex[:8]}" if refund_method else f"ref_{uuid.uuid4().hex[:8]}"
    error_msg = None

    refund = await refund_repo.create(
        payment_id=body.payment_id,
        booking_id=booking.id,
        amount=refund_amount,
        cancellation_fee=cancellation_fee,
        refund_method=refund_method,
        initiated_by_id=current_user.id,
        status=refund_status,
        notes=body.notes,
    )

    if refund_status == RefundStatus.completed and transaction_ref:
        refund = await refund_repo.complete(refund.id, transaction_ref=transaction_ref)

    if refund_status == RefundStatus.failed and error_msg:
        refund = await refund_repo.mark_failed(refund.id, error_msg)

    # Update payment status in DB (only if refund was actually completed)
    if refund_status == RefundStatus.completed:
        pay_repo = PaymentRepository(db)
        await pay_repo.mark_refunded(body.payment_id, cancellation_fee)

    # Audit log
    await log_action(
        db=db,
        action="refund_initiated",
        resource_type="refund",
        resource_id=str(refund.id),
        details={
            "payment_id": str(body.payment_id),
            "amount": refund_amount,
            "method": refund_method,
            "status": refund.status,
            "cancellation_fee": cancellation_fee,
        },
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        ip_address=get_client_ip(request) if request else None,
    )

    # Send email notification to guest
    if refund.status == RefundStatus.completed.value:
        try:
            email_html = get_refund_notification_html(
                guest_name=booking.guest.full_name,
                booking_id=str(booking.id),
                refund_amount=refund_amount,
                cancellation_fee=cancellation_fee,
                payment_method=refund_method,
                transaction_ref=transaction_ref or "",
            )
            await asyncio.to_thread(
                send_html_email,
                to_email=booking.guest.email,
                subject=f"StayEase Resort - Refund Processed for Booking #{booking.id}",
                html_content=email_html,
                text_content=f"Your refund of TK {refund_amount:.2f} has been processed. Cancellation fee: TK {cancellation_fee:.2f}.",
            )
        except Exception as e:
            logger.warning(f"Failed to send refund email: {e}")

    return refund


@router.patch("/{refund_id}/complete", response_model=RefundRead)
async def complete_refund(
    refund_id: uuid.UUID,
    body: RefundComplete,
    current_user: User = require_role(REFUND_ROLES),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    repo = RefundRepository(db)
    refund = await repo.get_by_id(refund_id)
    if not refund:
        raise NotFoundException("Refund not found.")
    if refund.status == RefundStatus.failed.value:
        raise BadRequestException("Cannot complete a failed refund.")

    result = await repo.complete(refund_id, body.transaction_ref, body.notes)

    pay_repo = PaymentRepository(db)
    refund = result  # refreshed refund from repo.complete()
    if refund and refund.payment_id:
        await pay_repo.mark_refunded(
            refund.payment_id,
            float(refund.cancellation_fee or 0),
        )

    await log_action(
        db=db,
        action="refund_completed",
        resource_type="refund",
        resource_id=str(refund_id),
        details={
            "transaction_ref": body.transaction_ref,
            "amount": float(refund.amount),
        },
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        ip_address=get_client_ip(request) if request else None,
    )

    # Send email notification
    try:
        email_html = get_refund_notification_html(
            guest_name=refund.booking.guest.full_name,
            booking_id=str(refund.booking_id),
            refund_amount=float(refund.amount),
            cancellation_fee=float(refund.cancellation_fee or 0),
            payment_method=refund.refund_method.value
            if refund.refund_method
            else "Manual",
            transaction_ref=body.transaction_ref,
        )
        await asyncio.to_thread(
            send_html_email,
            to_email=refund.booking.guest.email,
            subject=f"StayEase Resort - Refund Completed for Booking #{refund.booking_id}",
            html_content=email_html,
            text_content=f"Your refund of TK {float(refund.amount):.2f} has been completed.",
        )
    except Exception as e:
        logger.warning(f"Failed to send refund email: {e}")

    return result
