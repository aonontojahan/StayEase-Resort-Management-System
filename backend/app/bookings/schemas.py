import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BookingRoomCreate(BaseModel):
    room_id: uuid.UUID
    check_in_date: date
    check_out_date: date
    num_guests: int = Field(1, ge=1)
    special_requests: Optional[str] = None


class BookingCreate(BaseModel):
    rooms: List[BookingRoomCreate] = Field(..., min_length=1)
    guest_id: Optional[uuid.UUID] = None


class BookingStatusUpdate(BaseModel):
    status: str


class GuestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    email: str
    phone_number: Optional[str] = None


class RoomTypeSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    base_price_per_night: float
    image_urls: Optional[list] = []


class RoomSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    room_number: str
    floor: int
    room_type: RoomTypeSimple


class BookingRoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    check_in_date: date
    check_out_date: date
    num_guests: int
    special_requests: Optional[str] = None
    room_price_per_night: float
    total_amount: float
    status: str
    room: RoomSimple


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str
    total_amount: float
    paid_amount: float
    guest: GuestRead
    booking_rooms: List[BookingRoomRead]
    created_at: datetime
    updated_at: datetime
