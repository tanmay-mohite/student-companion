import pyotp
import requests
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from utils.auth import create_token, create_token_pair, decode_token, token_required
from utils.db import to_object_id
from utils.validators import validate_email, sanitize_string, get_now_iso, get_today_str
from utils.otp import generate_otp, store_otp, verify_otp, get_password_strength
from utils.rate_limiter import auth_rate_limit
from utils.logger import get_logger

logger = get_logger("auth.routes")

auth_bp = Blueprint("auth", __name__)


# ============================================================
# Registration & Login
# ============================================================

@auth_bp.route("/register", methods=["POST"])
@auth_rate_limit
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = validate_email(data.get("email", ""))
    password = data.get("password", "")
    name = sanitize_string(data.get("name", ""), 100)

    if not email:
        return jsonify({"error": "Valid email is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if not name:
        return jsonify({"error": "Name is required"}), 400

    db = current_app.db
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    user = {
        "email": email,
        "password_hash": generate_password_hash(password),
        "name": name,
        "roll_no": sanitize_string(data.get("roll_no", ""), 50),
        "branch": sanitize_string(data.get("branch", ""), 50),
        "semester": sanitize_string(data.get("semester", ""), 20),
        "avatar": "",
        "theme": "light",
        "language": "en",
        "notification_settings": {"tasks": True, "attendance": True, "exams": True, "budget": True},
        "email_verified": False,
        "two_factor_enabled": False,
        "two_factor_secret": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = db.users.insert_one(user)
    user_id = str(result.inserted_id)

    db.streaks.insert_one({
        "user_id": user_id,
        "current_streak": 1,
        "longest_streak": 1,
        "last_login": get_today_str(),
    })

    # Send verification OTP
    otp = generate_otp()
    store_otp(db, user_id, otp, purpose="email_verification")
    logger.info(f"Registration OTP for {email}: {otp}")

    tokens = create_token_pair(user_id)
    logger.info(f"New user registered: {email}")

    return jsonify({
        "token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "user": _serialize_user(user, user_id),
        "message": "Registration successful. Please verify your email with the OTP sent.",
    }), 201


@auth_bp.route("/login", methods=["POST"])
@auth_rate_limit
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = validate_email(data.get("email", ""))
    password = data.get("password", "")
    remember_me = data.get("remember_me", False)

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db = current_app.db
    user = db.users.find_one({"email": email})

    # Check account lock
    if user and user.get("locked_until"):
        if datetime.utcnow() < user["locked_until"]:
            minutes_left = int((user["locked_until"] - datetime.utcnow()).total_seconds() / 60) + 1
            return jsonify({"error": f"Account locked. Try again in {minutes_left} minutes"}), 423
        else:
            db.users.update_one({"_id": user["_id"]}, {"$set": {"login_attempts": 0, "locked_until": None}})

    if not user or not check_password_hash(user["password_hash"], password):
        if user:
            attempts = user.get("login_attempts", 0) + 1
            max_attempts = current_app.config.get("MAX_LOGIN_ATTEMPTS", 5)
            if attempts >= max_attempts:
                lock_until = datetime.utcnow() + timedelta(
                    minutes=current_app.config.get("ACCOUNT_LOCK_MINUTES", 15)
                )
                db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"login_attempts": attempts, "locked_until": lock_until}},
                )
                logger.warning(f"Account locked due to failed logins: {email}")
                return jsonify({"error": f"Too many failed attempts. Account locked for {current_app.config.get('ACCOUNT_LOCK_MINUTES', 15)} minutes"}), 423
            else:
                remaining = max_attempts - attempts
                db.users.update_one({"_id": user["_id"]}, {"$set": {"login_attempts": attempts}})
                return jsonify({"error": f"Invalid email or password. {remaining} attempts remaining"}), 401
        return jsonify({"error": "Invalid email or password"}), 401

    # Check if 2FA is enabled
    if user.get("two_factor_enabled"):
        # Return a flag indicating 2FA is required
        return jsonify({
            "requires_2fa": True,
            "user_id": str(user["_id"]),
            "message": "Two-factor authentication required",
        })

    # Successful login
    _complete_login(db, user, remember_me)
    return jsonify({
        "token": _get_access_token(user, remember_me),
        "refresh_token": create_token(str(user["_id"]), "refresh"),
        "user": _serialize_user(user, user["_id"]),
    })


@auth_bp.route("/verify-2fa", methods=["POST"])
@auth_rate_limit
def verify_2fa():
    """Verify 2FA code after login."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user_id = data.get("user_id")
    code = data.get("code", "")
    remember_me = data.get("remember_me", False)

    if not user_id or not code:
        return jsonify({"error": "User ID and 2FA code are required"}), 400

    oid = to_object_id(user_id)
    if not oid:
        return jsonify({"error": "Invalid user ID"}), 400

    db = current_app.db
    user = db.users.find_one({"_id": oid})
    if not user or not user.get("two_factor_enabled"):
        return jsonify({"error": "2FA not enabled for this user"}), 400

    # Verify TOTP code
    totp = pyotp.TOTP(user["two_factor_secret"])
    if not totp.verify(code, valid_window=1):
        return jsonify({"error": "Invalid 2FA code"}), 401

    _complete_login(db, user, remember_me)
    return jsonify({
        "token": _get_access_token(user, remember_me),
        "refresh_token": create_token(str(user["_id"]), "refresh"),
        "user": _serialize_user(user, user["_id"]),
    })


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    """Refresh an expired access token using a valid refresh token."""
    data = request.get_json()
    if not data or not data.get("refresh_token"):
        return jsonify({"error": "Refresh token is required"}), 400

    user_id = decode_token(data["refresh_token"], "refresh")
    if user_id is None:
        return jsonify({"error": "Invalid or expired refresh token"}), 401

    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    tokens = create_token_pair(user_id)
    return jsonify({
        "token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    })


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _serialize_user(user, user["_id"])})


@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    """Logout - log the activity."""
    db = current_app.db
    db.activity_logs.insert_one({
        "user_id": request.user_id,
        "action": "logout",
        "ip_address": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "created_at": datetime.utcnow(),
    })
    logger.info(f"User logged out: {request.user_id}")
    return jsonify({"message": "Logged out successfully"})


# ============================================================
# Email Verification
# ============================================================

@auth_bp.route("/send-verification", methods=["POST"])
@token_required
def send_verification():
    """Send email verification OTP."""
    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("email_verified"):
        return jsonify({"message": "Email already verified"}), 200

    otp = generate_otp()
    store_otp(db, request.user_id, otp, purpose="email_verification")
    logger.info(f"Verification OTP for {user['email']}: {otp}")

    return jsonify({"message": "Verification OTP sent. Check your email or console."})


@auth_bp.route("/verify-email", methods=["POST"])
@token_required
def verify_email():
    """Verify email with OTP."""
    data = request.get_json()
    if not data or not data.get("otp"):
        return jsonify({"error": "OTP is required"}), 400

    db = current_app.db
    if verify_otp(db, request.user_id, data["otp"], purpose="email_verification"):
        db.users.update_one(
            {"_id": to_object_id(request.user_id)},
            {"$set": {"email_verified": True}},
        )
        logger.info(f"Email verified for user {request.user_id}")
        return jsonify({"message": "Email verified successfully"})
    else:
        return jsonify({"error": "Invalid or expired OTP"}), 400


# ============================================================
# Forgot Password & Reset
# ============================================================

@auth_bp.route("/forgot-password", methods=["POST"])
@auth_rate_limit
def forgot_password():
    """Request a password reset OTP."""
    data = request.get_json()
    if not data or not data.get("email"):
        return jsonify({"error": "Email is required"}), 400

    email = validate_email(data["email"])
    if not email:
        return jsonify({"error": "Valid email is required"}), 400

    db = current_app.db
    user = db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists
        return jsonify({"message": "If the email exists, a reset OTP has been sent."})

    otp = generate_otp()
    store_otp(db, str(user["_id"]), otp, purpose="password_reset")
    logger.info(f"Password reset OTP for {email}: {otp}")

    return jsonify({"message": "If the email exists, a reset OTP has been sent."})


@auth_bp.route("/reset-password", methods=["POST"])
@auth_rate_limit
def reset_password():
    """Reset password using OTP."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = validate_email(data.get("email", ""))
    otp = data.get("otp", "")
    new_password = data.get("new_password", "")

    if not email or not otp or not new_password:
        return jsonify({"error": "Email, OTP, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = current_app.db
    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid request"}), 400

    if not verify_otp(db, str(user["_id"]), otp, purpose="password_reset"):
        return jsonify({"error": "Invalid or expired OTP"}), 400

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": generate_password_hash(new_password),
            "login_attempts": 0,
            "locked_until": None,
            "updated_at": datetime.utcnow(),
        }},
    )
    logger.info(f"Password reset successful for {email}")
    return jsonify({"message": "Password reset successfully"})


# ============================================================
# Change Password (Authenticated)
# ============================================================

@auth_bp.route("/change-password", methods=["POST"])
@token_required
def change_password():
    """Change password for authenticated user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "Current and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user["password_hash"], current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": generate_password_hash(new_password),
            "updated_at": datetime.utcnow(),
        }},
    )
    logger.info(f"Password changed for user {request.user_id}")
    return jsonify({"message": "Password changed successfully"})


# ============================================================
# Password Strength Check
# ============================================================

@auth_bp.route("/password-strength", methods=["POST"])
def password_strength():
    """Check password strength without storing it."""
    data = request.get_json()
    if not data or not data.get("password"):
        return jsonify({"strength": {"score": 0, "label": "empty", "feedback": []}})

    strength = get_password_strength(data["password"])
    return jsonify({"strength": strength})


# ============================================================
# Two-Factor Authentication (TOTP)
# ============================================================

@auth_bp.route("/2fa/setup", methods=["GET"])
@token_required
def setup_2fa():
    """Generate a new 2FA secret and QR URI."""
    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("two_factor_enabled"):
        return jsonify({"message": "2FA is already enabled", "enabled": True})

    # Generate new secret
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user["email"],
        issuer_name="Student Companion",
    )

    # Store secret temporarily (not yet enabled)
    db.users.update_one(
        {"_id": to_object_id(request.user_id)},
        {"$set": {"two_factor_secret": secret, "updated_at": datetime.utcnow()}},
    )

    return jsonify({
        "secret": secret,
        "qr_uri": provisioning_uri,
        "enabled": False,
    })


@auth_bp.route("/2fa/verify-setup", methods=["POST"])
@token_required
def verify_2fa_setup():
    """Verify 2FA setup with a code from the authenticator app."""
    data = request.get_json()
    if not data or not data.get("code"):
        return jsonify({"error": "Code is required"}), 400

    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user or not user.get("two_factor_secret"):
        return jsonify({"error": "2FA setup not initiated"}), 400

    if user.get("two_factor_enabled"):
        return jsonify({"message": "2FA is already enabled", "enabled": True})

    totp = pyotp.TOTP(user["two_factor_secret"])
    if not totp.verify(data["code"], valid_window=1):
        return jsonify({"error": "Invalid code. Please try again."}), 400

    db.users.update_one(
        {"_id": to_object_id(request.user_id)},
        {"$set": {"two_factor_enabled": True, "updated_at": datetime.utcnow()}},
    )
    logger.info(f"2FA enabled for user {request.user_id}")
    return jsonify({"message": "2FA enabled successfully", "enabled": True})


@auth_bp.route("/2fa/disable", methods=["POST"])
@token_required
def disable_2fa():
    """Disable 2FA for the user."""
    data = request.get_json()
    if not data or not data.get("password"):
        return jsonify({"error": "Password is required to disable 2FA"}), 400

    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user["password_hash"], data["password"]):
        return jsonify({"error": "Incorrect password"}), 401

    db.users.update_one(
        {"_id": to_object_id(request.user_id)},
        {"$set": {
            "two_factor_enabled": False,
            "two_factor_secret": "",
            "updated_at": datetime.utcnow(),
        }},
    )
    logger.info(f"2FA disabled for user {request.user_id}")
    return jsonify({"message": "2FA disabled successfully", "enabled": False})


# ============================================================
# Google OAuth
# ============================================================

@auth_bp.route("/google", methods=["POST"])
@auth_rate_limit
def google_login():
    """Login with Google using an ID token from the frontend."""
    data = request.get_json()
    if not data or not data.get("credential"):
        return jsonify({"error": "Google credential is required"}), 400

    google_client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    if not google_client_id:
        return jsonify({"error": "Google OAuth is not configured"}), 500

    # Verify the Google token
    try:
        resp = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={data['credential']}",
            timeout=10,
        )
        if resp.status_code != 200:
            return jsonify({"error": "Invalid Google token"}), 401

        google_info = resp.json()

        # Verify audience
        if google_info.get("aud") != google_client_id:
            return jsonify({"error": "Invalid token audience"}), 401

        email = google_info.get("email")
        name = google_info.get("name", "")
        avatar = google_info.get("picture", "")

        if not email:
            return jsonify({"error": "Email not provided by Google"}), 400

    except requests.RequestException:
        return jsonify({"error": "Failed to verify Google token"}), 401

    db = current_app.db
    user = db.users.find_one({"email": email})

    if user:
        # Existing user - link Google account if not linked
        _complete_login(db, user, data.get("remember_me", False))
        return jsonify({
            "token": _get_access_token(user, data.get("remember_me", False)),
            "refresh_token": create_token(str(user["_id"]), "refresh"),
            "user": _serialize_user(user, user["_id"]),
        })

    # New user via Google
    user_doc = {
        "email": email,
        "password_hash": generate_password_hash(pyotp.random_base32()),  # Random password for Google users
        "name": name,
        "roll_no": "",
        "branch": "",
        "semester": "",
        "avatar": avatar,
        "theme": "light",
        "language": "en",
        "notification_settings": {"tasks": True, "attendance": True, "exams": True, "budget": True},
        "email_verified": True,  # Google already verified
        "two_factor_enabled": False,
        "two_factor_secret": "",
        "google_id": google_info.get("sub", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    db.streaks.insert_one({
        "user_id": user_id,
        "current_streak": 1,
        "longest_streak": 1,
        "last_login": get_today_str(),
    })

    logger.info(f"New user registered via Google: {email}")
    return jsonify({
        "token": create_token(user_id),
        "refresh_token": create_token(user_id, "refresh"),
        "user": _serialize_user(user_doc, user_id),
    }), 201


# ============================================================
# Login History & Sessions
# ============================================================

@auth_bp.route("/login-history", methods=["GET"])
@token_required
def login_history():
    """Get login history for the current user."""
    db = current_app.db
    logs = list(db.activity_logs.find(
        {"user_id": request.user_id, "action": "login"},
    ).sort("created_at", -1).limit(50))

    result = []
    for log in logs:
        result.append({
            "id": str(log["_id"]),
            "action": log["action"],
            "ip_address": log.get("ip_address", ""),
            "user_agent": log.get("user_agent", ""),
            "created_at": log.get("created_at", "").isoformat() if hasattr(log.get("created_at", ""), "isoformat") else str(log.get("created_at", "")),
        })
    return jsonify({"history": result})


# ============================================================
# Helper Functions
# ============================================================

def _complete_login(db, user, remember_me=False):
    """Complete the login process - update streak, log activity."""
    user_id = str(user["_id"])
    _update_streak(db, user_id)

    db.activity_logs.insert_one({
        "user_id": user_id,
        "action": "login",
        "ip_address": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "created_at": datetime.utcnow(),
    })

    # Reset login attempts
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"login_attempts": 0, "locked_until": None}},
    )
    logger.info(f"User logged in: {user['email']}")


def _get_access_token(user, remember_me=False):
    """Create an access token, with longer expiry if remember_me is set."""
    if remember_me:
        import jwt
        import datetime as dt
        expiry_days = current_app.config.get("JWT_REMEMBER_ME_EXPIRY_DAYS", 90)
        payload = {
            "user_id": str(user["_id"]),
            "type": "access",
            "exp": dt.datetime.utcnow() + dt.timedelta(days=expiry_days),
            "iat": dt.datetime.utcnow(),
        }
        return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")
    return create_token(str(user["_id"]), "access")


def _update_streak(db, user_id):
    """Update login streak for the user."""
    today = get_today_str()
    streak = db.streaks.find_one({"user_id": user_id})
    if streak:
        last = streak.get("last_login", "")
        if last == today:
            return
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        if last == yesterday:
            new_streak = streak["current_streak"] + 1
            longest = max(new_streak, streak.get("longest_streak", 0))
        else:
            new_streak = 1
            longest = streak.get("longest_streak", 1)
        db.streaks.update_one(
            {"user_id": user_id},
            {"$set": {"current_streak": new_streak, "longest_streak": longest, "last_login": today}},
        )
    else:
        db.streaks.insert_one({
            "user_id": user_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_login": today,
        })


def _serialize_user(user, user_id):
    """Serialize user document for API response."""
    return {
        "id": str(user_id),
        "email": user["email"],
        "name": user["name"],
        "roll_no": user.get("roll_no", ""),
        "branch": user.get("branch", ""),
        "semester": user.get("semester", ""),
        "avatar": user.get("avatar", ""),
        "theme": user.get("theme", "light"),
        "language": user.get("language", "en"),
        "notification_settings": user.get("notification_settings", {}),
        "email_verified": user.get("email_verified", False),
        "two_factor_enabled": user.get("two_factor_enabled", False),
    }
