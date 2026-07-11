import os
from typing import Any, List, Optional
from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "StayEase Resort Management System"
    ENVIRONMENT: str = "development"

    # JWT Authentication - NO hardcoded fallback; must be set via .env
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/stayease"

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip():
            return v.strip()
        if os.environ.get("ENVIRONMENT") == "development":
            import secrets

            generated = secrets.token_urlsafe(64)
            print(f"WARNING: No SECRET_KEY set. Generated temporary key: {generated}")
            print("Set SECRET_KEY in your .env file for persistence.")
            return generated
        raise ValueError(
            "SECRET_KEY must be set in .env. "
            'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
        )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any) -> Any:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith(
                "postgresql+asyncpg://"
            ):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            v = v.replace("sslmode=require", "ssl=require")
            return v
        return v

    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Rate Limiting
    RATE_LIMIT_MAX_REQUESTS: int = 20
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Cloudinary Config
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # Stripe Config
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # SMTP / Email Config
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None


settings = Settings()
