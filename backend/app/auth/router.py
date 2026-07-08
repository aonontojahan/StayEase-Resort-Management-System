from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    Token,
    UserCreate,
    UserRead,
)
from app.auth.service import AuthService
from app.core.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new guest account and automatically return authentication tokens."""
    auth_service = AuthService(db)
    user = await auth_service.register_guest(user_in)
    
    # Auto-login upon registration
    login_credentials = LoginRequest(email=user_in.email, password=user_in.password)
    user, access_token, refresh_token = await auth_service.authenticate_user(login_credentials)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate credentials and return session tokens."""
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.authenticate_user(credentials)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=Token)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh session token and return a new access/refresh token pair."""
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.refresh_tokens(body.refresh_token)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return UserRead.model_validate(current_user)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the password for the current authenticated user."""
    auth_service = AuthService(db)
    await auth_service.change_password(current_user, body.old_password, body.new_password)
    return {"detail": "Password updated successfully"}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """Sign out the current user session (client should discard client-side tokens)."""
    return {"detail": "Logged out successfully"}
