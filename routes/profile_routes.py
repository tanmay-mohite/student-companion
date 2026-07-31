"""Profile & Settings Routes - Enhanced v2.0"""

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string
from utils.logger import get_logger
from werkzeug.security import check_password_hash

logger = get_logger("profile")

profile_bp = Blueprint("profile", __name__)

VALID_THEMES = ("light", "dark")
VALID_LANGUAGES = ("en", "hi", "es", "fr")


# ---------- GET /profile ----------
@profile_bp.route("", methods=["GET"])
@token_required
def get_profile():
    """Get user profile"""
    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "profile": {
            "id": str(user["_id"]),
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "roll_no": user.get("roll_no", ""),
            "branch": user.get("branch", ""),
            "semester": user.get("semester", ""),
            "avatar": user.get("avatar", ""),
            "theme": user.get("theme", "light"),
            "language": user.get("language", "en"),
            "email_verified": user.get("email_verified", False),
            "two_factor_enabled": user.get("two_factor_enabled", False),
            "notification_settings": user.get("notification_settings", {}),
            "created_at": user.get("created_at", ""),
        }
    })


# ---------- PUT /profile ----------
@profile_bp.route("", methods=["PUT"])
@token_required
def update_profile():
    """Update user profile"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    db = current_app.db
    update_fields = {}

    # Sanitize text fields
    for field in ("name", "roll_no", "branch", "semester"):
        if field in data:
            update_fields[field] = sanitize_string(data[field], 100)

    # Validate theme
    if "theme" in data and data["theme"] in VALID_THEMES:
        update_fields["theme"] = data["theme"]

    # Validate language
    if "language" in data and data["language"] in VALID_LANGUAGES:
        update_fields["language"] = data["language"]

    # Notification settings (dict)
    if "notification_settings" in data and isinstance(data["notification_settings"], dict):
        update_fields["notification_settings"] = data["notification_settings"]

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400

    update_fields["updated_at"] = datetime.utcnow().isoformat()

    result = db.users.update_one(
        {"_id": to_object_id(request.user_id)},
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    logger.info(f"Profile updated for user {request.user_id}: {list(update_fields.keys())}")
    return jsonify({"message": "Profile updated"})


# ---------- POST /profile/avatar ----------
@profile_bp.route("/avatar", methods=["POST"])
@token_required
def upload_avatar():
    """Upload avatar (base64)"""
    data = request.get_json()
    if not data or not data.get("avatar"):
        return jsonify({"error": "Avatar data is required"}), 400

    avatar = data["avatar"]
    # Basic validation
    if not isinstance(avatar, str) or len(avatar) > 2_000_000:
        return jsonify({"error": "Invalid avatar data (max 2MB)"}), 400

    db = current_app.db
    db.users.update_one(
        {"_id": to_object_id(request.user_id)},
        {"$set": {"avatar": avatar, "updated_at": datetime.utcnow().isoformat()}},
    )
    return jsonify({"message": "Avatar updated"})


# ---------- GET /profile/stats ----------
@profile_bp.route("/stats", methods=["GET"])
@token_required
def get_stats():
    """Get user activity summary"""
    db = current_app.db
    user_id = request.user_id

    # Count documents per collection
    task_count = db.tasks.count_documents({"user_id": user_id})
    tasks_completed = db.tasks.count_documents({"user_id": user_id, "status": "completed"})
    tasks_pending = db.tasks.count_documents({"user_id": user_id, "status": {"$in": ["pending", "in_progress"]}})

    attendance_records = db.attendance_records.count_documents({"user_id": user_id})
    attended = db.attendance_records.count_documents({"user_id": user_id, "status": "present"})
    attendance_pct = round((attended / attendance_records * 100) if attendance_records > 0 else 0, 1)

    exam_subjects = db.exam_subjects.count_documents({"user_id": user_id})
    timetable_entries = db.timetable.count_documents({"user_id": user_id})
    gpa_semesters = db.gpa_semesters.count_documents({"user_id": user_id})

    # Total expenses this month
    now = datetime.utcnow()
    month_start = now.strftime("%Y-%m-01")
    expenses_this_month = db.expenses.count_documents({
        "user_id": user_id,
        "date": {"$gte": month_start},
    })

    # Notifications
    notif_count = db.notifications.count_documents({"user_id": user_id})
    notif_unread = db.notifications.count_documents({"user_id": user_id, "read": False})

    # Reminders
    reminder_count = db.reminders.count_documents({"user_id": user_id})

    # Account age
    user = db.users.find_one({"_id": to_object_id(user_id)})
    created_at = user.get("created_at", "") if user else ""
    days_since = 0
    if created_at:
        try:
            created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            days_since = (now - created).days
        except Exception:
            pass

    return jsonify({
        "tasks": {"total": task_count, "completed": tasks_completed, "pending": tasks_pending},
        "attendance": {"records": attendance_records, "percentage": attendance_pct},
        "exam_subjects": exam_subjects,
        "timetable_entries": timetable_entries,
        "gpa_semesters": gpa_semesters,
        "expenses_this_month": expenses_this_month,
        "notifications": {"total": notif_count, "unread": notif_unread},
        "reminders": reminder_count,
        "account_age_days": days_since,
    })


# ---------- GET /profile/export ----------
@profile_bp.route("/export", methods=["GET"])
@token_required
def export_data():
    """Export all user data"""
    db = current_app.db
    user_id = request.user_id
    user = db.users.find_one({"_id": to_object_id(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = {
        "profile": {
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "roll_no": user.get("roll_no", ""),
            "branch": user.get("branch", ""),
            "semester": user.get("semester", ""),
        },
        "tasks": list(db.tasks.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "attendance_subjects": list(db.attendance_subjects.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "attendance_records": list(db.attendance_records.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "exam_subjects": list(db.exam_subjects.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "timetable": list(db.timetable.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "gpa_semesters": list(db.gpa_semesters.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "expenses": list(db.expenses.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "reminders": list(db.reminders.find({"user_id": user_id}, {"_id": 0, "user_id": 0})),
        "exported_at": datetime.utcnow().isoformat(),
    }
    logger.info(f"Data exported for user {user_id}")
    return jsonify({"export_data": data})


# ---------- POST /profile/import ----------
@profile_bp.route("/import", methods=["POST"])
@token_required
def import_data():
    """Import user data"""
    data = request.get_json()
    if not data or not data.get("import_data"):
        return jsonify({"error": "Import data is required"}), 400

    db = current_app.db
    user_id = request.user_id
    import_data = data["import_data"]

    collections_map = {
        "tasks": "tasks",
        "attendance_subjects": "attendance_subjects",
        "attendance_records": "attendance_records",
        "exam_subjects": "exam_subjects",
        "timetable": "timetable",
        "gpa_semesters": "gpa_semesters",
        "expenses": "expenses",
        "reminders": "reminders",
    }

    imported = 0
    for key, collection_name in collections_map.items():
        if key in import_data and isinstance(import_data[key], list):
            for doc in import_data[key]:
                doc["user_id"] = user_id
                # Remove _id if present to avoid conflicts
                doc.pop("_id", None)
                db[collection_name].insert_one(doc)
                imported += 1

    logger.info(f"Data imported for user {user_id}: {imported} records")
    return jsonify({"message": f"Imported {imported} records", "imported": imported})


# ---------- DELETE /profile/account ----------
@profile_bp.route("/account", methods=["DELETE"])
@token_required
def delete_account():
    """Delete user account and all data (requires password confirmation)"""
    data = request.get_json()
    if not data or not data.get("password"):
        return jsonify({"error": "Password confirmation is required"}), 400

    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Verify password
    if not check_password_hash(user.get("password_hash", ""), data["password"]):
        return jsonify({"error": "Incorrect password"}), 401

    # Delete all user data
    collections = ["tasks", "attendance_records", "attendance_subjects", "exam_subjects",
                   "timetable", "gpa_semesters", "expenses", "notifications", "reminders"]
    deleted_total = 0
    for col in collections:
        result = db[col].delete_many({"user_id": request.user_id})
        deleted_total += result.deleted_count

    # Delete budget
    db.budgets.delete_one({"user_id": request.user_id})

    # Delete login history
    db.login_history.delete_many({"user_id": request.user_id})

    # Delete user account
    db.users.delete_one({"_id": to_object_id(request.user_id)})

    logger.warning(f"Account deleted for user {request.user_id}: {deleted_total} records removed")
    return jsonify({"message": "Account deleted successfully", "records_deleted": deleted_total})
