import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_html_email(
    to_email: str, subject: str, html_content: str, text_content: Optional[str] = None
) -> bool:
    """
    Send an HTML email via SMTP settings defined in configuration.
    Falls back to logging details if SMTP settings are not configured.
    """
    if not settings.SMTP_HOST or not settings.EMAILS_FROM_EMAIL:
        logger.info("--- [SIMULATED EMAIL NOTIFICATION] ---")
        logger.info(f"Recipient: {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body Preview:\n{text_content or html_content[:200]}...")
        logger.info("----------------------------------------")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = (
            f"{settings.EMAILS_FROM_NAME or 'StayEase'} <{settings.EMAILS_FROM_EMAIL}>"
        )
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        smtp_port = settings.SMTP_PORT or 587
        with smtplib.SMTP(settings.SMTP_HOST, smtp_port) as server:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"Successfully sent email to {to_email} with subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def get_booking_confirmation_html(
    guest_name: str,
    room_name: str,
    room_number: str,
    check_in: str,
    check_out: str,
    nights: int,
    total_amount: float,
    amount_paid: float,
    remaining_balance: float,
    payment_status: str,
    booking_id: str,
) -> str:
    """
    Generate premium HTML content for a booking confirmation.
    """
    emerald_color = "#10b981"
    card_bg = "#f0fdf4"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .header {{ background-color: {emerald_color}; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; letter-spacing: 0.05em; }}
            .content {{ padding: 30px; background-color: #ffffff; }}
            .greeting {{ font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #064e3b; }}
            .details-card {{ background-color: {card_bg}; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 25px; }}
            .details-row {{ display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #d1fae5; padding-bottom: 8px; }}
            .details-row:last-child {{ border-bottom: none; margin-bottom: 0; padding-bottom: 0; }}
            .label {{ color: #047857; font-weight: 600; font-size: 14px; }}
            .value {{ font-weight: 700; font-size: 14px; text-align: right; }}
            .summary {{ border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 20px; }}
            .summary-title {{ font-weight: bold; margin-bottom: 10px; color: #374151; }}
            .footer {{ background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
            .badge {{ display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold; }}
            .badge-success {{ background-color: #d1fae5; color: #065f46; }}
            .badge-warning {{ background-color: #fef3c7; color: #92400e; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>StayEase Resort</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Reservation Confirmed</p>
            </div>
            <div class="content">
                <div class="greeting">Dear {guest_name},</div>
                <p>Thank you for choosing StayEase Resort! We are pleased to confirm your upcoming stay. Below are your booking details:</p>
                
                <div class="details-card">
                    <div class="details-row">
                        <span class="label">Booking ID</span>
                        <span class="value">{booking_id}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Room Type</span>
                        <span class="value">{room_name} (Room {room_number})</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Dates</span>
                        <span class="value">{check_in} to {check_out} ({nights} Night(s))</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Total Amount</span>
                        <span class="value">TK {total_amount:.2f}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Amount Paid</span>
                        <span class="value">TK {amount_paid:.2f}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Remaining Balance</span>
                        <span class="value" style="color: {emerald_color if remaining_balance == 0 else "#dc2626"};">TK {remaining_balance:.2f}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Payment Status</span>
                        <span class="value">
                            <span class="badge {"badge-success" if remaining_balance == 0 else "badge-warning"}">
                                {payment_status}
                            </span>
                        </span>
                    </div>
                </div>

                <div class="summary">
                    <div class="summary-title">Check-in Instructions</div>
                    <p style="font-size: 14px; color: #4b5563; margin-top: 5px;">
                        Check-in time starts at 2:00 PM. Please present a valid ID at the reception. 
                        {"If you have an outstanding balance, it can be settled upon arrival at the resort." if remaining_balance > 0 else "Your payment is fully settled. We look forward to welcoming you!"}
                    </p>
                </div>
            </div>
            <div class="footer">
                <p>&copy; {settings.EMAILS_FROM_NAME or "StayEase"} Resort. All rights reserved.</p>
                <p>This is an automated message, please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_payment_receipt_html(
    guest_name: str,
    amount_paid: float,
    payment_method: str,
    transaction_ref: str,
    booking_id: str,
    remaining_balance: float,
) -> str:
    """
    Generate HTML content for a payment receipt.
    """
    emerald_color = "#10b981"
    card_bg = "#f9fafb"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .header {{ background-color: {emerald_color}; color: white; padding: 25px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 22px; }}
            .content {{ padding: 30px; background-color: #ffffff; }}
            .greeting {{ font-size: 16px; font-weight: bold; margin-bottom: 20px; }}
            .receipt-box {{ background-color: {card_bg}; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px; }}
            .receipt-row {{ display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; }}
            .receipt-row:last-child {{ border-bottom: none; margin-bottom: 0; padding-bottom: 0; }}
            .label {{ color: #4b5563; font-size: 14px; }}
            .value {{ font-weight: 700; font-size: 14px; color: #111827; text-align: right; }}
            .footer {{ background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Payment Receipt</h1>
            </div>
            <div class="content">
                <div class="greeting">Hello {guest_name},</div>
                <p>We have successfully processed your payment. Thank you for your transaction!</p>
                
                <div class="receipt-box">
                    <div class="receipt-row">
                        <span class="label">Booking ID</span>
                        <span class="value">{booking_id}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Amount Processed</span>
                        <span class="value" style="color: {emerald_color};">TK {amount_paid:.2f}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Payment Method</span>
                        <span class="value">{payment_method}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Transaction Reference</span>
                        <span class="value">{transaction_ref}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Remaining Balance</span>
                        <span class="value" style="color: #dc2626 if remaining_balance > 0 else emerald_color;">TK {remaining_balance:.2f}</span>
                    </div>
                </div>
                
                <p style="font-size: 14px; color: #4b5563;">If you have any questions or need to make changes to your booking, please contact our support desk.</p>
            </div>
            <div class="footer">
                <p>&copy; {settings.EMAILS_FROM_NAME or "StayEase"} Resort. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_refund_notification_html(
    guest_name: str,
    booking_id: str,
    refund_amount: float,
    cancellation_fee: float,
    payment_method: str,
    transaction_ref: str,
) -> str:
    emerald_color = "#10b981"
    red_color = "#dc2626"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, {emerald_color}, #059669); color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; letter-spacing: 0.05em; }}
            .content {{ padding: 30px; background-color: #ffffff; }}
            .greeting {{ font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #064e3b; }}
            .details-card {{ background-color: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 25px; }}
            .details-row {{ display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #d1fae5; padding-bottom: 8px; }}
            .details-row:last-child {{ border-bottom: none; margin-bottom: 0; padding-bottom: 0; }}
            .label {{ color: #047857; font-weight: 600; font-size: 14px; }}
            .value {{ font-weight: 700; font-size: 14px; text-align: right; }}
            .value.red {{ color: {red_color}; }}
            .value.green {{ color: {emerald_color}; }}
            .footer {{ background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Refund Processed</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">StayEase Resort</p>
            </div>
            <div class="content">
                <div class="greeting">Dear {guest_name},</div>
                <p>Your refund request has been processed. Below are the details:</p>

                <div class="details-card">
                    <div class="details-row">
                        <span class="label">Booking ID</span>
                        <span class="value">{booking_id}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Refund Amount</span>
                        <span class="value green">TK {refund_amount:.2f}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Cancellation Fee (30%)</span>
                        <span class="value red">TK {cancellation_fee:.2f}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Total Paid</span>
                        <span class="value">TK {refund_amount + cancellation_fee:.2f}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Refund Method</span>
                        <span class="value">{payment_method}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Transaction Reference</span>
                        <span class="value">{transaction_ref}</span>
                    </div>
                </div>

                <p style="font-size: 14px; color: #4b5563;">
                    The refunded amount should appear in your account within 5-10 business days depending on your payment method. If you have any questions, please contact our support team.
                </p>
            </div>
            <div class="footer">
                <p>&copy; StayEase Resort. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
