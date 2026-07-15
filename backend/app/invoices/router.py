import html
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.auth.repository import UserRepository
from app.bookings.repository import BookingRepository
from app.core.database import get_db
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.pagination import PaginationParams
from app.core.security import decode_token
from app.invoices.models import InvoiceStatus
from app.invoices.repository import InvoiceRepository
from app.invoices.pdf import generate_invoice_pdf
from app.invoices.schemas import (
    InvoiceCreate,
    InvoiceRead,
    InvoiceStatusUpdate,
    InvoiceSummary,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


FINANCE_ROLES = ["Resort Owner", "Manager", "Accountant"]


async def _resolve_db_user(
    token: Optional[str], request: Request, db: AsyncSession
) -> User:
    token_str = token
    if not token_str:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token_str = auth_header.split(" ", 1)[1]
    if not token_str:
        raise BadRequestException("Authentication required.")

    payload = decode_token(token_str)
    if payload is None:
        raise BadRequestException("Invalid or expired token.")
    user_id = payload.get("sub")
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(uuid.UUID(user_id))
    if not user:
        raise BadRequestException("User not found.")
    return user


def _enrich_invoice(invoice) -> dict:
    data = InvoiceRead.model_validate(invoice).model_dump()
    try:
        if invoice.booking:
            total = float(invoice.booking.total_amount)
            data["booking_total"] = total
            data["booking_paid"] = float(invoice.booking.paid_amount)
    except Exception:
        data["booking_total"] = None
        data["booking_paid"] = None
    try:
        if invoice.guest:
            data["guest_name"] = invoice.guest.full_name
            data["guest_email"] = invoice.guest.email
    except Exception:
        data["guest_name"] = None
        data["guest_email"] = None
    return data


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
        content=jsonable_encoder([_enrich_invoice(i) for i in items]),
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
        content=jsonable_encoder([_enrich_invoice(i) for i in items]),
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
    return _enrich_invoice(invoice)


@router.get("/{invoice_id}/html", response_class=HTMLResponse)
async def get_invoice_html(
    invoice_id: uuid.UUID,
    request: Request,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    current_user = await _resolve_db_user(token, request, db)

    repo = InvoiceRepository(db)
    invoice = await repo.get_by_id(invoice_id)
    if not invoice:
        raise NotFoundException("Invoice not found.")
    if current_user.role.name == "Guest" and invoice.guest_id != current_user.id:
        raise BadRequestException("You can only view your own invoices.")

    guest = invoice.guest
    booking = invoice.booking

    total_amount = float(booking.total_amount)
    paid_amount = float(booking.paid_amount)
    this_invoice_amount = float(invoice.total_amount)
    previous_paid = paid_amount - this_invoice_amount
    remaining = total_amount - paid_amount
    is_fully_paid = remaining <= 0.01

    breakdown_rows = ""
    if previous_paid > 0:
        pct_prev = round(previous_paid / total_amount * 100)
        breakdown_rows += f"""<tr>
            <td style="padding:4px 0;color:#6b7280;">Pre-payment ({pct_prev}%)</td>
            <td style="padding:4px 0;text-align:right;color:#374151;">TK {previous_paid:,.2f}</td>
        </tr>"""
    breakdown_rows += f"""<tr>
        <td style="padding:4px 0;color:#6b7280;">{"Due Payment" if previous_paid > 0 else "Full Payment"} ({round(this_invoice_amount / total_amount * 100)}%)</td>
        <td style="padding:4px 0;text-align:right;font-weight:700;color:#059669;">TK {this_invoice_amount:,.2f}</td>
    </tr>"""
    if is_fully_paid:
        breakdown_rows += f"""<tr style="border-top:2px solid #059669;">
            <td style="padding:8px 0 4px;font-size:16px;font-weight:800;color:#059669;">Total (100%)</td>
            <td style="padding:8px 0 4px;text-align:right;font-size:16px;font-weight:800;color:#059669;">TK {total_amount:,.2f}</td>
        </tr>"""
        breakdown_rows += """<tr>
            <td colspan="2" style="padding:2px 0 0;text-align:right;font-size:11px;color:#059669;font-weight:600;">✓ Fully Paid</td>
        </tr>"""
    else:
        breakdown_rows += f"""<tr style="border-top:2px solid #e5e7eb;">
            <td style="padding:8px 0 4px;font-size:14px;font-weight:700;color:#1f2937;">Total</td>
            <td style="padding:8px 0 4px;text-align:right;font-size:14px;font-weight:700;color:#1f2937;">TK {total_amount:,.2f}</td>
        </tr>"""
        breakdown_rows += f"""<tr>
            <td style="padding:2px 0 0;text-align:right;font-size:11px;color:#dc2626;font-weight:600;">Due: TK {remaining:,.2f}</td>
        </tr>"""

    items_html = "".join(
        f"""<tr>
            <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">{html.escape(item.description)}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;">{item.quantity}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;">TK {item.unit_price:,.2f}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-weight:600;">TK {item.amount:,.2f}</td>
        </tr>"""
        for item in invoice.items
    )

    tax_row = ""
    if invoice.tax_rate > 0:
        tax_row = f"""<tr>
            <td colspan="3" style="padding:10px 16px;text-align:right;color:#6b7280;">Tax ({invoice.tax_rate}%)</td>
            <td style="padding:10px 16px;text-align:right;color:#374151;">TK {invoice.tax_amount:,.2f}</td>
        </tr>"""

    status_badge_color = {
        "Draft": "#6b7280",
        "Issued": "#2563eb",
        "Paid": "#059669",
        "Cancelled": "#dc2626",
        "Refunded": "#7c3aed",
    }.get(invoice.status, "#6b7280")

    esc = html.escape
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice {esc(invoice.invoice_number)} - StayEase Resort</title>
<style>
    @page {{ margin: 20mm 15mm; }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        background: #f3f4f6;
        color: #1f2937;
        line-height: 1.6;
    }}
    .invoice-wrapper {{
        max-width: 210mm;
        margin: 24px auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        overflow: hidden;
    }}
    .invoice-header {{
        background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
        padding: 40px 48px 36px;
        color: #ffffff;
        position: relative;
    }}
    .invoice-header::after {{
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 6px;
        background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706);
    }}
    .header-top {{
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }}
    .brand {{
        display: flex;
        align-items: center;
        gap: 14px;
    }}
    .brand svg {{
        width: 48px;
        height: 48px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
    }}
    .brand-text h1 {{
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
        font-family: 'Georgia', serif;
    }}
    .brand-text p {{
        font-size: 12px;
        opacity: 0.85;
        margin-top: 2px;
        letter-spacing: 0.3px;
    }}
    .invoice-title {{
        text-align: right;
    }}
    .invoice-title h2 {{
        font-size: 32px;
        font-weight: 300;
        letter-spacing: 2px;
        text-transform: uppercase;
        opacity: 0.9;
    }}
    .invoice-title span {{
        display: inline-block;
        margin-top: 6px;
        padding: 4px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: {status_badge_color};
        color: #fff;
    }}
    .invoice-body {{
        padding: 40px 48px;
    }}
    .info-grid {{
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 32px;
        margin-bottom: 36px;
    }}
    .info-box h3 {{
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #059669;
        margin-bottom: 10px;
    }}
    .info-box p {{ font-size: 14px; color: #374151; margin-bottom: 2px; }}
    .info-box .label {{ color: #9ca3af; font-size: 12px; }}
    .info-box .highlight {{ font-weight: 700; font-size: 15px; color: #1f2937; }}
    .items-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
    .items-table thead th {{
        background: #f9fafb;
        padding: 12px 16px;
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
        border-bottom: 2px solid #e5e7eb;
    }}
    .totals {{
        margin-left: auto;
        width: 320px;
        border-top: 2px solid #e5e7eb;
        padding-top: 16px;
    }}
    .totals tr td {{
        padding: 6px 0;
        font-size: 14px;
    }}
    .totals .grand-total td {{
        padding-top: 12px;
        font-size: 20px;
        font-weight: 800;
        color: #059669;
        border-top: 2px solid #059669;
    }}
    .footer {{
        margin-top: 40px;
        padding: 24px 48px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
    }}
    .footer p {{ font-size: 12px; color: #9ca3af; }}
    .footer .notes {{ color: #6b7280; font-size: 13px; margin-bottom: 8px; }}
    .print-btn {{
        display: block;
        width: 200px;
        margin: 16px auto 0;
        padding: 12px 24px;
        background: #059669;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }}
    .print-btn:hover {{ background: #047857; }}
    @media print {{
        body {{ background: #fff; }}
        .invoice-wrapper {{ margin: 0; border-radius: 0; box-shadow: none; max-width: 100%; }}
        .invoice-header {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .print-btn {{ display: none; }}
        .no-print {{ display: none; }}
    }}
</style>
</head>
<body>
<div class="invoice-wrapper">
    <div class="invoice-header">
        <div class="header-top">
            <div class="brand">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32 4L8 24v36h16V44h16v16h16V24L32 4z" fill="rgba(255,255,255,0.95)"/>
                    <path d="M32 10L12 26v30h12V40h16v16h12V26L32 10z" fill="#059669"/>
                    <rect x="28" y="42" width="8" height="12" fill="rgba(255,255,255,0.9)" rx="1"/>
                    <circle cx="32" cy="20" r="4" fill="#fbbf24"/>
                </svg>
                <div class="brand-text">
                    <h1>StayEase Resort</h1>
                    <p>Luxury &middot; Comfort &middot; Serenity</p>
                </div>
            </div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
                <span>{invoice.status}</span>
            </div>
        </div>
    </div>

    <div class="invoice-body">
        <div class="info-grid">
            <div class="info-box">
                <h3>Bill To</h3>
                <p class="highlight">{esc(guest.full_name)}</p>
                <p>{esc(guest.email)}</p>
                <p>{esc(guest.phone_number or "")}</p>
                <p class="label" style="margin-top:6px;">Booking #{esc(str(booking.id)[:8])}</p>
            </div>
            <div class="info-box" style="text-align:right;">
                <h3>Invoice Details</h3>
                <p><strong>Number:</strong> {invoice.invoice_number}</p>
                <p><strong>Issue Date:</strong> {invoice.issue_date.strftime("%b %d, %Y")}</p>
                <p><strong>Due Date:</strong> {invoice.due_date.strftime("%b %d, %Y")}</p>
                <p><strong>Room(s):</strong> {esc(", ".join(br.room.room_number for br in booking.booking_rooms))}</p>
                <p><strong>Stay:</strong> {booking.booking_rooms[0].check_in_date.strftime("%b %d")} - {booking.booking_rooms[0].check_out_date.strftime("%b %d, %Y")}</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width:50%;">Description</th>
                    <th style="width:12%;text-align:center;">Qty</th>
                    <th style="width:18%;text-align:right;">Unit Price</th>
                    <th style="width:20%;text-align:right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div style="margin-bottom:24px;">
            <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#059669;margin-bottom:8px;">Payment Summary</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                {breakdown_rows}
            </table>
        </div>

        <table class="totals">
            <tr>
                <td style="text-align:right;color:#6b7280;">Subtotal</td>
                <td style="text-align:right;font-weight:600;width:140px;">TK {invoice.subtotal:,.2f}</td>
            </tr>
            {tax_row}
            <tr class="grand-total">
                <td style="text-align:right;">Total</td>
                <td style="text-align:right;">TK {invoice.total_amount:,.2f}</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        {f'<p class="notes"><strong>Notes:</strong> {esc(invoice.notes)}</p>' if invoice.notes else ""}
        <p>StayEase Resort Management System &bull; Thank you for choosing us!</p>
        <p style="margin-top:4px;">For any inquiries, please contact the front desk.</p>
    </div>
</div>

<button class="print-btn no-print" onclick="window.print()">Download / Print PDF</button>

<script>
    (function() {{
        var params = new URLSearchParams(window.location.search);
        if (params.get('print') === '1') {{
            setTimeout(function() {{ window.print(); }}, 500);
        }}
    }})();
</script>
</body>
</html>"""


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = InvoiceRepository(db)
    invoice = await repo.get_by_id(invoice_id)
    if not invoice:
        raise NotFoundException("Invoice not found")

    if current_user.role.name == "Guest" and invoice.guest_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your invoice")

    items_data = [
        {
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "amount": float(item.amount),
        }
        for item in invoice.items
    ]

    pdf_bytes = generate_invoice_pdf(
        invoice_id=str(invoice.id),
        guest_name=invoice.guest.full_name,
        guest_email=invoice.guest.email,
        booking_id=str(invoice.booking_id),
        items=items_data,
        subtotal=float(invoice.subtotal),
        tax_rate=float(invoice.tax_rate),
        tax_amount=float(invoice.tax_amount),
        total_amount=float(invoice.total_amount),
        due_date=str(invoice.due_date),
        status=invoice.status,
        invoice_number=invoice.invoice_number,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice-{invoice.invoice_number}.pdf"'
        },
    )


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
