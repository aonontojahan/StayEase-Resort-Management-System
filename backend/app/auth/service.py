import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.repository import RoleRepository, TokenBlacklistRepository, UserRepository
from app.auth.schemas import LoginRequest, UserCreate
from app.core.exceptions import BadRequestException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.core.config import settings
from app.core.email import send_html_email


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.blacklist_repo = TokenBlacklistRepository(db)

    async def _send_reset_email(self, email: str, token: str) -> None:
        reset_link = f"{settings.CLIENT_URL or 'http://localhost:5173'}/reset-password?token={token}"
        html = f"""
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        """
        send_html_email(
            to_email=email,
            subject="StayEase Resort - Password Reset",
            html_content=html,
            text_content=f"Reset your password here: {reset_link}",
        )

    async def _send_verification_email(self, email: str, token: str) -> None:
        verify_link = f"{settings.CLIENT_URL or 'http://localhost:5173'}/verify-email?token={token}"
        html = f"""
        <h2>Verify Your Email</h2>
        <p>Click the link below to verify your email address.</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        """
        send_html_email(
            to_email=email,
            subject="StayEase Resort - Email Verification",
            html_content=html,
            text_content=f"Verify your email here: {verify_link}",
        )

    async def initiate_password_reset(self, email: str) -> None:
        user = await self.user_repo.get_by_email(email)
        if not user:
            return
        token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(hours=1),
        )
        payload = decode_token(token)
        jti = payload.get("jti", "")
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        await self.blacklist_repo.add(
            jti=jti, token_type="password_reset", expires_at=expires_at
        )
        await self._send_reset_email(email, token)

    async def reset_password(self, token: str, new_password: str) -> None:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise BadRequestException("Invalid or expired reset token.")

        jti = payload.get("jti")
        if jti and await self.blacklist_repo.is_blacklisted(jti):
            raise BadRequestException("Reset token has already been used or expired.")

        user_id = payload.get("sub")
        if not user_id:
            raise BadRequestException("Invalid reset token payload.")

        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise BadRequestException("User not found.")

        if jti:
            await self.blacklist_repo.add(
                jti=jti,
                token_type="password_reset",
                expires_at=datetime.now(timezone.utc),
            )

        user.hashed_password = get_password_hash(new_password)
        self.db.add(user)
        await self.db.flush()

    async def verify_email(self, token: str) -> None:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise BadRequestException("Invalid or expired verification token.")

        jti = payload.get("jti")
        if jti and await self.blacklist_repo.is_blacklisted(jti):
            raise BadRequestException(
                "Verification token has already been used or expired."
            )

        user_id = payload.get("sub")
        if not user_id:
            raise BadRequestException("Invalid verification token payload.")

        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise BadRequestException("User not found.")

        if jti:
            await self.blacklist_repo.add(
                jti=jti,
                token_type="email_verify",
                expires_at=datetime.now(timezone.utc),
            )

        user.is_verified = True
        self.db.add(user)
        await self.db.flush()

    async def resend_verification(self, email: str) -> None:
        user = await self.user_repo.get_by_email(email)
        if not user or user.is_verified:
            return
        token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(hours=24),
        )
        payload = decode_token(token)
        jti = payload.get("jti", "")
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        await self.blacklist_repo.add(
            jti=jti, token_type="email_verify", expires_at=expires_at
        )
        await self._send_verification_email(email, token)

    async def register_guest(self, user_in: UserCreate) -> User:
        existing_user = await self.user_repo.get_by_email(user_in.email)
        if existing_user:
            raise BadRequestException("A user with this email address already exists.")

        role = await self.role_repo.get_by_name("Guest")
        if not role:
            role = await self.role_repo.create_if_not_exists(
                name="Guest", description="Standard Guest account"
            )

        hashed_password = get_password_hash(user_in.password)
        user = await self.user_repo.create(user_in, hashed_password, role.id)
        return user

    async def authenticate_user(
        self, credentials: LoginRequest
    ) -> Tuple[User, str, str]:
        user = await self.user_repo.get_by_email(credentials.email)
        if not user:
            raise UnauthorizedException("Incorrect email or password")

        if not verify_password(credentials.password, user.hashed_password):
            raise UnauthorizedException("Incorrect email or password")

        if not user.is_active:
            raise UnauthorizedException("User account is deactivated")

        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> Tuple[User, str, str]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid refresh token")

        token_jti = payload.get("jti")
        if token_jti and await self.blacklist_repo.is_blacklisted(token_jti):
            raise UnauthorizedException("Refresh token has been revoked")

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

        new_access = create_access_token(subject=user.id)
        new_refresh = create_refresh_token(subject=user.id)

        return user, new_access, new_refresh

    async def change_password(
        self, user: User, old_password: str, new_password: str
    ) -> User:
        if not verify_password(old_password, user.hashed_password):
            raise BadRequestException("Incorrect old password")

        hashed_password = get_password_hash(new_password)
        updated_user = await self.user_repo.update(
            user, {"hashed_password": hashed_password}
        )
        return updated_user

    async def logout(self, refresh_token: str, access_token: str) -> None:
        for token, token_type in [(refresh_token, "refresh"), (access_token, "access")]:
            payload = decode_token(token)
            if payload and payload.get("jti"):
                jti = payload["jti"]
                exp = payload.get("exp")
                expires_at = (
                    datetime.fromtimestamp(exp, tz=timezone.utc)
                    if exp
                    else datetime.now(timezone.utc)
                )
                await self.blacklist_repo.add(
                    jti=jti,
                    token_type=token_type,
                    expires_at=expires_at,
                )
