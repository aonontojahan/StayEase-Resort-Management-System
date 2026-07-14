import uuid
from typing import List, Union
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.repository import TokenBlacklistRepository, UserRepository
from app.core.database import get_db, SessionLocal
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise UnauthorizedException("Not authenticated")

    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Invalid or expired authentication token")

    token_jti = payload.get("jti")
    if token_jti:
        blacklist_repo = TokenBlacklistRepository(db)
        if await blacklist_repo.is_blacklisted(token_jti):
            raise UnauthorizedException("Token has been revoked")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Invalid token payload")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid user ID format in token")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_uuid)
    if not user:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("User account is deactivated")

    return user


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in self.allowed_roles:
            raise ForbiddenException(
                f"Requires one of the following roles: {', '.join(self.allowed_roles)}"
            )
        return current_user


class PermissionChecker:
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_permissions = {p.name for p in current_user.role.permissions}
        for perm in self.required_permissions:
            if perm not in user_permissions:
                raise ForbiddenException(f"Missing required permission: {perm}")
        return current_user


async def get_current_user_ws(token: str) -> User | None:
    payload = decode_token(token)
    if not payload:
        return None
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return None
    from app.auth.repository import UserRepository

    async with SessionLocal() as db:
        repo = UserRepository(db)
        user = await repo.get_by_id(user_uuid)
        return user


def require_role(roles: Union[str, List[str]]):
    allowed_list = [roles] if isinstance(roles, str) else roles
    return Depends(RoleChecker(allowed_list))


def require_permission(permissions: Union[str, List[str]]):
    required_list = [permissions] if isinstance(permissions, str) else permissions
    return Depends(PermissionChecker(required_list))
