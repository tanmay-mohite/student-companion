"""GPA/CGPA Calculator Routes - Enhanced v2.0"""

from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string
from utils.logger import get_logger
from datetime import datetime

logger = get_logger("gpa")

gpa_bp = Blueprint("gpa", __name__)

GRADE_POINTS_10 = {"A+": 10, "A": 9, "B+": 8, "B": 7, "C+": 6, "C": 5, "D": 4, "F": 0}
GRADE_POINTS_4 = {"A+": 4.0, "A": 4.0, "B+": 3.3, "B": 3.0, "C+": 2.3, "C": 2.0, "D": 1.0, "F": 0}
VALID_GRADES_10 = list(GRADE_POINTS_10.keys())
VALID_GRADES_4 = list(GRADE_POINTS_4.keys())


def calc_gpa(subjects, scale="10"):
    """Calculate GPA from subjects with grades and credits."""
    points_map = GRADE_POINTS_10 if scale == "10" else GRADE_POINTS_4
    total_points = 0
    total_credits = 0
    for s in subjects:
        grade = s.get("grade", "F")
        credits = s.get("credits", 0)
        if not isinstance(credits, (int, float)) or credits < 0:
            continue
        gp = points_map.get(grade, 0)
        total_points += gp * credits
        total_credits += credits
    return round((total_points / total_credits) if total_credits > 0 else 0, 2)


def calc_cgpa_weighted(semesters, scale="10"):
    """Calculate credit-weighted CGPA across semesters."""
    points_map = GRADE_POINTS_10 if scale == "10" else GRADE_POINTS_4
    total_points = 0
    total_credits = 0
    for sem in semesters:
        subjects = sem.get("subjects", [])
        for s in subjects:
            grade = s.get("grade", "F")
            credits = s.get("credits", 0)
            if not isinstance(credits, (int, float)) or credits < 0:
                continue
            gp = points_map.get(grade, 0)
            total_points += gp * credits
            total_credits += credits
    return round((total_points / total_credits) if total_credits > 0 else 0, 2)


def validate_subjects(subjects, scale="10"):
    """Validate and clean subjects list."""
    valid_grades = VALID_GRADES_10 if scale == "10" else VALID_GRADES_4
    cleaned = []
    for s in subjects:
        if not isinstance(s, dict):
            continue
        name = sanitize_string(s.get("name", ""), 100)
        if not name:
            continue
        credits = s.get("credits", 0)
        if not isinstance(credits, (int, float)) or credits < 0:
            credits = 0
        grade = s.get("grade", "F")
        if grade not in valid_grades:
            grade = "F"
        cleaned.append({
            "name": name,
            "credits": float(credits),
            "grade": grade,
        })
    return cleaned


# ---------- GET /gpa/semesters ----------
@gpa_bp.route("/semesters", methods=["GET"])
@token_required
def get_semesters():
    """Get all semesters with GPA data"""
    db = current_app.db
    semesters = list(db.gpa_semesters.find({"user_id": request.user_id}))
    result = []
    total_credits_all = 0

    for sem in semesters:
        subjects = sem.get("subjects", [])
        sem_credits = sum(s.get("credits", 0) for s in subjects if isinstance(s.get("credits", 0), (int, float)))
        total_credits_all += sem_credits

        # Grade distribution
        grade_dist = {}
        for s in subjects:
            g = s.get("grade", "F")
            grade_dist[g] = grade_dist.get(g, 0) + 1

        result.append({
            "id": str(sem["_id"]),
            "name": sem.get("name", ""),
            "subjects": subjects,
            "gpa": sem.get("gpa", 0),
            "scale": sem.get("scale", "10"),
            "total_credits": sem_credits,
            "subject_count": len(subjects),
            "grade_distribution": grade_dist,
            "created_at": sem.get("created_at", ""),
        })

    # Credit-weighted CGPA
    cgpa = calc_cgpa_weighted(semesters)

    return jsonify({
        "semesters": result,
        "cgpa": cgpa,
        "total_credits": total_credits_all,
    })


# ---------- GET /gpa/stats ----------
@gpa_bp.route("/stats", methods=["GET"])
@token_required
def get_stats():
    """Get GPA statistics and trends"""
    db = current_app.db
    semesters = list(db.gpa_semesters.find({"user_id": request.user_id}).sort("created_at", 1))

    if not semesters:
        return jsonify({
            "total_semesters": 0,
            "cgpa": 0,
            "total_credits": 0,
            "trend": [],
            "best_semester": None,
            "worst_semester": None,
            "average_gpa": 0,
            "improving": None,
        })

    # Trend data
    trend = []
    for sem in semesters:
        trend.append({
            "name": sem.get("name", ""),
            "gpa": sem.get("gpa", 0),
            "credits": sum(s.get("credits", 0) for s in sem.get("subjects", []) if isinstance(s.get("credits", 0), (int, float))),
        })

    # Best and worst semesters
    gpas = [(sem.get("name", ""), sem.get("gpa", 0)) for sem in semesters]
    best = max(gpas, key=lambda x: x[1]) if gpas else ("", 0)
    worst = min(gpas, key=lambda x: x[1]) if gpas else ("", 0)

    # Check if improving (compare last 2 semesters)
    improving = None
    if len(gpas) >= 2:
        improving = gpas[-1][1] > gpas[-2][1]

    # Total credits
    total_credits = 0
    for sem in semesters:
        for s in sem.get("subjects", []):
            c = s.get("credits", 0)
            if isinstance(c, (int, float)):
                total_credits += c

    # Credit-weighted CGPA
    cgpa = calc_cgpa_weighted(semesters)

    # Average GPA (simple)
    avg_gpa = round(sum(s.get("gpa", 0) for s in semesters) / len(semesters), 2) if semesters else 0

    return jsonify({
        "total_semesters": len(semesters),
        "cgpa": cgpa,
        "total_credits": total_credits,
        "trend": trend,
        "best_semester": {"name": best[0], "gpa": best[1]},
        "worst_semester": {"name": worst[0], "gpa": worst[1]},
        "average_gpa": avg_gpa,
        "improving": improving,
    })


# ---------- POST /gpa/calculator ----------
@gpa_bp.route("/calculator", methods=["POST"])
@token_required
def calculate_gpa():
    """Quick GPA calculation without saving"""
    data = request.get_json()
    if not data or not isinstance(data.get("subjects"), list):
        return jsonify({"error": "subjects array is required"}), 400

    scale = data.get("scale", "10")
    if scale not in ("10", "4"):
        scale = "10"

    subjects = validate_subjects(data["subjects"], scale)
    if not subjects:
        return jsonify({"error": "At least one valid subject required"}), 400

    gpa = calc_gpa(subjects, scale)
    total_credits = sum(s["credits"] for s in subjects)

    # Grade breakdown
    points_map = GRADE_POINTS_10 if scale == "10" else GRADE_POINTS_4
    breakdown = []
    for s in subjects:
        breakdown.append({
            "name": s["name"],
            "credits": s["credits"],
            "grade": s["grade"],
            "points": points_map.get(s["grade"], 0),
            "weighted": round(points_map.get(s["grade"], 0) * s["credits"], 2),
        })

    return jsonify({
        "gpa": gpa,
        "scale": scale,
        "total_credits": total_credits,
        "breakdown": breakdown,
    })


# ---------- POST /gpa/semesters ----------
@gpa_bp.route("/semesters", methods=["POST"])
@token_required
def create_semester():
    """Create a new semester"""
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Semester name is required"}), 400

    db = current_app.db
    name = sanitize_string(data["name"], 100)

    # Check duplicate
    existing = db.gpa_semesters.find_one({"user_id": request.user_id, "name": name})
    if existing:
        return jsonify({"error": "Semester already exists"}), 409

    scale = data.get("scale", "10")
    if scale not in ("10", "4"):
        scale = "10"

    subjects = validate_subjects(data.get("subjects", []), scale)
    gpa_val = calc_gpa(subjects, scale)

    semester = {
        "user_id": request.user_id,
        "name": name,
        "subjects": subjects,
        "gpa": gpa_val,
        "scale": scale,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = db.gpa_semesters.insert_one(semester)
    semester["id"] = str(result.inserted_id)
    semester.pop("_id", None)
    logger.info(f"GPA semester created: {name} with GPA {gpa_val}")
    return jsonify({"semester": semester}), 201


# ---------- PUT /gpa/semesters/<id> ----------
@gpa_bp.route("/semesters/<semester_id>", methods=["PUT"])
@token_required
def update_semester(semester_id):
    """Update a semester"""
    oid = to_object_id(semester_id)
    if not oid:
        return jsonify({"error": "Invalid semester ID"}), 400

    data = request.get_json()
    db = current_app.db

    semester = db.gpa_semesters.find_one({"_id": oid, "user_id": request.user_id})
    if not semester:
        return jsonify({"error": "Semester not found"}), 404

    update_fields = {}
    if "name" in data:
        update_fields["name"] = sanitize_string(data["name"], 100)
    if "subjects" in data:
        scale = data.get("scale", semester.get("scale", "10"))
        update_fields["subjects"] = validate_subjects(data["subjects"], scale)
        update_fields["gpa"] = calc_gpa(update_fields["subjects"], scale)
    if "scale" in data and data["scale"] in ("10", "4"):
        update_fields["scale"] = data["scale"]
        subjects = update_fields.get("subjects", semester.get("subjects", []))
        update_fields["gpa"] = calc_gpa(subjects, data["scale"])

    update_fields["updated_at"] = datetime.utcnow().isoformat()

    db.gpa_semesters.update_one(
        {"_id": oid},
        {"$set": update_fields},
    )
    return jsonify({"message": "Updated"})


# ---------- DELETE /gpa/semesters/<id> ----------
@gpa_bp.route("/semesters/<semester_id>", methods=["DELETE"])
@token_required
def delete_semester(semester_id):
    """Delete a semester"""
    oid = to_object_id(semester_id)
    if not oid:
        return jsonify({"error": "Invalid semester ID"}), 400

    db = current_app.db
    result = db.gpa_semesters.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Semester not found"}), 404

    logger.info(f"GPA semester deleted: {semester_id}")
    return jsonify({"message": "Deleted"})


# ---------- GET /gpa/overview ----------
@gpa_bp.route("/overview", methods=["GET"])
@token_required
def get_overview():
    """Get GPA overview"""
    db = current_app.db
    semesters = list(db.gpa_semesters.find({"user_id": request.user_id}))
    cgpa = calc_cgpa_weighted(semesters)
    total_credits = sum(
        s.get("credits", 0)
        for sem in semesters
        for s in sem.get("subjects", [])
        if isinstance(s.get("credits", 0), (int, float))
    )
    return jsonify({
        "total_semesters": len(semesters),
        "cgpa": cgpa,
        "total_credits": total_credits,
    })
