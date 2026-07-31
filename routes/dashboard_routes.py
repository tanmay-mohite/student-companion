from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import get_today_str, get_now_iso
from utils.logger import get_logger

logger = get_logger("dashboard")

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/overview", methods=["GET"])
@token_required
def get_overview():
    """Main dashboard overview with all key metrics."""
    db = current_app.db
    user_id = request.user_id
    today = get_today_str()
    now = datetime.utcnow()

    # --- Attendance ---
    subjects = list(db.attendance_subjects.find({"user_id": user_id}))
    total_present = 0
    total_classes = 0
    subject_attendance = []
    for s in subjects:
        records = list(db.attendance_records.find({"user_id": user_id, "subject_id": str(s["_id"])}))
        n_classes = len(records)
        n_present = sum(1 for r in records if r["status"] == "present")
        total_classes += n_classes
        total_present += n_present
        pct = round((n_present / n_classes * 100) if n_classes > 0 else 0, 1)
        subject_attendance.append({
            "subject_id": str(s["_id"]),
            "name": s.get("name", ""),
            "percentage": pct,
            "present": n_present,
            "total": n_classes,
        })
    attendance_pct = round((total_present / total_classes * 100) if total_classes > 0 else 0, 1)

    # --- Tasks ---
    tasks = list(db.tasks.find({"user_id": user_id}))
    tasks_total = len(tasks)
    tasks_completed = sum(1 for t in tasks if t.get("status") == "completed")
    tasks_pending = sum(1 for t in tasks if t.get("status") in ("todo", "in_progress"))
    tasks_overdue = sum(
        1 for t in tasks
        if t.get("status") != "completed"
        and t.get("deadline", "") < today
    )
    tasks_rate = round((tasks_completed / tasks_total * 100) if tasks_total > 0 else 0, 1)

    # --- CGPA ---
    semesters = list(db.gpa_semesters.find({"user_id": user_id}))
    gpas = [s.get("gpa", 0) for s in semesters if s.get("gpa")]
    cgpa = round(sum(gpas) / len(gpas), 2) if gpas else 0

    # --- Study hours (from timetable this week) ---
    timetable_entries = list(db.timetable.find({"user_id": user_id}))
    study_hours = 0
    for entry in timetable_entries:
        try:
            start_h, start_m = map(int, entry["start_time"].split(":"))
            end_h, end_m = map(int, entry["end_time"].split(":"))
            hours = (end_h + end_m / 60) - (start_h + start_m / 60)
            study_hours += max(0, hours)
        except (ValueError, KeyError):
            pass
    study_hours = round(study_hours, 1)

    # --- Expenses this month ---
    month_start = now.strftime("%Y-%m-01")
    expenses = list(db.expenses.find({"user_id": user_id, "date": {"$gte": month_start}}))
    monthly_expenses = sum(e["amount"] for e in expenses)

    # Budget
    budget_doc = db.budgets.find_one({"user_id": user_id})
    budget = budget_doc["monthly_budget"] if budget_doc else 0
    budget_remaining = max(budget - monthly_expenses, 0)
    budget_pct = round((monthly_expenses / budget * 100) if budget > 0 else 0, 1)

    # --- Upcoming deadlines (next 7 days) ---
    week_later = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    upcoming_tasks = list(db.tasks.find({
        "user_id": user_id,
        "status": {"$ne": "completed"},
        "deadline": {"$gte": today, "$lte": week_later},
    }).sort("deadline", 1).limit(10))
    upcoming = []
    for t in upcoming_tasks:
        upcoming.append({
            "id": str(t["_id"]),
            "title": t["title"],
            "subject": t.get("subject", ""),
            "deadline": t.get("deadline", ""),
            "priority": t.get("priority", "medium"),
        })

    # --- Streak ---
    streak_doc = db.streaks.find_one({"user_id": user_id})
    current_streak = streak_doc["current_streak"] if streak_doc else 0
    longest_streak = streak_doc["longest_streak"] if streak_doc else 0

    # --- Productivity score (weighted: tasks 40%, attendance 40%, streak 20%) ---
    prod_score = round(
        (tasks_rate * 0.4)
        + (attendance_pct * 0.4)
        + (min(current_streak / 30 * 100, 100) * 0.2),
        1,
    )

    # --- Weekly activity (tasks completed per day, last 7 days) ---
    weekly_activity = {}
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_name = (now - timedelta(days=i)).strftime("%a")
        completed = list(db.tasks.find({
            "user_id": user_id,
            "status": "completed",
            "updated_at": {"$regex": f"^{day}"},
        }))
        weekly_activity[day_name] = len(completed)

    # --- Alerts ---
    alerts = []
    # Low attendance alerts
    for sa in subject_attendance:
        if sa["total"] >= 3 and sa["percentage"] < 75:
            alerts.append({
                "type": "attendance",
                "severity": "danger" if sa["percentage"] < 65 else "warning",
                "message": f"{sa['name']} attendance is {sa['percentage']}%",
                "icon": "bi-calendar-x",
            })
    # Budget alert
    if budget > 0 and budget_pct > 80:
        alerts.append({
            "type": "budget",
            "severity": "danger" if budget_pct > 100 else "warning",
            "message": f"You've used {budget_pct}% of your monthly budget",
            "icon": "bi-exclamation-triangle",
        })
    # Overdue tasks alert
    if tasks_overdue > 0:
        alerts.append({
            "type": "tasks",
            "severity": "danger",
            "message": f"You have {tasks_overdue} overdue task{'s' if tasks_overdue > 1 else ''}",
            "icon": "bi-clock-history",
        })

    return jsonify({
        "attendance_percentage": attendance_pct,
        "tasks_completion_rate": tasks_rate,
        "tasks_total": tasks_total,
        "tasks_completed": tasks_completed,
        "tasks_pending": tasks_pending,
        "tasks_overdue": tasks_overdue,
        "cgpa": cgpa,
        "study_hours": study_hours,
        "monthly_expenses": monthly_expenses,
        "budget": budget,
        "budget_remaining": budget_remaining,
        "budget_percentage": budget_pct,
        "upcoming_deadlines": upcoming,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "productivity_score": prod_score,
        "weekly_activity": weekly_activity,
        "alerts": alerts,
        "subject_count": len(subjects),
    })


@dashboard_bp.route("/today-schedule", methods=["GET"])
@token_required
def today_schedule():
    """Get today's timetable and tasks due today."""
    db = current_app.db
    user_id = request.user_id
    today = get_today_str()
    now = datetime.utcnow()

    # Current day of week (0=Monday for timetable)
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    today_day = day_names[now.weekday()]

    # Today's timetable entries
    entries = list(db.timetable.find({
        "user_id": user_id,
        "day": today_day,
    }).sort("start_time", 1))

    classes = []
    current_time = now.strftime("%H:%M")
    for e in entries:
        status = "upcoming"
        if e.get("end_time", "") < current_time:
            status = "completed"
        elif e.get("start_time", "") <= current_time <= e.get("end_time", ""):
            status = "ongoing"
        classes.append({
            "id": str(e["_id"]),
            "subject": e.get("subject", ""),
            "room": e.get("room", ""),
            "start_time": e.get("start_time", ""),
            "end_time": e.get("end_time", ""),
            "teacher": e.get("teacher", ""),
            "status": status,
        })

    # Tasks due today
    tasks_today = list(db.tasks.find({
        "user_id": user_id,
        "deadline": today,
        "status": {"$ne": "completed"},
    }).sort("priority", 1))

    tasks = []
    for t in tasks_today:
        tasks.append({
            "id": str(t["_id"]),
            "title": t["title"],
            "subject": t.get("subject", ""),
            "priority": t.get("priority", "medium"),
            "status": t.get("status", "todo"),
        })

    return jsonify({
        "day": today_day,
        "date": today,
        "classes": classes,
        "tasks_due_today": tasks,
        "total_classes_today": len(classes),
    })


@dashboard_bp.route("/recent-activity", methods=["GET"])
@token_required
def recent_activity():
    """Get recent activity feed for the user."""
    db = current_app.db
    user_id = request.user_id

    activities = []

    # Recently completed tasks
    completed_tasks = list(db.tasks.find({
        "user_id": user_id,
        "status": "completed",
    }).sort("updated_at", -1).limit(10))

    for t in completed_tasks:
        activities.append({
            "type": "task_completed",
            "icon": "bi-check-circle",
            "color": "success",
            "title": f"Completed: {t['title']}",
            "subtitle": t.get("subject", ""),
            "timestamp": t.get("updated_at", ""),
        })

    # Recent attendance records
    recent_attendance = list(db.attendance_records.find({
        "user_id": user_id,
    }).sort("date", -1).limit(10))

    for a in recent_attendance:
        subject = db.attendance_subjects.find_one({"_id": to_object_id(a.get("subject_id", ""))})
        activities.append({
            "type": "attendance",
            "icon": "bi-calendar-check" if a["status"] == "present" else "bi-calendar-x",
            "color": "info" if a["status"] == "present" else "danger",
            "title": f"{a['status'].capitalize()}: {subject['name'] if subject else 'Unknown'}",
            "subtitle": a.get("date", ""),
            "timestamp": a.get("date", ""),
        })

    # Recent expense entries
    recent_expenses = list(db.expenses.find({
        "user_id": user_id,
    }).sort("created_at", -1).limit(5))

    for e in recent_expenses:
        activities.append({
            "type": "expense",
            "icon": "bi-wallet2",
            "color": "warning",
            "title": f"Expense: Rs.{e['amount']} - {e.get('category', '')}",
            "subtitle": e.get("description", ""),
            "timestamp": e.get("created_at", ""),
        })

    # Sort all activities by timestamp descending
    activities.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)

    return jsonify({"activities": activities[:20]})


@dashboard_bp.route("/attendance-alerts", methods=["GET"])
@token_required
def attendance_alerts():
    """Get subjects with low attendance that need attention."""
    db = current_app.db
    user_id = request.user_id

    subjects = list(db.attendance_subjects.find({"user_id": user_id}))
    alerts = []

    for s in subjects:
        records = list(db.attendance_records.find({"user_id": user_id, "subject_id": str(s["_id"])}))
        n_classes = len(records)
        n_present = sum(1 for r in records if r["status"] == "present")
        pct = round((n_present / n_classes * 100) if n_classes > 0 else 0, 1)

        # Calculate how many classes needed to reach 75%
        if n_classes > 0 and pct < 75:
            # How many consecutive classes needed to reach 75%?
            needed = 0
            temp_present = n_present
            temp_total = n_classes
            while temp_total > 0 and (temp_present / temp_total * 100) < 75:
                temp_present += 1
                temp_total += 1
                needed += 1
                if needed > 100:
                    break
            alerts.append({
                "subject_id": str(s["_id"]),
                "name": s.get("name", ""),
                "percentage": pct,
                "present": n_present,
                "total": n_classes,
                "classes_needed": needed,
                "severity": "danger" if pct < 65 else "warning",
            })
        elif n_classes == 0:
            alerts.append({
                "subject_id": str(s["_id"]),
                "name": s.get("name", ""),
                "percentage": 0,
                "present": 0,
                "total": 0,
                "classes_needed": 0,
                "severity": "info",
            })

    # Sort by percentage ascending (worst first)
    alerts.sort(key=lambda x: x["percentage"])

    return jsonify({"alerts": alerts})
