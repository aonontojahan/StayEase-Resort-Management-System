import time
import logging
from prometheus_client import (
    Counter,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
    REGISTRY,
)
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# Metrics definitions
HTTP_REQUESTS_TOTAL = Counter(
    "stayease_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

HTTP_REQUEST_DURATION = Histogram(
    "stayease_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

ACTIVE_USERS = Counter(
    "stayease_active_users_total",
    "Total number of user actions",
    ["role"],
)

BOOKINGS_CREATED = Counter(
    "stayease_bookings_created_total",
    "Total number of bookings created",
)

PAYMENTS_PROCESSED = Counter(
    "stayease_payments_processed_total",
    "Total number of payments processed",
    ["method"],
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/metrics":
            return await call_next(request)

        start_time = time.monotonic()
        response = await call_next(request)
        duration = time.monotonic() - start_time

        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
        ).inc()

        HTTP_REQUEST_DURATION.labels(
            method=request.method,
            endpoint=request.url.path,
        ).observe(duration)

        return response
