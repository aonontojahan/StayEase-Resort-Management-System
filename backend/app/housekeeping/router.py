import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.housekeeping.models import TaskStatus
from app.housekeeping.repository import HousekeepingRepository
from app.housekeeping.schemas import TaskCreate, TaskRead, TaskStatusUpdate

router = APIRouter(prefix="/housekeeping", tags=["Housekeeping"])

MANAGEMENT_ROLES = ["Super Admin", "Resort Owner", "Manager"]
HOUSEKEEPING_ROLES = ["Super Admin", "Resort Owner", "Manager", "Housekeeping"]


@router.get("/", response_model=List[TaskRead])
async def list_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List tasks. Housekeeping staff only see their own tasks; managers see all."""
    repo = HousekeepingRepository(db)
    if current_user.role.name == "Housekeeping":
        return await repo.get_by_assigned(current_user.id)
    if current_user.role.name in MANAGEMENT_ROLES:
        return await repo.get_all()
    # Receptionist/Accountant can also see all
    return await repo.get_all()


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = require_role(MANAGEMENT_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Create a new housekeeping task."""
    repo = HousekeepingRepository(db)
    return await repo.create(data, current_user.id)


@router.patch("/{task_id}/status", response_model=TaskRead)
async def update_task_status(
    task_id: uuid.UUID,
    body: TaskStatusUpdate,
    current_user: User = require_role(HOUSEKEEPING_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Update the status of a task."""
    try:
        new_status = TaskStatus(body.status)
    except ValueError:
        valid = [s.value for s in TaskStatus]
        raise BadRequestException(f"Invalid status. Valid values: {valid}")

    repo = HousekeepingRepository(db)
    task = await repo.get_by_id(task_id)
    if not task:
        raise NotFoundException("Task not found.")
    return await repo.update_status(task, new_status)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    _: User = require_role(MANAGEMENT_ROLES),
    db: AsyncSession = Depends(get_db),
):
    """Delete a housekeeping task."""
    repo = HousekeepingRepository(db)
    task = await repo.get_by_id(task_id)
    if not task:
        raise NotFoundException("Task not found.")
    await repo.delete(task)
