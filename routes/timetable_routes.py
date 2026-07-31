"""Timetable Routes - Enhanced v2.0"""

import re
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string
from utils.logger import get_logger
from datetime import datetime

logger = get_logger("timetable")

timetable_bp = Blueprint("timetable", __name__)

VALID_DAYS = [1, 2, 3, 4, 5, 6, 7]  # Monday=1 to Sunday=7
DAY_NAMES = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday"}
VALID_TYPES = ("lecture", "lab", "tutorial", "other")


def validate_time(t):
    """Validate HH:MM format."""
    if not t or not isinstance(t, str):
        return None
    m = re.match(r"^(\d{2}):(\d{2})$", t)
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    if h < 0 or h > 23 or mi < 0 or mi > 59:
        return None
    return t


def validate_color(c):
    """Validate hex color."""
    if not c or not isinstance(c, str):
        return "#4A90D9"
    if re.match(r"^#[0-9a-fA-F]{6}$", c):
        return c
    return "#4A90D9"


def time_to_minutes(t):
    """Convert HH:MM to minutes since midnight."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def check_conflict(entries, new_day, new_start, new_end, exclude_id=None):
    """Check for time conflicts with existing entries."""
    new_s = time_to_minutes(new_start)
    new_e = time_to_minutes(new_end)
    for e in entries:
        if exclude_id and str(e["_id"]) == exclude_id:
            continue
        if e["day"] != new_day:
            continue
        e_s = time_to_minutes(e["start_time"])
        e_e = time_to_minutes(e["end_time"])
        if new_s < e_e and new_e > e_s:
            return e
    return None


# ---------- GET /timetable ----------
@timetable_bp.route("", methods=["GET"])
@timetable_bp.route("/weekly", methods=["GET"])
@token_required
def get_timetable():
    """Get full weekly timetable"""
    db = current_app.db
    entries = list(db.timetable.find({"user_id": request.user_id}))
    result = []
    for e in entries:
        result.append({
            "id": str(e["_id"]),
            "subject": e.get("subject", ""),
            "day": e.get("day", 1),
            "day_name": DAY_NAMES.get(e.get("day", 1), ""),
            "start_time": e.get("start_time", "09:00"),
            "end_time": e.get("end_time", "10:00"),
            "room": e.get("room", ""),
            "teacher": e.get("teacher", ""),
            "color": e.get("color", "#4A90D9"),
            "type": e.get("type", "lecture"),
        })
    # Sort by day, then start_time
    result.sort(key=lambda x: (x["day"], x["start_time"]))
    return jsonify({"entries": result})


# ---------- GET /timetable/today ----------
@timetable_bp.route("/today", methods=["GET"])
@token_required
def get_today():
    """Get today's schedule"""
    db = current_app.db
    now = datetime.now()
    today = now.isoweekday()  # Monday=1, Sunday=7
    current_min = now.hour * 60 + now.minute

    entries = list(db.timetable.find({
        "user_id": request.user_id,
        "day": today,
    }))

    schedule = []
    current_class = None
    next_class = None

    for e in entries:
        s_min = time_to_minutes(e.get("start_time", "09:00"))
        e_min = time_to_minutes(e.get("end_time", "10:00"))

        entry = {
            "id": str(e["_id"]),
            "subject": e.get("subject", ""),
            "start_time": e.get("start_time", "09:00"),
            "end_time": e.get("end_time", "10:00"),
            "room": e.get("room", ""),
            "teacher": e.get("teacher", ""),
            "color": e.get("color", "#4A90D9"),
            "type": e.get("type", "lecture"),
            "status": "upcoming",
        }

        if current_min >= s_min and current_min < e_min:
            entry["status"] = "ongoing"
            current_class = entry
        elif current_min >= e_min:
            entry["status"] = "completed"
        else:
            if next_class is None:
                next_class = entry

        schedule.append(entry)

    schedule.sort(key=lambda x: x["start_time"])

    # Calculate total hours today
    total_min = 0
    for e in entries:
        s_min = time_to_minutes(e.get("start_time", "09:00"))
        e_min = time_to_minutes(e.get("end_time", "10:00"))
        total_min += (e_min - s_min)

    return jsonify({
        "day": today,
        "day_name": DAY_NAMES.get(today, ""),
        "schedule": schedule,
        "total_classes": len(entries),
        "total_hours": round(total_min / 60, 1),
        "current_class": current_class,
        "next_class": next_class,
    })


# ---------- GET /timetable/stats ----------
@timetable_bp.route("/stats", methods=["GET"])
@token_required
def get_stats():
    """Get timetable statistics"""
    db = current_app.db
    entries = list(db.timetable.find({"user_id": request.user_id}))

    if not entries:
        return jsonify({
            "total_entries": 0,
            "total_hours": 0,
            "busiest_day": None,
            "subjects": [],
            "by_type": {},
        })

    # Per-day counts and hours
    day_hours = {}
    day_counts = {}
    subjects = {}
    by_type = {}

    for e in entries:
        day = e.get("day", 1)
        s_min = time_to_minutes(e.get("start_time", "09:00"))
        e_min = time_to_minutes(e.get("end_time", "10:00"))
        hours = (e_min - s_min) / 60

        day_hours[day] = day_hours.get(day, 0) + hours
        day_counts[day] = day_counts.get(day, 0) + 1

        subj = e.get("subject", "Unknown")
        subjects[subj] = subjects.get(subj, 0) + 1

        t = e.get("type", "lecture")
        by_type[t] = by_type.get(t, 0) + 1

    total_hours = round(sum(day_hours.values()), 1)
    busiest_day = max(day_hours, key=day_hours.get) if day_hours else None

    return jsonify({
        "total_entries": len(entries),
        "total_hours": total_hours,
        "busiest_day": DAY_NAMES.get(busiest_day, "") if busiest_day else None,
        "busiest_day_hours": round(day_hours.get(busiest_day, 0), 1) if busiest_day else 0,
        "subjects": [{"name": k, "count": v} for k, v in sorted(subjects.items(), key=lambda x: -x[1])],
        "by_type": by_type,
        "per_day": [{"day": DAY_NAMES.get(d, ""), "hours": round(day_hours.get(d, 0), 1), "classes": day_counts.get(d, 0)} for d in sorted(day_hours.keys())],
    })


# ---------- POST /timetable ----------
@timetable_bp.route("", methods=["POST"])
@token_required
def create_entry():
    """Create a new timetable entry"""
    data = request.get_json()
    if not data or not data.get("subject"):
        return jsonify({"error": "Subject is required"}), 400

    day = data.get("day")
    if day not in VALID_DAYS:
        return jsonify({"error": "Valid day (1-7) is required"}), 400

    start_time = validate_time(data.get("start_time", "09:00"))
    end_time = validate_time(data.get("end_time", "10:00"))
    if not start_time or not end_time:
        return jsonify({"error": "Invalid time format. Use HH:MM"}), 400

    if time_to_minutes(end_time) <= time_to_minutes(start_time):
        return jsonify({"error": "End time must be after start time"}), 400

    entry_type = data.get("type", "lecture")
    if entry_type not in VALID_TYPES:
        entry_type = "lecture"

    db = current_app.db

    # Check for conflicts
    existing = list(db.timetable.find({"user_id": request.user_id}))
    conflict = check_conflict(existing, day, start_time, end_time)
    if conflict:
        return jsonify({
            "error": f"Time conflict with {conflict.get('subject', 'another class')}",
            "conflict_with": str(conflict["_id"]),
        }), 409

    entry = {
        "user_id": request.user_id,
        "subject": sanitize_string(data["subject"], 100),
        "day": day,
        "start_time": start_time,
        "end_time": end_time,
        "room": sanitize_string(data.get("room", ""), 50),
        "teacher": sanitize_string(data.get("teacher", ""), 100),
        "color": validate_color(data.get("color", "#4A90D9")),
        "type": entry_type,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = db.timetable.insert_one(entry)
    entry["id"] = str(result.inserted_id)
    entry.pop("_id", None)
    logger.info(f"Timetable entry created: {entry['subject']} on {DAY_NAMES.get(day)}")
    return jsonify({"entry": entry}), 201


# ---------- PUT /timetable/<id> ----------
@timetable_bp.route("/<entry_id>", methods=["PUT"])
@token_required
def update_entry(entry_id):
    """Update a timetable entry"""
    oid = to_object_id(entry_id)
    if not oid:
        return jsonify({"error": "Invalid entry ID"}), 400

    data = request.get_json()
    db = current_app.db

    # Get current entry
    current = db.timetable.find_one({"_id": oid, "user_id": request.user_id})
    if not current:
        return jsonify({"error": "Entry not found"}), 404

    # Build update fields with validation
    update_fields = {}
    if "subject" in data:
        update_fields["subject"] = sanitize_string(data["subject"], 100)
    if "day" in data:
        if data["day"] not in VALID_DAYS:
            return jsonify({"error": "Valid day (1-7) is required"}), 400
        update_fields["day"] = data["day"]
    if "start_time" in data:
        t = validate_time(data["start_time"])
        if not t:
            return jsonify({"error": "Invalid start time format"}), 400
        update_fields["start_time"] = t
    if "end_time" in data:
        t = validate_time(data["end_time"])
        if not t:
            return jsonify({"error": "Invalid end time format"}), 400
        update_fields["end_time"] = t
    if "room" in data:
        update_fields["room"] = sanitize_string(data["room"], 50)
    if "teacher" in data:
        update_fields["teacher"] = sanitize_string(data["teacher"], 100)
    if "color" in data:
        update_fields["color"] = validate_color(data["color"])
    if "type" in data:
        if data["type"] in VALID_TYPES:
            update_fields["type"] = data["type"]

    # Validate time order
    new_start = update_fields.get("start_time", current.get("start_time"))
    new_end = update_fields.get("end_time", current.get("end_time"))
    if time_to_minutes(new_end) <= time_to_minutes(new_start):
        return jsonify({"error": "End time must be after start time"}), 400

    # Check conflicts
    new_day = update_fields.get("day", current.get("day"))
    existing = list(db.timetable.find({"user_id": request.user_id}))
    conflict = check_conflict(existing, new_day, new_start, new_end, exclude_id=entry_id)
    if conflict:
        return jsonify({
            "error": f"Time conflict with {conflict.get('subject', 'another class')}",
            "conflict_with": str(conflict["_id"]),
        }), 409

    update_fields["updated_at"] = datetime.utcnow().isoformat()

    db.timetable.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$set": update_fields},
    )
    return jsonify({"message": "Updated"})


# ---------- DELETE /timetable/<id> ----------
@timetable_bp.route("/<entry_id>", methods=["DELETE"])
@token_required
def delete_entry(entry_id):
    """Delete a timetable entry"""
    oid = to_object_id(entry_id)
    if not oid:
        return jsonify({"error": "Invalid entry ID"}), 400

    db = current_app.db
    result = db.timetable.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Entry not found"}), 404

    logger.info(f"Timetable entry deleted: {entry_id}")
    return jsonify({"message": "Deleted"})


# ---------- POST /timetable/bulk ----------
@timetable_bp.route("/bulk", methods=["POST"])
@token_required
def bulk_create():
    """Create multiple timetable entries at once"""
    data = request.get_json()
    if not data or not isinstance(data.get("entries"), list):
        return jsonify({"error": "entries array is required"}), 400

    entries_data = data["entries"]
    if len(entries_data) > 50:
        return jsonify({"error": "Maximum 50 entries at once"}), 400

    db = current_app.db
    existing = list(db.timetable.find({"user_id": request.user_id}))
    created = []
    errors = []

    for i, item in enumerate(entries_data):
        if not item.get("subject"):
            errors.append({"index": i, "error": "Subject required"})
            continue

        day = item.get("day")
        if day not in VALID_DAYS:
            errors.append({"index": i, "error": "Valid day (1-7) required"})
            continue

        start_time = validate_time(item.get("start_time", "09:00"))
        end_time = validate_time(item.get("end_time", "10:00"))
        if not start_time or not end_time:
            errors.append({"index": i, "error": "Invalid time format"})
            continue

        if time_to_minutes(end_time) <= time_to_minutes(start_time):
            errors.append({"index": i, "error": "End time must be after start time"})
            continue

        # Check conflict with existing AND newly created
        conflict = check_conflict(existing, day, start_time, end_time)
        if conflict:
            errors.append({"index": i, "error": f"Conflict with {conflict.get('subject', 'another class')}"})
            continue

        entry = {
            "user_id": request.user_id,
            "subject": sanitize_string(item["subject"], 100),
            "day": day,
            "start_time": start_time,
            "end_time": end_time,
            "room": sanitize_string(item.get("room", ""), 50),
            "teacher": sanitize_string(item.get("teacher", ""), 100),
            "color": validate_color(item.get("color", "#4A90D9")),
            "type": item.get("type", "lecture") if item.get("type") in VALID_TYPES else "lecture",
            "created_at": datetime.utcnow().isoformat(),
        }
        result = db.timetable.insert_one(entry)
        entry["id"] = str(result.inserted_id)
        entry.pop("_id", None)
        created.append(entry)
        existing.append(entry)  # Add to existing for conflict checking

    logger.info(f"Bulk timetable: {len(created)} created, {len(errors)} errors")
    return jsonify({"created": created, "errors": errors, "total_created": len(created)}), 201 if created else 400
