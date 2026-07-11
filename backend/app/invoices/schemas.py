import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., gt=0)
    amount: float = Field(..., gt=0)


class InvoiceItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    description: str
    quantity: int
    unit_price: float
    amount: float


class InvoiceCreate(BaseModel):
    booking_id: uuid.UUID
    issue_date: Optional[date] = None
    due_date: date
    subtotal: float = Field(..., gt=0)
    tax_rate: float = Field(default=0, ge=0)
    notes: Optional[str] = None
    items: List[InvoiceItemCreate]


class InvoiceStatusUpdate(BaseModel):
    status: str


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    invoice_number: str
    booking_id: uuid.UUID
    guest_id: uuid.UUID
    issue_date: date
    due_date: date
    subtotal: float
    tax_rate: float
    tax_amount: float
    total_amount: float
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemRead]


class InvoiceSummary(BaseModel):
    total_invoices: int
    total_paid: float
    total_unpaid: float
    total_cancelled: float
    paid_count: int
    unpaid_count: int
