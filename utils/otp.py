"""
OTP (One-Time Password) generation and verification.
Used for email verification, password reset, and 2FA.
"""

import random
import string
from datetime import datetime, timedelta
from utils.logger import get_logger

logger = get_logger("otp")


def generate_otp(length=6):
    """Generate a numeric OTP of specified length."""
    return "".join(random.choices(string.digits, k=length))


def store_otp(db, user_id, otp, purpose="verification", expiry_minutes=10):
    """Store an OTP in the database with an expiry time."""
    # Invalidate any existing OTPs for this user+purpose
    db.otps.update_many(
        {"user_id": user_id, "purpose": purpose, "used": False},
        {"$set": {"used": True}},
    )

    expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
    db.otps.insert_one({
        "user_id": user_id,
        "otp": otp,
        "purpose": purpose,
        "created_at": datetime.utcnow(),
        "expires_at": expiry,
        "used": False,
    })
    logger.info(f"OTP generated for user {user_id}, purpose: {purpose}, expires: {expiry}")
    return otp


def verify_otp(db, user_id, otp, purpose="verification"):
    """Verify an OTP. Returns True if valid, False otherwise."""
    record = db.otps.find_one({
        "user_id": user_id,
        "otp": otp,
        "purpose": purpose,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()},
    })

    if not record:
        logger.debug(f"OTP verification failed for user {user_id}, purpose: {purpose}")
        return False

    # Mark OTP as used
    db.otps.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    logger.info(f"OTP verified for user {user_id}, purpose: {purpose}")
    return True


def get_password_strength(password):
    """Evaluate password strength. Returns dict with score and feedback."""
    if not password:
        return {"score": 0, "label": "empty", "feedback": []}

    score = 0
    feedback = []

    # Length checks
    if len(password) < 6:
        feedback.append("Too short")
    elif len(password) < 8:
        score += 1
        feedback.append("Add more characters")
    elif len(password) < 12:
        score += 2
    else:
        score += 3

    # Character variety
    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)

    variety = sum([has_lower, has_upper, has_digit, has_special])

    if not has_upper:
        feedback.append("Add uppercase letters")
    if not has_lower:
        feedback.append("Add lowercase letters")
    if not has_digit:
        feedback.append("Add numbers")
    if not has_special:
        feedback.append("Add special characters")

    score += variety

    # Determine label
    if score <= 2:
        label = "weak"
    elif score <= 4:
        label = "fair"
    elif score <= 5:
        label = "good"
    else:
        label = "strong"

    return {
        "score": min(score, 7),
        "max_score": 7,
        "label": label,
        "feedback": feedback,
    }
