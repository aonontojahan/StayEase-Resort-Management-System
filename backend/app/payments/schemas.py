import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.payments.models import PaymentMethod


class PaymentCreate(BaseModel):
    booking_id: uuid.UUID
    amount: float = Field(..., gt=0)
    payment_method: str
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def validate_payment_method(cls, data):
        if isinstance(data, dict):
            pm = data.get("payment_method")
            if pm and pm not in [m.value for m in PaymentMethod]:
                raise ValueError(
                    f"Invalid payment_method '{pm}'. Must be one of: {[m.value for m in PaymentMethod]}"
                )
        return data


class BookingSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    total_amount: float
    status: str


class UserSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    amount: float
    payment_method: str
    status: str
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None
    cancellation_fee: Optional[float] = None
    booking: BookingSimple
    recorded_by: Optional[UserSimple] = None
    created_at: datetime


class RevenueSummary(BaseModel):
    total_revenue: float
    net_revenue: float = 0.0
    total_payments: int
    completed_payments: float
    refunded_payments: float
    cancellation_fees: float = 0.0
    actual_refunded: float = 0.0


class PaymentStatusUpdate(BaseModel):
    status: str


class MobileBankingPayment(BaseModel):
    booking_id: uuid.UUID
    amount: float = Field(..., gt=0)
    payment_method: str
    transaction_ref: str
    sender_phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
