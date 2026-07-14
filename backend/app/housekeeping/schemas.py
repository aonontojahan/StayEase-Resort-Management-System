import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RoomTypeSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    base_price_per_night: float


class RoomSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    room_number: str
    floor: int
    room_type: RoomTypeSimple


class UserSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    email: str


class TaskCreate(BaseModel):
    room_id: uuid.UUID
    assigned_to_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    priority: str = "Medium"
    due_date: Optional[date] = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    room: RoomSimple
    assigned_to: Optional[UserSimple] = None
    created_by: Optional[UserSimple] = None
    created_at: datetime
    updated_at: datetime
