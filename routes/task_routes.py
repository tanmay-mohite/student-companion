from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string, get_now_iso, get_today_str
from utils.logger import get_logger

logger = get_logger("tasks")

task_bp = Blueprint("tasks", __name__)


# ============================================================
# List & Stats
# ============================================================

@task_bp.route("", methods=["GET"])
@token_required
def get_tasks():
    """Get tasks with filtering, sorting, and search."""
    db = current_app.db
    query = {"user_id": request.user_id}

    status = request.args.get("status")
    if status:
        query["status"] = status

    priority = request.args.get("priority")
    if priority:
        query["priority"] = priority

    subject = request.args.get("subject")
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}

    tag = request.args.get("tag")
    if tag:
        query["tags"] = {"$regex": tag, "$options": "i"}

    search = request.args.get("search")
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    sort_by = request.args.get("sort_by", "deadline")
    sort_order = request.args.get("sort_order", "asc")
    sort_dir = 1 if sort_order == "asc" else -1

    # Pagination
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    per_page = min(per_page, 100)

    total = db.tasks.count_documents(query)
    tasks = list(
        db.tasks.find(query)
        .sort(sort_by, sort_dir)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )

    today = get_today_str()
    result = []
    for t in tasks:
        subtasks = t.get("subtasks", [])
        sub_done = sum(1 for s in subtasks if s.get("done"))
        task_data = {
            "id": str(t["_id"]),
            "title": t["title"],
            "description": t.get("description", ""),
            "subject": t.get("subject", ""),
            "deadline": t.get("deadline", ""),
            "priority": t.get("priority", "medium"),
            "status": t.get("status", "todo"),
            "tags": t.get("tags", []),
            "subtasks": subtasks,
            "subtasks_total": len(subtasks),
            "subtasks_done": sub_done,
            "created_at": t.get("created_at", ""),
            "updated_at": t.get("updated_at", ""),
        }
        task_data["is_overdue"] = (
            t.get("status") != "completed"
            and t.get("deadline")
            and t["deadline"] < today
        )
        result.append(task_data)

    return jsonify({
        "tasks": result,
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@task_bp.route("/stats", methods=["GET"])
@token_required
def get_stats():
    """Get comprehensive task statistics."""
    db = current_app.db
    user_id = request.user_id
    today = get_today_str()
    now = datetime.utcnow()

    tasks = list(db.tasks.find({"user_id": user_id}))
    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("status") == "completed")
    pending = sum(1 for t in tasks if t.get("status") in ("todo", "in_progress"))
    overdue = sum(
        1 for t in tasks
        if t.get("status") != "completed"
        and t.get("deadline")
        and t["deadline"] < today
    )
    in_progress = sum(1 for t in tasks if t.get("status") == "in_progress")

    # By priority
    by_priority = {
        "high": sum(1 for t in tasks if t.get("priority") == "high" and t.get("status") != "completed"),
        "medium": sum(1 for t in tasks if t.get("priority") == "medium" and t.get("status") != "completed"),
        "low": sum(1 for t in tasks if t.get("priority") == "low" and t.get("status") != "completed"),
    }

    # By subject (top 5)
    subject_counts = {}
    for t in tasks:
        subj = t.get("subject", "No Subject")
        if subj not in subject_counts:
            subject_counts[subj] = {"total": 0, "completed": 0}
        subject_counts[subj]["total"] += 1
        if t.get("status") == "completed":
            subject_counts[subj]["completed"] += 1
    top_subjects = sorted(subject_counts.items(), key=lambda x: x[1]["total"], reverse=True)[:5]

    # Completion trend (last 7 days)
    trend = {}
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_name = (now - timedelta(days=i)).strftime("%a")
        count = sum(
            1 for t in tasks
            if t.get("status") == "completed"
            and str(t.get("updated_at", "")).startswith(day)
        )
        trend[day_name] = count

    # Tags usage
    all_tags = {}
    for t in tasks:
        for tag in t.get("tags", []):
            all_tags[tag] = all_tags.get(tag, 0) + 1

    # Subtasks stats
    total_subtasks = sum(len(t.get("subtasks", [])) for t in tasks)
    done_subtasks = sum(
        sum(1 for s in t.get("subtasks", []) if s.get("done"))
        for t in tasks
    )

    return jsonify({
        "total": total,
        "completed": completed,
        "pending": pending,
        "in_progress": in_progress,
        "overdue": overdue,
        "percentage": round((completed / total * 100) if total > 0 else 0, 1),
        "by_priority": by_priority,
        "top_subjects": [{"name": s[0], "total": s[1]["total"], "completed": s[1]["completed"]} for s in top_subjects],
        "completion_trend": trend,
        "tags": all_tags,
        "subtasks_total": total_subtasks,
        "subtasks_done": done_subtasks,
    })


# ============================================================
# Create & Update & Delete
# ============================================================

@task_bp.route("", methods=["POST"])
@token_required
def create_task():
    """Create a new task with optional tags and subtasks."""
    data = request.get_json()
    if not data or not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    db = current_app.db
    now = get_now_iso()

    # Parse tags
    tags = []
    if data.get("tags"):
        if isinstance(data["tags"], list):
            tags = [sanitize_string(t, 50) for t in data["tags"] if t]
        elif isinstance(data["tags"], str):
            tags = [sanitize_string(t.strip(), 50) for t in data["tags"].split(",") if t.strip()]

    # Parse subtasks
    subtasks = []
    if data.get("subtasks") and isinstance(data["subtasks"], list):
        for st in data["subtasks"]:
            title = sanitize_string(st.get("title", ""), 200)
            if title:
                subtasks.append({"title": title, "done": False})

    task = {
        "user_id": request.user_id,
        "title": sanitize_string(data["title"], 200),
        "description": sanitize_string(data.get("description", ""), 2000),
        "subject": sanitize_string(data.get("subject", ""), 100),
        "deadline": data.get("deadline", ""),
        "priority": data.get("priority", "medium") if data.get("priority") in ("low", "medium", "high") else "medium",
        "status": data.get("status", "todo") if data.get("status") in ("todo", "in_progress", "completed") else "todo",
        "tags": tags,
        "subtasks": subtasks,
        "created_at": now,
        "updated_at": now,
    }
    result = db.tasks.insert_one(task)
    task["id"] = str(result.inserted_id)
    task.pop("_id", None)
    logger.info(f"Task created: {task['title']} by user {request.user_id}")
    return jsonify({"task": task}), 201


@task_bp.route("/<task_id>", methods=["PUT"])
@token_required
def update_task(task_id):
    """Update a task's fields."""
    oid = to_object_id(task_id)
    if not oid:
        return jsonify({"error": "Invalid task ID"}), 400

    data = request.get_json()
    db = current_app.db

    update_fields = {}
    for field in ["title", "description", "subject", "deadline", "priority", "status"]:
        if field in data:
            val = data[field]
            if field in ("title", "description", "subject"):
                val = sanitize_string(val, {"title": 200, "description": 2000, "subject": 100}.get(field, 200))
            if field == "priority" and val not in ("low", "medium", "high"):
                continue
            if field == "status" and val not in ("todo", "in_progress", "completed"):
                continue
            update_fields[field] = val

    # Handle tags update
    if "tags" in data:
        if isinstance(data["tags"], list):
            update_fields["tags"] = [sanitize_string(t, 50) for t in data["tags"] if t]
        elif isinstance(data["tags"], str):
            update_fields["tags"] = [sanitize_string(t.strip(), 50) for t in data["tags"].split(",") if t.strip()]

    update_fields["updated_at"] = get_now_iso()

    result = db.tasks.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Task not found"}), 404

    task = db.tasks.find_one({"_id": oid})
    task["id"] = str(task.pop("_id"))
    logger.info(f"Task updated: {task_id} by user {request.user_id}")
    return jsonify({"task": task})


@task_bp.route("/<task_id>", methods=["DELETE"])
@token_required
def delete_task(task_id):
    """Delete a task."""
    oid = to_object_id(task_id)
    if not oid:
        return jsonify({"error": "Invalid task ID"}), 400

    db = current_app.db
    result = db.tasks.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    logger.info(f"Task deleted: {task_id} by user {request.user_id}")
    return jsonify({"message": "Task deleted"})


# ============================================================
# Bulk Operations
# ============================================================

@task_bp.route("/bulk/complete", methods=["POST"])
@token_required
def bulk_complete():
    """Complete multiple tasks at once."""
    data = request.get_json()
    task_ids = data.get("task_ids", [])
    if not task_ids or not isinstance(task_ids, list):
        return jsonify({"error": "Task IDs are required"}), 400

    oids = [to_object_id(tid) for tid in task_ids]
    oids = [o for o in oids if o]

    if not oids:
        return jsonify({"error": "No valid task IDs"}), 400

    db = current_app.db
    result = db.tasks.update_many(
        {"_id": {"$in": oids}, "user_id": request.user_id, "status": {"$ne": "completed"}},
        {"$set": {"status": "completed", "updated_at": get_now_iso()}},
    )
    logger.info(f"Bulk completed {result.modified_count} tasks for user {request.user_id}")
    return jsonify({"message": f"{result.modified_count} tasks marked as completed"})


@task_bp.route("/bulk/delete", methods=["POST"])
@token_required
def bulk_delete():
    """Delete multiple tasks or all completed tasks."""
    data = request.get_json()
    db = current_app.db

    if data.get("delete_completed"):
        # Delete all completed tasks
        result = db.tasks.delete_many({
            "user_id": request.user_id,
            "status": "completed",
        })
        logger.info(f"Bulk deleted {result.deleted_count} completed tasks for user {request.user_id}")
        return jsonify({"message": f"{result.deleted_count} completed tasks deleted"})

    task_ids = data.get("task_ids", [])
    if not task_ids:
        return jsonify({"error": "Task IDs or delete_completed flag required"}), 400

    oids = [to_object_id(tid) for tid in task_ids]
    oids = [o for o in oids if o]

    result = db.tasks.delete_many({
        "_id": {"$in": oids},
        "user_id": request.user_id,
    })
    logger.info(f"Bulk deleted {result.deleted_count} tasks for user {request.user_id}")
    return jsonify({"message": f"{result.deleted_count} tasks deleted"})


# ============================================================
# Subtasks
# ============================================================

@task_bp.route("/<task_id>/subtasks", methods=["POST"])
@token_required
def add_subtask(task_id):
    """Add a subtask to a task."""
    oid = to_object_id(task_id)
    if not oid:
        return jsonify({"error": "Invalid task ID"}), 400

    data = request.get_json()
    title = sanitize_string(data.get("title", ""), 200) if data else ""
    if not title:
        return jsonify({"error": "Subtask title is required"}), 400

    db = current_app.db
    subtask = {"title": title, "done": False}

    result = db.tasks.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$push": {"subtasks": subtask}, "$set": {"updated_at": get_now_iso()}},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Task not found"}), 404

    logger.info(f"Subtask added to task {task_id}")
    return jsonify({"message": "Subtask added", "subtask": subtask}), 201


@task_bp.route("/<task_id>/subtasks/<int:index>", methods=["PUT"])
@token_required
def toggle_subtask(task_id, index):
    """Toggle a subtask's done status."""
    oid = to_object_id(task_id)
    if not oid:
        return jsonify({"error": "Invalid task ID"}), 400

    db = current_app.db
    task = db.tasks.find_one({"_id": oid, "user_id": request.user_id})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    subtasks = task.get("subtasks", [])
    if index < 0 or index >= len(subtasks):
        return jsonify({"error": "Invalid subtask index"}), 400

    # Toggle the done status
    new_status = not subtasks[index].get("done", False)
    db.tasks.update_one(
        {"_id": oid},
        {
            "$set": {
                f"subtasks.{index}.done": new_status,
                "updated_at": get_now_iso(),
            }
        },
    )

    # Auto-complete task if all subtasks done
    updated_task = db.tasks.find_one({"_id": oid})
    all_subtasks = updated_task.get("subtasks", [])
    if all_subtasks and all(s.get("done") for s in all_subtasks):
        db.tasks.update_one(
            {"_id": oid},
            {"$set": {"status": "completed", "updated_at": get_now_iso()}},
        )
        logger.info(f"Task {task_id} auto-completed (all subtasks done)")

    logger.info(f"Subtask {index} toggled in task {task_id}")
    return jsonify({"message": "Subtask updated", "done": new_status})


@task_bp.route("/<task_id>/subtasks/<int:index>", methods=["DELETE"])
@token_required
def remove_subtask(task_id, index):
    """Remove a subtask from a task."""
    oid = to_object_id(task_id)
    if not oid:
        return jsonify({"error": "Invalid task ID"}), 400

    db = current_app.db
    task = db.tasks.find_one({"_id": oid, "user_id": request.user_id})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    subtasks = task.get("subtasks", [])
    if index < 0 or index >= len(subtasks):
        return jsonify({"error": "Invalid subtask index"}), 400

    db.tasks.update_one(
        {"_id": oid},
        {
            "$unset": {f"subtasks.{index}": ""},
            "$set": {"updated_at": get_now_iso()},
        },
    )
    # Clean up the null entry left by $unset
    db.tasks.update_one(
        {"_id": oid},
        {"$pull": {"subtasks": None}},
    )

    logger.info(f"Subtask {index} removed from task {task_id}")
    return jsonify({"message": "Subtask removed"})
