import uuid
from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.repository import RoleRepository, UserRepository
from app.auth.schemas import LoginRequest, UserCreate
from app.core.exceptions import BadRequestException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    async def register_guest(self, user_in: UserCreate) -> User:
        """Register a new user with the default 'Guest' role."""
        existing_user = await self.user_repo.get_by_email(user_in.email)
        if existing_user:
            raise BadRequestException("A user with this email address already exists.")

        # Default role for public registration is 'Guest'
        role = await self.role_repo.get_by_name("Guest")
        if not role:
            # Fallback/Auto-creation of Guest role if not seeded yet
            role = await self.role_repo.create_if_not_exists(
                name="Guest", description="Standard Guest account"
            )

        hashed_password = get_password_hash(user_in.password)
        user = await self.user_repo.create(user_in, hashed_password, role.id)
        return user

    async def authenticate_user(self, credentials: LoginRequest) -> Tuple[User, str, str]:
        """Authenticate a user. Returns User, access_token, refresh_token."""
        user = await self.user_repo.get_by_email(credentials.email)
        if not user:
            raise UnauthorizedException("Incorrect email or password")

        if not verify_password(credentials.password, user.hashed_password):
            raise UnauthorizedException("Incorrect email or password")

        if not user.is_active:
            raise UnauthorizedException("User account is deactivated")

        # Generate tokens
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> Tuple[User, str, str]:
        """Verify refresh token and issue new access & refresh tokens."""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid refresh token")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Invalid refresh token payload")

        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
            raise UnauthorizedException("Invalid user ID in token")

        user = await self.user_repo.get_by_id(user_uuid)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or deactivated")

        # Generate new tokens (rotating the refresh token too is secure)
        new_access = create_access_token(subject=user.id)
        new_refresh = create_refresh_token(subject=user.id)

        return user, new_access, new_refresh

    async def change_password(self, user: User, old_password: str, new_password: str) -> User:
        """Change password for an authenticated user."""
        if not verify_password(old_password, user.hashed_password):
            raise BadRequestException("Incorrect old password")

        hashed_password = get_password_hash(new_password)
        updated_user = await self.user_repo.update(user, {"hashed_password": hashed_password})
        return updated_user
