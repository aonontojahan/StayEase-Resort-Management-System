import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.core.database import get_db
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.rooms.models import Room, RoomType
from app.rooms.repository import RoomRepository, RoomTypeRepository
from app.rooms.schemas import RoomCreate, RoomRead, RoomTypeCreate, RoomTypeRead, RoomUpdate

router = APIRouter(tags=["Rooms"])


# ── Room Types ──────────────────────────────────────────────────────────────

@router.get("/room-types", response_model=List[RoomTypeRead])
async def list_room_types(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all room types."""
    repo = RoomTypeRepository(db)
    return await repo.get_all()


@router.post("/room-types", response_model=RoomTypeRead, status_code=status.HTTP_201_CREATED)
async def create_room_type(
    data: RoomTypeCreate,
    _: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    """Create a new room type."""
    repo = RoomTypeRepository(db)
    existing = await repo.get_by_name(data.name)
    if existing:
        raise BadRequestException(f"Room type '{data.name}' already exists.")
    return await repo.create(data)


@router.put("/room-types/{room_type_id}", response_model=RoomTypeRead)
async def update_room_type(
    room_type_id: uuid.UUID,
    data: RoomTypeCreate,
    _: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    """Update a room type."""
    repo = RoomTypeRepository(db)
    rt = await repo.get_by_id(room_type_id)
    if not rt:
        raise NotFoundException("Room type not found.")
    return await repo.update(rt, data.model_dump(exclude_unset=True))


@router.delete("/room-types/{room_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_type(
    room_type_id: uuid.UUID,
    _: User = require_role(["Resort Owner"]),
    db: AsyncSession = Depends(get_db),
):
    """Delete a room type."""
    repo = RoomTypeRepository(db)
    rt = await repo.get_by_id(room_type_id)
    if not rt:
        raise NotFoundException("Room type not found.")
    await repo.delete(rt)


# ── Rooms ────────────────────────────────────────────────────────────────────

@router.get("/rooms", response_model=List[RoomRead])
async def list_rooms(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all rooms."""
    repo = RoomRepository(db)
    return await repo.get_all()


@router.get("/rooms/available", response_model=List[RoomRead])
async def list_available_rooms(
    check_in: date,
    check_out: date,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return rooms available for the given date range."""
    if check_out <= check_in:
        raise BadRequestException("Check-out date must be after check-in date.")
    repo = RoomRepository(db)
    return await repo.get_available(check_in, check_out)


@router.get("/rooms/{room_id}", response_model=RoomRead)
async def get_room(
    room_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single room by ID."""
    repo = RoomRepository(db)
    room = await repo.get_by_id(room_id)
    if not room:
        raise NotFoundException("Room not found.")
    return room


@router.post("/rooms", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    data: RoomCreate,
    _: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    """Create a new room."""
    repo = RoomRepository(db)
    existing = await repo.get_by_number(data.room_number)
    if existing:
        raise BadRequestException(f"Room '{data.room_number}' already exists.")
    room = await repo.create(data)
    return await repo.get_by_id(room.id)


@router.put("/rooms/{room_id}", response_model=RoomRead)
async def update_room(
    room_id: uuid.UUID,
    data: RoomUpdate,
    _: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    """Update a room."""
    repo = RoomRepository(db)
    room = await repo.get_by_id(room_id)
    if not room:
        raise NotFoundException("Room not found.")
    updated = await repo.update(room, data.model_dump(exclude_none=True, exclude_unset=True))
    return await repo.get_by_id(updated.id)


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: uuid.UUID,
    _: User = require_role(["Resort Owner"]),
    db: AsyncSession = Depends(get_db),
):
    """Delete a room."""
    repo = RoomRepository(db)
    room = await repo.get_by_id(room_id)
    if not room:
        raise NotFoundException("Room not found.")
    await repo.delete(room)
