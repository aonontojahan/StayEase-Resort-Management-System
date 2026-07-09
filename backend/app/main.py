from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth.router import router as auth_router
from app.rooms.router import router as rooms_router
from app.bookings.router import router as bookings_router
from app.housekeeping.router import router as housekeeping_router
from app.payments.router import router as payments_router
from app.reports.router import router as reports_router
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.exceptions import StayEaseException
from app.core.logging import setup_logging
from app.core.seeding import seed_db

# Import all models so SQLAlchemy picks them up for create_all
import app.auth.models  # noqa
import app.rooms.models  # noqa
import app.bookings.models  # noqa
import app.housekeeping.models  # noqa
import app.payments.models  # noqa

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    setup_logging()
    logger.info("Starting up StayEase Backend...")

    # Create tables automatically in development if they don't exist
    if settings.ENVIRONMENT == "development":
        logger.info("Development mode detected. Automatically generating database tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Seed initial roles, permissions, and sample data
        async with SessionLocal() as session:
            await seed_db(session)

    yield

    # Shutdown actions
    logger.info("Shutting down StayEase Backend...")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for StayEase Resort Management System",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Custom Exception Handler
@app.exception_handler(StayEaseException)
async def stayease_exception_handler(request: Request, exc: StayEaseException):
    logger.warning(f"Application error on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "status": "error"},
    )


# General Exception Catch-all Handler (hide internals in production)
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled critical error on {request.url.path}: {str(exc)}")

    message = "An internal server error occurred."
    if settings.ENVIRONMENT == "development":
        message = str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": message, "status": "fail"},
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}


# Include all Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(rooms_router, prefix=settings.API_V1_STR)
app.include_router(bookings_router, prefix=settings.API_V1_STR)
app.include_router(housekeeping_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
