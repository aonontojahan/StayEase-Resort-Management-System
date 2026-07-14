import json
import logging
from typing import Any, Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        actor_id: Optional[str] = None,
        actor_email: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        try:
            log_entry = AuditLog(
                actor_id=str(actor_id) if actor_id else None,
                actor_email=actor_email,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                details=json.dumps(details) if details else None,
                ip_address=ip_address,
            )
            self.db.add(log_entry)
            await self.db.flush()
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")


async def log_action(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    actor_id: Optional[str] = None,
    actor_email: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    service = AuditService(db)
    await service.log(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        actor_id=actor_id,
        actor_email=actor_email,
        ip_address=ip_address,
    )


def get_client_ip(request: Request) -> str:
    if request.client:
        return request.client.host or ""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return ""
