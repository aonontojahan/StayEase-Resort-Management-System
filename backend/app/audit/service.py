import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.repository import AuditLogRepository


class AuditService:
    def __init__(self, db: AsyncSession):
        self.repo = AuditLogRepository(db)

    async def log(
        self,
        user_id: Optional[uuid.UUID],
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        await self.repo.create(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
        )
