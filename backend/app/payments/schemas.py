import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    booking_id: uuid.UUID
    amount: float = Field(..., gt=0)
    payment_method: str
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None


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
    booking: BookingSimple
    recorded_by: Optional[UserSimple] = None
    created_at: datetime


class RevenueSummary(BaseModel):
    total_revenue: float
    total_payments: int
    completed_payments: float
    refunded_payments: float
