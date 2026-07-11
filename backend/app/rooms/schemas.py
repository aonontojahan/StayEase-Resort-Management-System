import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RoomTypeBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    base_price_per_night: float = Field(..., gt=0)
    max_occupancy: int = Field(..., ge=1)
    amenities: Optional[List[str]] = []
    image_urls: Optional[List[str]] = []


class RoomTypeCreate(RoomTypeBase):
    pass


class RoomTypeRead(RoomTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class RoomBase(BaseModel):
    room_number: str = Field(..., max_length=10)
    floor: int = Field(..., ge=0)
    notes: Optional[str] = None


class RoomCreate(RoomBase):
    room_type_id: uuid.UUID


class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    floor: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    room_type_id: Optional[uuid.UUID] = None


class RoomRead(RoomBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str
    room_type: RoomTypeRead
    is_available: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

