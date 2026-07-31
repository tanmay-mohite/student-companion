"""Notifications & Reminders Routes - Enhanced v2.0"""

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string
from utils.logger import get_logger

logger = get_logger("notifications")

notification_bp = Blueprint("notifications", __name__)

VALID_TYPES = ("task", "exam", "attendance", "budget", "timetable", "system", "reminder")
VALID_PRIORITIES = ("low", "medium", "high")


# ---------- GET /notifications ----------
@notification_bp.route("", methods=["GET"])
@token_required
def get_notifications():
    """Get notifications with optional filters"""
    db = current_app.db
    query = {"user_id": request.user_id}

    # Type filter
    notif_type = request.args.get("type")
    if notif_type and notif_type in VALID_TYPES:
        query["type"] = notif_type

    # Read/unread filter
    unread_only = request.args.get("unread")
    if unread_only and unread_only.lower() == "true":
        query["read"] = False

    # Pagination
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = min(100, max(1, int(request.args.get("per_page", 50))))
    except (TypeError, ValueError):
        per_page = 50

    skip = (page - 1) * per_page
    total = db.notifications.count_documents(query)
    notifications = list(
        db.notifications.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(per_page)
    )

    result = []
    for n in notifications:
        result.append({
            "id": str(n["_id"]),
            "type": n.get("type", "system"),
            "title": n.get("title", ""),
            "message": n.get("message", ""),
            "read": n.get("read", False),
            "created_at": n.get("created_at", ""),
        })

    # Unread count (all, not just filtered)
    unread_count = db.notifications.count_documents({
        "user_id": request.user_id,
        "read": False,
    })

    return jsonify({
        "notifications": result,
        "unread_count": unread_count,
        "total": total,
        "page": page,
        "per_page": per_page,
    })


# ---------- GET /notifications/unread-count ----------
@notification_bp.route("/unread-count", methods=["GET"])
@token_required
def get_unread_count():
    """Quick unread count for bell badge"""
    db = current_app.db
    count = db.notifications.count_documents({
        "user_id": request.user_id,
        "read": False,
    })
    return jsonify({"unread_count": count})


# ---------- PUT /notifications/<id>/read ----------
@notification_bp.route("/<notification_id>/read", methods=["PUT"])
@token_required
def mark_read(notification_id):
    """Mark a notification as read"""
    oid = to_object_id(notification_id)
    if not oid:
        return jsonify({"error": "Invalid notification ID"}), 400

    db = current_app.db
    result = db.notifications.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$set": {"read": True}},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Notification not found"}), 404

    return jsonify({"message": "Marked as read"})


# ---------- PUT /notifications/mark-all-read ----------
@notification_bp.route("/mark-all-read", methods=["PUT"])
@token_required
def mark_all_read():
    """Mark all notifications as read"""
    db = current_app.db
    result = db.notifications.update_many(
        {"user_id": request.user_id, "read": False},
        {"$set": {"read": True}},
    )
    return jsonify({"message": "All marked as read", "marked": result.modified_count})


# ---------- DELETE /notifications/<id> ----------
@notification_bp.route("/<notification_id>", methods=["DELETE"])
@token_required
def delete_notification(notification_id):
    """Delete a notification"""
    oid = to_object_id(notification_id)
    if not oid:
        return jsonify({"error": "Invalid notification ID"}), 400

    db = current_app.db
    result = db.notifications.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Notification not found"}), 404

    return jsonify({"message": "Deleted"})


# ---------- DELETE /notifications/clear-read ----------
@notification_bp.route("/clear-read", methods=["DELETE"])
@token_required
def clear_read():
    """Delete all read notifications"""
    db = current_app.db
    result = db.notifications.delete_many({
        "user_id": request.user_id,
        "read": True,
    })
    return jsonify({"message": "Read notifications cleared", "deleted": result.deleted_count})


# ---------- GET /notifications/settings ----------
@notification_bp.route("/settings", methods=["GET"])
@token_required
def get_settings():
    """Get notification settings"""
    db = current_app.db
    user = db.users.find_one({"_id": to_object_id(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    settings = user.get("notification_settings", {})
    # Default settings
    defaults = {
        "tasks": True,
        "exams": True,
        "attendance": True,
        "budget": True,
        "timetable": True,
        "system": True,
    }
    for key in defaults:
        if key not in settings:
            settings[key] = defaults[key]

    return jsonify({"settings": settings})


# ---------- PUT /notifications/settings ----------
@notification_bp.route("/settings", methods=["PUT"])
@token_required
def update_settings():
    """Update notification settings"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    db = current_app.db
    settings = {}
    for key in ("tasks", "exams", "attendance", "budget", "timetable", "system"):
        if key in data:
            settings[f"notification_settings.{key}"] = bool(data[key])

    if not settings:
        return jsonify({"error": "No valid settings provided"}), 400

    db.users.update_one(
        {"_id": to_object_id(request.user_id)},
        {"$set": settings},
    )
    logger.info(f"Notification settings updated for user {request.user_id}")
    return jsonify({"message": "Settings updated"})


# ---------- GET /notifications/reminders ----------
@notification_bp.route("/reminders", methods=["GET"])
@token_required
def get_reminders():
    """Get user reminders"""
    db = current_app.db
    reminders = list(db.reminders.find({"user_id": request.user_id}).sort("date", 1))
    result = []
    for r in reminders:
        result.append({
            "id": str(r["_id"]),
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "date": r.get("date", ""),
            "priority": r.get("priority", "medium"),
            "completed": r.get("completed", False),
        })
    return jsonify({"reminders": result})


# ---------- POST /notifications/reminders ----------
@notification_bp.route("/reminders", methods=["POST"])
@token_required
def create_reminder():
    """Create a reminder"""
    data = request.get_json()
    if not data or not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    db = current_app.db
    priority = data.get("priority", "medium")
    if priority not in VALID_PRIORITIES:
        priority = "medium"

    reminder = {
        "user_id": request.user_id,
        "title": sanitize_string(data["title"], 200),
        "description": sanitize_string(data.get("description", ""), 1000),
        "date": data.get("date", ""),
        "priority": priority,
        "completed": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = db.reminders.insert_one(reminder)
    reminder["id"] = str(result.inserted_id)
    reminder.pop("_id", None)
    logger.info(f"Reminder created: {reminder['title']} for user {request.user_id}")
    return jsonify({"reminder": reminder}), 201


# ---------- PUT /notifications/reminders/<id> ----------
@notification_bp.route("/reminders/<reminder_id>", methods=["PUT"])
@token_required
def update_reminder(reminder_id):
    """Update a reminder"""
    oid = to_object_id(reminder_id)
    if not oid:
        return jsonify({"error": "Invalid reminder ID"}), 400

    data = request.get_json()
    db = current_app.db

    reminder = db.reminders.find_one({"_id": oid, "user_id": request.user_id})
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404

    update_fields = {}
    if "title" in data:
        update_fields["title"] = sanitize_string(data["title"], 200)
    if "description" in data:
        update_fields["description"] = sanitize_string(data["description"], 1000)
    if "date" in data:
        update_fields["date"] = data["date"]
    if "priority" in data and data["priority"] in VALID_PRIORITIES:
        update_fields["priority"] = data["priority"]
    if "completed" in data:
        update_fields["completed"] = bool(data["completed"])

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400

    db.reminders.update_one(
        {"_id": oid},
        {"$set": update_fields},
    )
    return jsonify({"message": "Updated"})


# ---------- DELETE /notifications/reminders/<id> ----------
@notification_bp.route("/reminders/<reminder_id>", methods=["DELETE"])
@token_required
def delete_reminder(reminder_id):
    """Delete a reminder"""
    oid = to_object_id(reminder_id)
    if not oid:
        return jsonify({"error": "Invalid reminder ID"}), 400

    db = current_app.db
    result = db.reminders.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Reminder not found"}), 404

    return jsonify({"message": "Deleted"})
