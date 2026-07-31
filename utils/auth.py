"""
Authentication utilities: JWT token management, decorators.
Supports both access tokens and refresh tokens.
"""

import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from utils.logger import get_logger

logger = get_logger("auth")


def create_token(user_id, token_type="access"):
    """Create a JWT token (access or refresh)."""
    if token_type == "refresh":
        expiry_hours = current_app.config.get("JWT_REFRESH_EXPIRY_DAYS", 30) * 24
    else:
        expiry_hours = current_app.config.get("JWT_EXPIRY_HOURS", 72)

    payload = {
        "user_id": str(user_id),
        "type": token_type,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def create_token_pair(user_id):
    """Create both access and refresh tokens."""
    return {
        "access_token": create_token(user_id, "access"),
        "refresh_token": create_token(user_id, "refresh"),
    }


def decode_token(token, expected_type="access"):
    """Decode and validate a JWT token. Returns user_id or None."""
    try:
        payload = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
        if payload.get("type") != expected_type:
            return None
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        logger.debug("Token expired")
        return None
    except jwt.InvalidTokenError:
        logger.debug("Invalid token")
        return None


def token_required(f):
    """Decorator to protect routes with JWT access token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401

        token = auth_header.split(" ")[1]
        user_id = decode_token(token, "access")
        if user_id is None:
            return jsonify({"error": "Token expired or invalid"}), 401

        request.user_id = user_id
        return f(*args, **kwargs)

    return decorated


def optional_token(f):
    """Decorator for routes that work with or without auth."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            user_id = decode_token(token, "access")
            if user_id:
                request.user_id = user_id
            else:
                request.user_id = None
        else:
            request.user_id = None
        return f(*args, **kwargs)

    return decorated
