"""Security and rate limiting module for Utsav Planner.

Provides:
- Thread-safe sliding window rate limiting with bounded memory and stale IP eviction.
- Separate rate limits for AI-intensive endpoints vs general endpoints.
- Client IP extraction respecting configurable proxy trust.
- Payload size limiting (rejecting requests > 64 KB).
- Content-Type enforcement (requiring application/json for POST /api/*).
- Strict HTTP security headers and no-store caching on API responses.
"""

import logging
import math
import threading
import time
from typing import Dict, List, Optional, Tuple

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

logger = logging.getLogger("utsav_planner.security")

MAX_PAYLOAD_SIZE = 64 * 1024  # 64 KB limit


class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter with bounded memory and stale IP eviction."""

    def __init__(
        self,
        max_requests: int,
        window_seconds: float = 60.0,
        max_tracked_ips: int = 10000,
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_tracked_ips = max_tracked_ips
        self._lock = threading.Lock()
        self._records: Dict[str, List[float]] = {}

    def check_rate_limit(self, ip: str, now: Optional[float] = None) -> Tuple[bool, int]:
        """Check if request is allowed for IP under sliding window.

        Args:
            ip: Client IP identifier.
            now: Optional timestamp override for deterministic testing.

        Returns:
            Tuple of (is_allowed, retry_after_seconds).
        """
        current_time = time.monotonic() if now is None else now
        cutoff = current_time - self.window_seconds

        with self._lock:
            # 1. Proactively evict stale records if approaching memory capacity
            if len(self._records) >= self.max_tracked_ips:
                self._evict_stale_locked(current_time)

            # 2. Filter timestamps within the current sliding window
            timestamps = self._records.get(ip, [])
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]

            if len(valid_timestamps) >= self.max_requests:
                # Rate limit exceeded: calculate seconds until oldest entry rolls out
                oldest = valid_timestamps[0]
                retry_after = max(1, int(math.ceil(self.window_seconds - (current_time - oldest))))
                self._records[ip] = valid_timestamps
                return False, retry_after

            # 3. Allow request and record timestamp
            valid_timestamps.append(current_time)
            self._records[ip] = valid_timestamps
            return True, 0

    def evict_stale(self, now: Optional[float] = None) -> int:
        """Manually trigger stale IP eviction (useful for testing and memory maintenance)."""
        current_time = time.monotonic() if now is None else now
        with self._lock:
            return self._evict_stale_locked(current_time)

    def _evict_stale_locked(self, current_time: float) -> int:
        cutoff = current_time - self.window_seconds
        stale_keys = [
            ip for ip, timestamps in self._records.items()
            if not timestamps or timestamps[-1] <= cutoff
        ]
        for key in stale_keys:
            del self._records[key]

        # If still exceeding capacity, evict the oldest least-recently active IPs
        if len(self._records) > self.max_tracked_ips:
            sorted_ips = sorted(
                self._records.items(),
                key=lambda item: item[1][-1] if item[1] else 0
            )
            excess = len(self._records) - self.max_tracked_ips
            for ip, _ in sorted_ips[:excess]:
                del self._records[ip]

        return len(stale_keys)

    def clear(self) -> None:
        """Reset all rate limit tracking records."""
        with self._lock:
            self._records.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._records)


# Global rate limiter instances configured from settings
settings = get_settings()
ai_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.rate_limit_ai_per_minute,
    window_seconds=60.0,
)
general_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.rate_limit_general_per_minute,
    window_seconds=60.0,
)


def get_client_ip(request: Request) -> str:
    """Extract client IP address respecting proxy trust configuration."""
    current_settings = get_settings()
    if current_settings.trust_proxy_headers:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return client_ip
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforce strict HTTP security headers and no-store caching on API responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log structured request metadata without leaking user input, payload bodies, or secrets."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                "%s %s -> %d (%.2fms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "%s %s -> 500 (%.2fms)",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforce sliding window rate limits on API requests."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/api/"):
            client_ip = get_client_ip(request)

            # AI-heavy routes use stricter AI rate limit
            if path in ("/api/plan", "/api/refine"):
                allowed, retry_after = ai_rate_limiter.check_rate_limit(client_ip)
            else:
                allowed, retry_after = general_rate_limiter.check_rate_limit(client_ip)

            if not allowed:
                logger.warning(
                    "Rate limit exceeded for IP %s on %s; retry after %ds",
                    client_ip,
                    path,
                    retry_after,
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={"Retry-After": str(retry_after)},
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Too many requests. Please wait before retrying.",
                        }
                    },
                )

        return await call_next(request)


class PayloadTooLargeError(Exception):
    """Internal sentinel exception when streaming body exceeds max size."""
    pass


class PayloadAndContentTypeMiddleware:
    """Enforce max payload size (64 KB) and application/json Content-Type on POST /api/* via pure ASGI."""

    def __init__(self, app, max_payload_size: int = MAX_PAYLOAD_SIZE):
        self.app = app
        self.max_payload_size = max_payload_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if path.startswith("/api/"):
            headers = dict(scope.get("headers", []))
            method = scope.get("method", "GET")

            # 1. Content-Type enforcement on POST requests
            if method == "POST":
                content_type = headers.get(b"content-type", b"").decode("latin-1")
                if not content_type.lower().startswith("application/json"):
                    response = JSONResponse(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        content={
                            "error": {
                                "code": "UNSUPPORTED_MEDIA_TYPE",
                                "message": "Content-Type must be application/json.",
                            }
                        },
                    )
                    return await response(scope, receive, send)

            # 2. Content-Length quick check
            content_length = headers.get(b"content-length")
            if content_length:
                try:
                    if int(content_length.decode("latin-1")) > self.max_payload_size:
                        response = JSONResponse(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            content={
                                "error": {
                                    "code": "PAYLOAD_TOO_LARGE",
                                    "message": "Request payload exceeds size limit.",
                                }
                            },
                        )
                        return await response(scope, receive, send)
                except ValueError:
                    pass

            # 3. Stream-count bytes received to guard against chunked transfer overflow
            total_bytes = 0

            async def limited_receive():
                nonlocal total_bytes
                msg = await receive()
                if msg["type"] == "http.request":
                    total_bytes += len(msg.get("body", b""))
                    if total_bytes > self.max_payload_size:
                        raise PayloadTooLargeError()
                return msg

            try:
                return await self.app(scope, limited_receive, send)
            except PayloadTooLargeError:
                response = JSONResponse(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    content={
                        "error": {
                            "code": "PAYLOAD_TOO_LARGE",
                            "message": "Request payload exceeds size limit.",
                        }
                    },
                )
                return await response(scope, receive, send)

        return await self.app(scope, receive, send)

