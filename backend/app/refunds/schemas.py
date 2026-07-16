import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RefundCreate(BaseModel):
    payment_id: uuid.UUID
    refund_method: str = "Stripe"
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class RefundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    payment_id: uuid.UUID
    booking_id: uuid.UUID
    amount: float
    cancellation_fee: Optional[float] = 0
    refund_method: Optional[str] = None
    status: str
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class RefundComplete(BaseModel):
    transaction_ref: str
    notes: Optional[str] = None
