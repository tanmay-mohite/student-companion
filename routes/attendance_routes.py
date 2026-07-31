from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string, get_today_str
from utils.logger import get_logger

logger = get_logger("attendance")

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.route("/subjects", methods=["GET"])
@token_required
def get_subjects():
    db = current_app.db
    subjects = list(db.attendance_subjects.find({"user_id": request.user_id}))
    result = []
    for s in subjects:
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "credit_hours": s.get("credit_hours", 0),
        })
    return jsonify({"subjects": result})


@attendance_bp.route("/subjects", methods=["POST"])
@token_required
def create_subject():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Subject name is required"}), 400
    db = current_app.db
    subject = {
        "user_id": request.user_id,
        "name": sanitize_string(data["name"], 100),
        "credit_hours": data.get("credit_hours", 0),
    }
    result = db.attendance_subjects.insert_one(subject)
    subject["id"] = str(result.inserted_id)
    subject.pop("_id", None)
    return jsonify({"subject": subject}), 201


@attendance_bp.route("/subjects/<subject_id>", methods=["PUT"])
@token_required
def update_subject(subject_id):
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    data = request.get_json()
    db = current_app.db
    update_fields = {}
    if "name" in data:
        update_fields["name"] = sanitize_string(data["name"], 100)
    if "credit_hours" in data:
        update_fields["credit_hours"] = data["credit_hours"]
    db.attendance_subjects.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$set": update_fields},
    )
    return jsonify({"message": "Updated"})


@attendance_bp.route("/subjects/<subject_id>", methods=["DELETE"])
@token_required
def delete_subject(subject_id):
    oid = to_object_id(subject_id)
    if not oid:
        return jsonify({"error": "Invalid subject ID"}), 400

    db = current_app.db
    db.attendance_subjects.delete_one({"_id": oid, "user_id": request.user_id})
    db.attendance_records.delete_many({"subject_id": subject_id, "user_id": request.user_id})
    return jsonify({"message": "Deleted"})


@attendance_bp.route("/records", methods=["POST"])
@token_required
def mark_attendance():
    data = request.get_json()
    if not data or not data.get("subject_id") or not data.get("date"):
        return jsonify({"error": "subject_id and date are required"}), 400
    db = current_app.db
    record = {
        "user_id": request.user_id,
        "subject_id": data["subject_id"],
        "date": data["date"],
        "status": data.get("status", "present"),
    }
    existing = db.attendance_records.find_one({
        "user_id": request.user_id,
        "subject_id": data["subject_id"],
        "date": data["date"],
    })
    if existing:
        db.attendance_records.update_one({"_id": existing["_id"]}, {"$set": {"status": record["status"]}})
        record["id"] = str(existing["_id"])
    else:
        result = db.attendance_records.insert_one(record)
        record["id"] = str(result.inserted_id)
    return jsonify({"record": record})


@attendance_bp.route("/bulk", methods=["POST"])
@token_required
def bulk_mark():
    data = request.get_json()
    if not data or not data.get("date") or not data.get("records"):
        return jsonify({"error": "date and records are required"}), 400
    db = current_app.db
    results = []
    for r in data["records"]:
        record = {
            "user_id": request.user_id,
            "subject_id": r["subject_id"],
            "date": data["date"],
            "status": r.get("status", "present"),
        }
        existing = db.attendance_records.find_one({
            "user_id": request.user_id,
            "subject_id": r["subject_id"],
            "date": data["date"],
        })
        if existing:
            db.attendance_records.update_one({"_id": existing["_id"]}, {"$set": {"status": record["status"]}})
            record["id"] = str(existing["_id"])
        else:
            result = db.attendance_records.insert_one(record)
            record["id"] = str(result.inserted_id)
        record.pop("_id", None)
        results.append(record)
    return jsonify({"records": results})


@attendance_bp.route("/records", methods=["GET"])
@token_required
def get_records():
    db = current_app.db
    query = {"user_id": request.user_id}
    subject_id = request.args.get("subject_id")
    if subject_id:
        query["subject_id"] = subject_id
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")
    if from_date or to_date:
        date_filter = {}
        if from_date:
            date_filter["$gte"] = from_date
        if to_date:
            date_filter["$lte"] = to_date
        if date_filter:
            query["date"] = date_filter

    records = list(db.attendance_records.find(query))
    result = []
    for r in records:
        result.append({
            "id": str(r["_id"]),
            "subject_id": r["subject_id"],
            "date": r["date"],
            "status": r["status"],
        })
    return jsonify({"records": result})


@attendance_bp.route("/stats", methods=["GET"])
@token_required
def get_stats():
    db = current_app.db
    user_id = request.user_id
    target = int(request.args.get("target", 75))
    subjects = list(db.attendance_subjects.find({"user_id": user_id}))
    stats = []
    total_present = 0
    total_classes = 0
    total_absent = 0
    total_leave = 0

    for s in subjects:
        records = list(db.attendance_records.find({
            "user_id": user_id,
            "subject_id": str(s["_id"]),
        }))
        total = len(records)
        present = sum(1 for r in records if r["status"] == "present")
        absent = sum(1 for r in records if r["status"] == "absent")
        leave = sum(1 for r in records if r["status"] == "leave")
        pct = round((present / total * 100) if total > 0 else 0, 1)
        total_present += present
        total_classes += total
        total_absent += absent
        total_leave += leave

        # Calculate classes needed / can skip
        classes_needed = 0
        classes_can_skip = 0
        if total > 0:
            if pct < target:
                sim_total = total
                sim_present = present
                while sim_total > 0 and (sim_present / sim_total * 100) < target:
                    sim_total += 1
                    sim_present += 1
                    classes_needed += 1
                    if classes_needed > 200:
                        break
            else:
                sim_total = total
                sim_present = present
                while sim_total > 0 and (sim_present / (sim_total + 1) * 100) >= target:
                    sim_total += 1
                    classes_can_skip += 1
                    if classes_can_skip > 200:
                        break

        status = "red" if pct < target else ("yellow" if pct < target + 10 else "green")
        stats.append({
            "subject_id": str(s["_id"]),
            "subject_name": s["name"],
            "credit_hours": s.get("credit_hours", 0),
            "total": total,
            "present": present,
            "absent": absent,
            "leave": leave,
            "percentage": pct,
            "status": status,
            "classes_needed": classes_needed,
            "classes_can_skip": classes_can_skip,
        })

    overall_pct = round((total_present / total_classes * 100) if total_classes > 0 else 0, 1)
    return jsonify({
        "subjects": stats,
        "overall_percentage": overall_pct,
        "overall_status": "red" if overall_pct < target else ("yellow" if overall_pct < target + 10 else "green"),
        "total_classes": total_classes,
        "total_present": total_present,
        "total_absent": total_absent,
        "total_leave": total_leave,
        "target": target,
        "subject_count": len(subjects),
    })


@attendance_bp.route("/predictions", methods=["GET"])
@token_required
def get_predictions():
    db = current_app.db
    user_id = request.user_id
    target = int(request.args.get("target", 75))
    subjects = list(db.attendance_subjects.find({"user_id": user_id}))
    predictions = []
    for s in subjects:
        records = list(db.attendance_records.find({
            "user_id": user_id,
            "subject_id": str(s["_id"]),
        }))
        total = len(records)
        present = sum(1 for r in records if r["status"] == "present")
        pct = round((present / total * 100) if total > 0 else 0, 1)

        advice = ""
        urgency = "info"
        if total > 0:
            if pct < target:
                needed = 0
                sim_total = total
                sim_present = present
                while sim_total > 0 and (sim_present / sim_total * 100) < target:
                    sim_total += 1
                    sim_present += 1
                    needed += 1
                    if needed > 200:
                        break
                advice = f"Attend next {needed} classes to reach {target}%"
                urgency = "danger" if pct < target - 10 else "warning"
            else:
                skip = 0
                sim_total = total
                sim_present = present
                while sim_total > 0 and (sim_present / (sim_total + 1) * 100) >= target:
                    sim_total += 1
                    skip += 1
                    if skip > 200:
                        break
                if skip > 0:
                    advice = f"You can skip next {skip} classes safely"
                    urgency = "success"
                else:
                    advice = f"At {target}% target - maintain attendance"
                    urgency = "info"
        else:
            advice = "No attendance recorded yet"

        predictions.append({
            "subject_id": str(s["_id"]),
            "subject_name": s["name"],
            "percentage": pct,
            "advice": advice,
            "urgency": urgency,
        })
    return jsonify({"predictions": predictions, "target": target})


@attendance_bp.route("/calendar", methods=["GET"])
@token_required
def get_calendar():
    db = current_app.db
    now = datetime.utcnow()
    year = int(request.args.get("year", now.year))
    month = int(request.args.get("month", now.month))

    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"

    records = list(db.attendance_records.find({
        "user_id": request.user_id,
        "date": {"$gte": start_date, "$lt": end_date},
    }))

    calendar_data = {}
    for r in records:
        day = r["date"]
        if day not in calendar_data:
            calendar_data[day] = {"total": 0, "present": 0}
        calendar_data[day]["total"] += 1
        if r["status"] == "present":
            calendar_data[day]["present"] += 1

    result = {}
    for day, data in calendar_data.items():
        result[day] = round((data["present"] / data["total"] * 100) if data["total"] > 0 else 0, 1)

    return jsonify({"calendar": result, "year": year, "month": month})
