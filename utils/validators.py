"""
Input validation and sanitization helpers.
Used across all route modules for consistent request validation.
"""

import re
from datetime import datetime


def validate_email(email):
    """Validate email format. Returns cleaned email or None."""
    if not email or not isinstance(email, str):
        return None
    email = email.strip().lower()
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if re.match(pattern, email):
        return email
    return None


def validate_password(password):
    """Validate password strength.
    Returns (is_valid, error_message) tuple."""
    if not password or not isinstance(password, str):
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, None


def validate_required_fields(data, fields):
    """Check that all required fields are present and non-empty.
    Returns (is_valid, missing_fields) tuple."""
    if not data:
        return False, fields
    missing = [f for f in fields if not data.get(f) and data.get(f) != 0]
    return len(missing) == 0, missing


def validate_date(date_str):
    """Validate a date string in YYYY-MM-DD format. Returns the string or None."""
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        return None


def validate_datetime(dt_str):
    """Validate a datetime string in ISO format. Returns the string or None."""
    if not dt_str or not isinstance(dt_str, str):
        return None
    try:
        datetime.fromisoformat(dt_str)
        return dt_str
    except ValueError:
        return None


def sanitize_string(value, max_length=500):
    """Sanitize a string input - strip whitespace, limit length."""
    if not value or not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


def validate_positive_number(value, field_name="Value"):
    """Validate that a value is a positive number.
    Returns (is_valid, number_or_error) tuple."""
    try:
        num = float(value)
        if num < 0:
            return False, f"{field_name} must be non-negative"
        return True, num
    except (TypeError, ValueError):
        return False, f"{field_name} must be a number"


def validate_enum(value, allowed_values, field_name="Value"):
    """Validate that a value is one of the allowed options.
    Returns (is_valid, error_message) tuple."""
    if value not in allowed_values:
        return False, f"{field_name} must be one of: {', '.join(allowed_values)}"
    return True, None


def get_today_str():
    """Get today's date as YYYY-MM-DD string."""
    return datetime.utcnow().strftime("%Y-%m-%d")


def get_now_iso():
    """Get current datetime as ISO string."""
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
