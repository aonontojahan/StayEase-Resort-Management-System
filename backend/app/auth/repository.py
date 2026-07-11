import uuid
from datetime import datetime, timezone
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Permission, Role, TokenBlacklist, User
from app.auth.schemas import UserCreate


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(
        self, user_in: UserCreate, hashed_password: str, role_id: uuid.UUID
    ) -> User:
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            phone_number=user_in.phone_number,
            role_id=role_id,
        )
        self.db.add(db_user)
        await self.db.flush()
        await self.db.refresh(db_user)
        return db_user

    async def update(self, user: User, update_data: dict) -> User:
        for field, value in update_data.items():
            setattr(user, field, value)
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def count(self) -> int:
        result = await self.db.execute(select(User))
        return len(result.scalars().all())


class RoleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, role_id: uuid.UUID) -> Optional[Role]:
        result = await self.db.execute(
            select(Role)
            .where(Role.id == role_id)
            .options(selectinload(Role.permissions))
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Role]:
        result = await self.db.execute(
            select(Role)
            .where(Role.name == name)
            .options(selectinload(Role.permissions))
        )
        return result.scalar_one_or_none()

    async def create_if_not_exists(
        self, name: str, description: Optional[str] = None
    ) -> Role:
        role = await self.get_by_name(name)
        if not role:
            role = Role(name=name, description=description)
            self.db.add(role)
            await self.db.flush()
        return role


class PermissionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_name(self, name: str) -> Optional[Permission]:
        result = await self.db.execute(
            select(Permission).where(Permission.name == name)
        )
        return result.scalar_one_or_none()

    async def create_if_not_exists(
        self, name: str, description: Optional[str] = None
    ) -> Permission:
        permission = await self.get_by_name(name)
        if not permission:
            permission = Permission(name=name, description=description)
            self.db.add(permission)
            await self.db.flush()
        return permission


class TokenBlacklistRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, jti: str, token_type: str, expires_at: datetime) -> None:
        entry = TokenBlacklist(
            token_jti=jti,
            token_type=token_type,
            expires_at=expires_at,
        )
        self.db.add(entry)
        await self.db.flush()

    async def is_blacklisted(self, jti: str) -> bool:
        result = await self.db.execute(
            select(TokenBlacklist).where(
                TokenBlacklist.token_jti == jti,
                TokenBlacklist.expires_at > datetime.now(timezone.utc),
            )
        )
        return result.scalar_one_or_none() is not None

    async def cleanup_expired(self) -> int:
        result = await self.db.execute(
            select(TokenBlacklist).where(
                TokenBlacklist.expires_at <= datetime.now(timezone.utc)
            )
        )
        expired = result.scalars().all()
        for entry in expired:
            await self.db.delete(entry)
        await self.db.flush()
        return len(expired)
