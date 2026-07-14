import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.exceptions import StayEaseException


class RateLimitExceeded(StayEaseException):
    def __init__(self):
        super().__init__("Too many requests. Please try again later.", status_code=429)


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> Tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        async with self._lock:
            window = self._requests[key]
            window[:] = [t for t in window if t > cutoff]
            if len(window) >= self.max_requests:
                retry_after = int(window[0] + self.window_seconds - now)
                return False, retry_after
            window.append(now)
            return True, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, limiter: SlidingWindowRateLimiter):
        super().__init__(app)
        self.limiter = limiter

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        allowed, retry_after = await self.limiter.check(client_ip)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Too many requests. Retry after {retry_after} seconds.",
                    "status": "error",
                },
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)
