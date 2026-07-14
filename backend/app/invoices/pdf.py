import io
import logging
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)
from reportlab.lib.units import mm, inch
from datetime import datetime

logger = logging.getLogger(__name__)


def generate_invoice_pdf(
    invoice_id: str,
    guest_name: str,
    guest_email: str,
    booking_id: str,
    items: list[dict],
    subtotal: float,
    tax_rate: float,
    tax_amount: float,
    total_amount: float,
    due_date: str,
    status: str,
    invoice_number: str,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"Invoice {invoice_number}")

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="InvoiceTitle",
            fontSize=24,
            textColor=colors.HexColor("#059669"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SmallText", fontSize=8, textColor=colors.HexColor("#6b7280")
        )
    )

    elements = []
    elements.append(Paragraph("StayEase Resort", styles["InvoiceTitle"]))
    elements.append(Paragraph("Luxury Resort Management", styles["SmallText"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(f"Invoice: {invoice_number}", styles["Heading2"]))
    elements.append(
        Paragraph(
            f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]
        )
    )
    elements.append(Paragraph(f"Booking ID: {booking_id}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(f"Guest: {guest_name}", styles["Normal"]))
    elements.append(Paragraph(f"Email: {guest_email}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    table_data = [["Description", "Qty", "Unit Price", "Amount"]]
    for item in items:
        table_data.append(
            [
                item.get("description", ""),
                str(item.get("quantity", 1)),
                f"TK {item.get('unit_price', 0):.2f}",
                f"TK {item.get('amount', 0):.2f}",
            ]
        )

    table_data.append(["", "", "Subtotal:", f"TK {subtotal:.2f}"])
    table_data.append(["", "", f"Tax ({tax_rate:.0f}%):", f"TK {tax_amount:.2f}"])
    table_data.append(["", "", "Total:", f"TK {total_amount:.2f}"])
    table_data.append(["", "", "Status:", status])

    table = Table(table_data, colWidths=[200, 50, 100, 100])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#059669")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-2, -1), 0.5, colors.HexColor("#e5e7eb")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-2, -3),
                    [colors.white, colors.HexColor("#f9fafb")],
                ),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            f"Due Date: {due_date}",
            ParagraphStyle("Normal", fontSize=10, textColor=colors.HexColor("#dc2626")),
        )
    )
    elements.append(Spacer(1, 40))
    elements.append(
        Paragraph(
            "Thank you for choosing StayEase Resort!",
            ParagraphStyle("Normal", fontSize=10, textColor=colors.HexColor("#6b7280")),
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
