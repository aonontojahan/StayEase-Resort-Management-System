import functools
import logging
from typing import Any, Callable, Optional
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import log_action, get_client_ip
from app.auth.models import User
from app.core.database import get_db

logger = logging.getLogger(__name__)


def audit_log(action: str, resource_type: str):
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            result = await func(*args, **kwargs)
            try:
                request: Optional[Request] = kwargs.get("request")
                current_user: Optional[User] = kwargs.get("current_user")
                db: Optional[AsyncSession] = kwargs.get("db")
                resource_id = (
                    kwargs.get("booking_id")
                    or kwargs.get("payment_id")
                    or kwargs.get("task_id")
                    or kwargs.get("user_id")
                )
                if resource_id:
                    resource_id = str(resource_id)

                if db and current_user:
                    await log_action(
                        db=db,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        details={"endpoint": request.url.path if request else None}
                        if request
                        else None,
                        actor_id=str(current_user.id) if current_user else None,
                        actor_email=current_user.email if current_user else None,
                        ip_address=get_client_ip(request) if request else None,
                    )
            except Exception as e:
                logger.warning(f"Audit log skipped: {e}")
            return result

        return wrapper

    return decorator
