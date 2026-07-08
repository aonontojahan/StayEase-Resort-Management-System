import logging
import sys

from app.core.config import settings

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def setup_logging():
    """Set up structured logging for the FastAPI application."""
    logging.basicConfig(
        level=logging.INFO if settings.ENVIRONMENT != "development" else logging.DEBUG,
        format=LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )

    # Disable spammy logs from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
