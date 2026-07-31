"""
Simple in-memory rate limiter for Flask routes.
Uses a sliding window approach to track requests per IP/user.
"""

import time
from functools import wraps
from flask import request, jsonify
from utils.logger import get_logger

logger = get_logger("rate_limiter")

# In-memory storage for rate limiting
_rate_limit_store = {}


def _clean_old_entries(timestamp, window_seconds):
    """Remove entries older than the window."""
    cutoff = timestamp - window_seconds
    return {k: v for k, v in _rate_limit_store.items() if v > cutoff}


def rate_limit(max_requests=60, window_seconds=60, key_func=None):
    """Rate limiting decorator.

    Args:
        max_requests: Maximum number of requests allowed in the window
        window_seconds: Time window in seconds
        key_func: Function to generate the rate limit key (defaults to IP address)
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Generate rate limit key
            if key_func:
                key = key_func()
            else:
                key = request.remote_addr or "unknown"

            # Add route to key for per-endpoint limiting
            full_key = f"{key}:{request.path}"
            now = time.time()

            # Clean old entries periodically (simple cleanup)
            if len(_rate_limit_store) > 10000:
                _rate_limit_store.clear()

            # Count requests in the current window
            request_times = _rate_limit_store.get(full_key, [])
            recent_requests = [t for t in request_times if t > now - window_seconds]

            if len(recent_requests) >= max_requests:
                logger.warning(f"Rate limit exceeded for {full_key}: {len(recent_requests)}/{max_requests}")
                retry_after = int(recent_requests[0] + window_seconds - now) + 1
                response = jsonify({"error": "Too many requests. Please try again later."})
                response.status_code = 429
                response.headers["Retry-After"] = str(retry_after)
                return response

            # Record this request
            recent_requests.append(now)
            _rate_limit_store[full_key] = recent_requests

            return f(*args, **kwargs)
        return decorated
    return decorator


# Pre-configured rate limiters for common use cases
auth_rate_limit = rate_limit(max_requests=10, window_seconds=60)
api_rate_limit = rate_limit(max_requests=120, window_seconds=60)
