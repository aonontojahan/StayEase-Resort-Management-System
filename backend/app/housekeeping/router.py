import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.pagination import PaginationParams
from app.housekeeping.models import TaskStatus
from app.housekeeping.repository import HousekeepingRepository
from app.housekeeping.schemas import TaskCreate, TaskRead, TaskStatusUpdate

router = APIRouter(prefix="/housekeeping", tags=["Housekeeping"])

MANAGEMENT_ROLES = ["Resort Owner", "Manager"]
HOUSEKEEPING_ROLES = ["Resort Owner", "Manager", "Housekeeping"]


@router.get("/", response_model=List[TaskRead])
async def list_tasks(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = HousekeepingRepository(db)
    if current_user.role.name == "Housekeeping":
        items = await repo.get_by_assigned(current_user.id, skip=pagination.skip, limit=pagination.limit)
        total = await repo.count_by_assigned(current_user.id)
    else:
        items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
        total = await repo.count_all()
    return JSONResponse(
        content=jsonable_encoder([TaskRead.model_validate(t) for t in items]),
        headers={"X-Total-Count": str(total), "Access-Control-Expose-Headers": "X-Total-Count"},
    )
        total = await repo.count_by_assigned(current_user.id)
    else:
        items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
        total = await repo.count_all()
    return Response(
        content=TaskRead.model_validate(items, many=True).model_dump_json(),
        media_type="application/json",
        headers={"X-Total-Count": str(total)},
    )


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = require_role(MANAGEMENT_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = HousekeepingRepository(db)
    return await repo.create(data, current_user.id)


@router.patch("/{task_id}/status", response_model=TaskRead)
async def update_task_status(
    task_id: uuid.UUID,
    body: TaskStatusUpdate,
    current_user: User = require_role(HOUSEKEEPING_ROLES),
    db: AsyncSession = Depends(get_db),
):
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
    repo = HousekeepingRepository(db)
    task = await repo.get_by_id(task_id)
    if not task:
        raise NotFoundException("Task not found.")
    await repo.delete(task)
