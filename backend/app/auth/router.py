import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User
from app.auth.repository import RoleRepository, UserRepository
from app.core.exceptions import (
    ForbiddenException,
    BadRequestException,
    NotFoundException,
)
from app.core.pagination import PaginationParams
from app.core.security import get_password_hash
from app.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserCreateWithRole,
    UserRead,
    UserRoleUpdate,
    UserUpdate,
    VerifyEmailRequest,
)
from app.auth.service import AuthService
from app.core.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user = await auth_service.register_guest(user_in)

    login_credentials = LoginRequest(email=user_in.email, password=user_in.password)
    user, access_token, refresh_token = await auth_service.authenticate_user(
        login_credentials
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.authenticate_user(
        credentials
    )
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=Token)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.refresh_tokens(
        body.refresh_token
    )
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_current_user(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    update_data = body.model_dump(exclude_unset=True)
    updated_user = await user_repo.update(current_user, update_data)
    result = await db.execute(
        select(User).where(User.id == updated_user.id).options(selectinload(User.role))
    )
    full_user = result.scalar_one()
    return UserRead.model_validate(full_user)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.change_password(
        current_user, body.old_password, body.new_password
    )
    return {"detail": "Password updated successfully"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.initiate_password_reset(body.email)
    return {"detail": "If the email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.reset_password(body.token, body.new_password)
    return {"detail": "Password has been reset successfully."}


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.verify_email(body.token)
    return {"detail": "Email verified successfully."}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.resend_verification(body.email)
    return {"detail": "If the email exists, a verification link has been sent."}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    body: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.logout(body.refresh_token, body.access_token)
    return {"detail": "Logged out successfully"}


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreateWithRole,
    current_user: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.name == "Manager" and user_in.role_name == "Resort Owner":
        raise ForbiddenException("Managers cannot create Resort Owners.")

    user_repo = UserRepository(db)
    role_repo = RoleRepository(db)

    existing_user = await user_repo.get_by_email(user_in.email)
    if existing_user:
        raise BadRequestException("User with this email already exists.")

    target_role = await role_repo.get_by_name(user_in.role_name)
    if not target_role:
        raise BadRequestException(f"Role '{user_in.role_name}' does not exist.")

    hashed_pw = get_password_hash(user_in.password)
    new_user = await user_repo.create(user_in, hashed_pw, target_role.id)
    full_user = await user_repo.get_by_id(new_user.id)
    return UserRead.model_validate(full_user)


@router.get("/users", response_model=List[UserRead])
async def list_users(
    pagination: PaginationParams = Depends(),
    current_user: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .offset(pagination.skip)
        .limit(pagination.limit)
    )
    users = result.scalars().all()
    user_repo = UserRepository(db)
    total = await user_repo.count()
    return JSONResponse(
        content=jsonable_encoder([UserRead.model_validate(u) for u in users]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )


@router.patch("/users/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    target = await user_repo.get_by_id_full(user_id)
    if not target:
        raise NotFoundException("User not found.")
    if target.id == current_user.id:
        raise BadRequestException("You cannot deactivate yourself.")
    update_data = {"is_active": False}
    updated = await user_repo.update(target, update_data)
    full = await db.execute(
        select(User).where(User.id == updated.id).options(selectinload(User.role))
    )
    return UserRead.model_validate(full.scalar_one())


@router.patch("/users/{user_id}/activate", response_model=UserRead)
async def activate_user(
    user_id: uuid.UUID,
    current_user: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    target = await user_repo.get_by_id_full(user_id)
    if not target:
        raise NotFoundException("User not found.")
    update_data = {"is_active": True}
    updated = await user_repo.update(target, update_data)
    full = await db.execute(
        select(User).where(User.id == updated.id).options(selectinload(User.role))
    )
    return UserRead.model_validate(full.scalar_one())


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    target = await user_repo.get_by_id_full(user_id)
    if not target:
        raise NotFoundException("User not found.")
    if target.id == current_user.id:
        raise BadRequestException("You cannot delete yourself.")

    if current_user.role.name == "Manager":
        if target.role.name == "Resort Owner":
            raise ForbiddenException("Managers cannot delete the Resort Owner.")
        if target.role.name == "Manager":
            raise ForbiddenException("Managers cannot delete other Managers.")

    from app.bookings.models import Booking
    from app.invoices.models import Invoice

    has_bookings = await db.execute(
        select(Booking.id).where(Booking.guest_id == user_id).limit(1)
    )
    if has_bookings.scalar_one_or_none():
        raise BadRequestException(
            "Cannot delete this user because they have existing bookings. "
            "Reassign or cancel the bookings first."
        )
    has_invoices = await db.execute(
        select(Invoice.id).where(Invoice.guest_id == user_id).limit(1)
    )
    if has_invoices.scalar_one_or_none():
        raise BadRequestException(
            "Cannot delete this user because they have existing invoices. "
            "Handle the invoices first."
        )

    await user_repo.delete(target)
    await db.commit()
    return {"detail": f"User '{target.full_name}' deleted successfully."}


@router.patch("/users/{user_id}/role", response_model=UserRead)
async def change_user_role(
    user_id: uuid.UUID,
    body: UserRoleUpdate,
    current_user: User = require_role(["Resort Owner", "Manager"]),
    db: AsyncSession = Depends(get_db),
):
    user_repo = UserRepository(db)
    role_repo = RoleRepository(db)

    target = await user_repo.get_by_id_full(user_id)
    if not target:
        raise NotFoundException("User not found.")

    new_role = await role_repo.get_by_name(body.role_name)
    if not new_role:
        raise BadRequestException(f"Role '{body.role_name}' does not exist.")

    if current_user.role.name == "Manager" and new_role.name == "Resort Owner":
        raise ForbiddenException("Managers cannot assign the Resort Owner role.")

    if target.id == current_user.id:
        raise BadRequestException("You cannot change your own role.")

    updated = await user_repo.update(target, {"role_id": new_role.id})
    full = await db.execute(
        select(User).where(User.id == updated.id).options(selectinload(User.role))
    )
    return UserRead.model_validate(full.scalar_one())
