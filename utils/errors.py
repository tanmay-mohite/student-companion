"""
Custom exception classes and Flask error handlers.
Provides consistent error responses across all API endpoints.
"""

from flask import jsonify
from utils.logger import get_logger

logger = get_logger("errors")


# --- Custom Exception Classes ---

class AppError(Exception):
    """Base application error."""
    def __init__(self, message="An unexpected error occurred", status_code=500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ValidationError(AppError):
    """Raised when input validation fails."""
    def __init__(self, message="Validation failed"):
        super().__init__(message, status_code=400)


class AuthenticationError(AppError):
    """Raised when authentication fails."""
    def __init__(self, message="Authentication required"):
        super().__init__(message, status_code=401)


class ForbiddenError(AppError):
    """Raised when user lacks permissions."""
    def __init__(self, message="You don't have permission to perform this action"):
        super().__init__(message, status_code=403)


class NotFoundError(AppError):
    """Raised when a requested resource is not found."""
    def __init__(self, message="Resource not found"):
        super().__init__(message, status_code=404)


class ConflictError(AppError):
    """Raised when a resource already exists."""
    def __init__(self, message="Resource already exists"):
        super().__init__(message, status_code=409)


class RateLimitError(AppError):
    """Raised when rate limit is exceeded."""
    def __init__(self, message="Too many requests. Please try again later"):
        super().__init__(message, status_code=429)


# --- Flask Error Handler Registration ---

def register_error_handlers(app):
    """Register all error handlers with the Flask app."""

    @app.errorhandler(AppError)
    def handle_app_error(error):
        logger.warning(f"AppError [{error.status_code}]: {error.message}")
        return jsonify({"error": error.message}), error.status_code

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({"error": "Bad request"}), 400

    @app.errorhandler(401)
    def handle_unauthorized(error):
        return jsonify({"error": "Authentication required"}), 401

    @app.errorhandler(403)
    def handle_forbidden(error):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(409)
    def handle_conflict(error):
        return jsonify({"error": "Resource already exists"}), 409

    @app.errorhandler(429)
    def handle_rate_limit(error):
        return jsonify({"error": "Too many requests"}), 429

    @app.errorhandler(500)
    def handle_internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({"error": "Internal server error"}), 500
