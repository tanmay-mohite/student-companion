"""Exam Preparation Routes - Enhanced v2.0"""

from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string
from utils.logger import get_logger
from datetime import datetime, timedelta

logger = get_logger("exams")

exam_bp = Blueprint("exams", __name__)


# ---------- GET /exams/subjects ----------
@exam_bp.route("/subjects", methods=["GET"])
@token_required
def get_subjects():
    """Get all exam subjects with progress and countdown"""
    db = current_app.db
    subjects = list(db.exam_subjects.find({"user_id": request.user_id}))
    result = []
    now = datetime.utcnow()

    for s in subjects:
        topics = s.get("topics", [])
        completed = sum(1 for t in topics if t.get("completed"))
        total = len(topics)
        progress = round((completed / total * 100) if total > 0 else 0, 1)

        # Days until exam
        days_left = None
        exam_date_str = s.get("exam_date", "")
        if exam_date_str:
            try:
                exam_date = datetime.fromisoformat(exam_date_str.replace("Z", "+00:00"))
                days_left = (exam_date - now).days
            except Exception:
                pass

        # Difficulty breakdown
        by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        for t in topics:
            diff = t.get("difficulty", "medium")
            if diff in by_difficulty:
                by_difficulty[diff] += 1

        result.append({
            "id": str(s["_id"]),
            "name": s.get("name", ""),
            "exam_date": exam_date_str,
            "days_left": days_left,
            "topics": topics,
            "topics_total": total,
            "topics_completed": completed,
            "progress": progress,
            "difficulty_breakdown": by_difficulty,
            "notes": s.get("notes", ""),
            "priority": s.get("priority", "medium"),
        })

    return jsonify({"subjects": result})


# ---------- GET /exams/stats ----------
@exam_bp.route("/stats", methods=["GET"])
@token_required
def get_exam_stats():
    """Get overall exam preparation stats"""
    db = current_app.db
    subjects = list(db.exam_subjects.find({"user_id": request.user_id}))
    now = datetime.utcnow()

    total_subjects = len(subjects)
    total_topics = 0
    completed_topics = 0
    nearest_exam = None
    nearest_days = None
    exams_this_week = 0
    exams_this_month = 0

    for s in subjects:
        topics = s.get("topics", [])
        total_topics += len(topics)
        completed_topics += sum(1 for t in topics if t.get("completed"))

        exam_date_str = s.get("exam_date", "")
        if exam_date_str:
            try:
                exam_date = datetime.fromisoformat(exam_date_str.replace("Z", "+00:00"))
                days = (exam_date - now).days

                if nearest_days is None or days < nearest_days:
                    nearest_days = days
                    nearest_exam = s.get("name", "")

                if 0 <= days <= 7:
                    exams_this_week += 1
                if 0 <= days <= 30:
                    exams_this_month += 1
            except Exception:
                pass

    overall_progress = round((completed_topics / total_topics * 100) if total_topics > 0 else 0, 1)

    # Per-subject progress
    subject_progress = []
    for s in subjects:
        topics = s.get("topics", [])
        total = len(topics)
        done = sum(1 for t in topics if t.get("completed"))
        subject_progress.append({
            "name": s.get("name", ""),
            "progress": round((done / total * 100) if total > 0 else 0, 1),
            "total": total,
            "completed": done,
        })

    return jsonify({
        "total_subjects": total_subjects,
        "total_topics": total_topics,
        "completed_topics": completed_topics,
        "overall_progress": overall_progress,
        "nearest_exam": nearest_exam,
        "nearest_days": nearest_days,
        "exams_this_week": exams_this_week,
        "exams_this_month": exams_this_month,
        "subject_progress": subject_progress,
    })


# ---------- GET /exams/upcoming ----------
@exam_bp.route("/upcoming", methods=["GET"])
@token_required
def get_upcoming_exams():
    """Get upcoming exams sorted by date"""
    db = current_app.db
    subjects = list(db.exam_subjects.find({
        "user_id": request.user_id,
        "exam_date": {"$exists": True, "$ne": ""}
    }))
    now = datetime.utcnow()

    exams = []
    for s in subjects:
        exam_date_str = s.get("exam_date", "")
        if not exam_date_str:
            continue
        try:
            exam_date = datetime.fromisoformat(exam_date_str.replace("Z", "+00:00"))
            days = (exam_date - now).days
            topics = s.get("topics", [])
            completed = sum(1 for t in topics if t.get("completed"))
            total = len(topics)
            exams.append({
                "id": str(s["_id"]),
                "name": s.get("name", ""),
                "exam_date": exam_date_str,
                "days_left": days,
                "progress": round((completed / total * 100) if total > 0 else 0, 1),
                "topics_total": total,
                "topics_completed": completed,
                "priority": s.get("priority", "medium"),
            })
        except Exception:
            pass

    exams.sort(key=lambda x: x["days_left"])
    return jsonify({"exams": exams})


# ---------- POST /exams/subjects ----------
@exam_bp.route("/subjects", methods=["POST"])
@token_required
def create_subject():
    """Create a new exam subject"""
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Subject name is required"}), 400

    db = current_app.db
    name = sanitize_string(data["name"], 100)

    # Check duplicate
    existing = db.exam_subjects.find_one({"user_id": request.user_id, "name": name})
    if existing:
        return jsonify({"error": "Subject already exists"}), 409

    # Parse topics - support difficulty
    raw_topics = data.get("topics", [])
    topics = []
    for t in raw_topics:
        if isinstance(t, dict) and t.get("name"):
            topics.append({
                "name": sanitize_string(t["name"], 100),
                "completed": False,
                "difficulty": t.get("difficulty", "medium") if t.get("difficulty") in ("easy", "medium", "hard") else "medium",
            })
        elif isinstance(t, str) and t.strip():
            topics.append({
                "name": sanitize_string(t, 100),
                "completed": False,
                "difficulty": "medium",
            })

    subject = {
        "user_id": request.user_id,
        "name": name,
        "exam_date": data.get("exam_date", ""),
        "topics": topics,
        "notes": sanitize_string(data.get("notes", ""), 500),
        "priority": data.get("priority", "medium") if data.get("priority") in ("low", "medium", "high") else "medium",
        "created_at": datetime.utcnow().isoformat(),
    }
    result = db.exam_subjects.insert_one(subject)
    subject["id"] = str(result.inserted_id)
    subject.pop("_id", None)
    logger.info(f"Exam subject created: {name} for user {request.user_id}")
    return jsonify({"subject": subject}), 201


# ---------- PUT /exams/subjects/<id> ----------
@exam_bp.route("/subjects/<subject_id>", methods=["PUT"])
@token_required
def update_subject(subject_id):
    """Update an exam subject"""
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    data = request.get_json()
    db = current_app.db
    update_fields = {}
    updated_at = datetime.utcnow().isoformat()

    if "name" in data:
        update_fields["name"] = sanitize_string(data["name"], 100)
    if "exam_date" in data:
        update_fields["exam_date"] = data["exam_date"]
    if "notes" in data:
        update_fields["notes"] = sanitize_string(data["notes"], 500)
    if "priority" in data:
        if data["priority"] in ("low", "medium", "high"):
            update_fields["priority"] = data["priority"]
    if "topics" in data:
        # Validate topics structure
        raw_topics = data["topics"]
        topics = []
        for t in raw_topics:
            if isinstance(t, dict) and t.get("name"):
                topics.append({
                    "name": sanitize_string(t["name"], 100),
                    "completed": bool(t.get("completed", False)),
                    "difficulty": t.get("difficulty", "medium") if t.get("difficulty") in ("easy", "medium", "hard") else "medium",
                })
        update_fields["topics"] = topics

    update_fields["updated_at"] = updated_at

    result = db.exam_subjects.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Subject not found"}), 404

    return jsonify({"message": "Updated"})


# ---------- DELETE /exams/subjects/<id> ----------
@exam_bp.route("/subjects/<subject_id>", methods=["DELETE"])
@token_required
def delete_subject(subject_id):
    """Delete an exam subject"""
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    db = current_app.db
    result = db.exam_subjects.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Subject not found"}), 404

    logger.info(f"Exam subject deleted: {subject_id}")
    return jsonify({"message": "Deleted"})


# ---------- PUT /exams/subjects/<id>/topics/<index> ----------
@exam_bp.route("/subjects/<subject_id>/topics/<int:topic_index>", methods=["PUT"])
@token_required
def toggle_topic(subject_id, topic_index):
    """Toggle a topic's completed status"""
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    db = current_app.db
    subject = db.exam_subjects.find_one({"_id": oid, "user_id": request.user_id})
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    topics = subject.get("topics", [])
    if topic_index < 0 or topic_index >= len(topics):
        return jsonify({"error": "Invalid topic index"}), 400

    topics[topic_index]["completed"] = not topics[topic_index].get("completed", False)
    db.exam_subjects.update_one(
        {"_id": oid},
        {"$set": {"topics": topics, "updated_at": datetime.utcnow().isoformat()}},
    )

    # Calculate progress
    completed = sum(1 for t in topics if t.get("completed"))
    total = len(topics)
    progress = round((completed / total * 100) if total > 0 else 0, 1)

    return jsonify({
        "topics": topics,
        "progress": progress,
        "completed": completed,
        "total": total,
    })


# ---------- POST /exams/subjects/<id>/topics ----------
@exam_bp.route("/subjects/<subject_id>/topics", methods=["POST"])
@token_required
def add_topic(subject_id):
    """Add a new topic to a subject"""
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Topic name is required"}), 400

    db = current_app.db
    subject = db.exam_subjects.find_one({"_id": oid, "user_id": request.user_id})
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    new_topic = {
        "name": sanitize_string(data["name"], 100),
        "completed": False,
        "difficulty": data.get("difficulty", "medium") if data.get("difficulty") in ("easy", "medium", "hard") else "medium",
    }

    db.exam_subjects.update_one(
        {"_id": oid},
        {
            "$push": {"topics": new_topic},
            "$set": {"updated_at": datetime.utcnow().isoformat()},
        },
    )

    return jsonify({"topic": new_topic, "message": "Topic added"}), 201


# ---------- DELETE /exams/subjects/<id>/topics/<index> ----------
@exam_bp.route("/subjects/<subject_id>/topics/<int:topic_index>", methods=["DELETE"])
@token_required
def delete_topic(subject_id, topic_index):
    """Delete a topic from a subject"""
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    db = current_app.db
    subject = db.exam_subjects.find_one({"_id": oid, "user_id": request.user_id})
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    topics = subject.get("topics", [])
    if topic_index < 0 or topic_index >= len(topics):
        return jsonify({"error": "Invalid topic index"}), 400

    removed = topics.pop(topic_index)
    db.exam_subjects.update_one(
        {"_id": oid},
        {"$set": {"topics": topics, "updated_at": datetime.utcnow().isoformat()}},
    )

    return jsonify({"message": "Topic deleted", "removed": removed.get("name", "")})
