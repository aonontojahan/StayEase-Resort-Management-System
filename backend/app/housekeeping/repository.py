import uuid
from datetime import datetime, timezone
from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.housekeeping.models import HousekeepingTask, TaskStatus, TaskPriority
from app.housekeeping.schemas import TaskCreate


class HousekeepingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self, skip: int = 0, limit: int = 100
    ) -> Sequence[HousekeepingTask]:
        result = await self.db.execute(
            select(HousekeepingTask)
            .options(
                selectinload(HousekeepingTask.room),
                selectinload(HousekeepingTask.assigned_to),
                selectinload(HousekeepingTask.created_by),
            )
            .order_by(HousekeepingTask.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_all(self) -> int:
        result = await self.db.execute(select(func.count(HousekeepingTask.id)))
        return int(result.scalar() or 0)

    async def get_by_assigned(
        self, user_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> Sequence[HousekeepingTask]:
        result = await self.db.execute(
            select(HousekeepingTask)
            .where(HousekeepingTask.assigned_to_id == user_id)
            .options(
                selectinload(HousekeepingTask.room),
                selectinload(HousekeepingTask.assigned_to),
                selectinload(HousekeepingTask.created_by),
            )
            .order_by(HousekeepingTask.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_by_assigned(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(HousekeepingTask.id)).where(
                HousekeepingTask.assigned_to_id == user_id
            )
        )
        return int(result.scalar() or 0)

    async def get_by_id(self, task_id: uuid.UUID) -> Optional[HousekeepingTask]:
        result = await self.db.execute(
            select(HousekeepingTask)
            .where(HousekeepingTask.id == task_id)
            .options(
                selectinload(HousekeepingTask.room),
                selectinload(HousekeepingTask.assigned_to),
                selectinload(HousekeepingTask.created_by),
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self, data: TaskCreate, created_by_id: uuid.UUID
    ) -> HousekeepingTask:
        task = HousekeepingTask(
            room_id=data.room_id,
            assigned_to_id=data.assigned_to_id,
            created_by_id=created_by_id,
            title=data.title,
            description=data.description,
            priority=TaskPriority(data.priority),
            due_date=data.due_date,
        )
        self.db.add(task)
        await self.db.flush()
        return await self.get_by_id(task.id)

    async def update_status(
        self, task: HousekeepingTask, new_status: TaskStatus
    ) -> HousekeepingTask:
        task.status = new_status
        if new_status == TaskStatus.done:
            task.completed_at = datetime.now(timezone.utc)
        else:
            task.completed_at = None
        self.db.add(task)
        await self.db.flush()
        return await self.get_by_id(task.id)

    async def delete(self, task: HousekeepingTask) -> None:
        await self.db.delete(task)
        await self.db.flush()
