"""Expense Tracker Routes - Enhanced v2.0"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from utils.auth import token_required
from utils.db import to_object_id
from utils.validators import sanitize_string, get_today_str, get_now_iso
from utils.logger import get_logger

logger = get_logger("expenses")

expense_bp = Blueprint("expenses", __name__)

VALID_CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Shopping", "Rent", "Utilities", "Health", "Other"]
VALID_PAYMENT_METHODS = ["cash", "card", "online", "other"]


# ---------- GET /expenses ----------
@expense_bp.route("", methods=["GET"])
@token_required
def get_expenses():
    """Get expenses with optional filters"""
    db = current_app.db
    query = {"user_id": request.user_id}

    # Category filter
    category = request.args.get("category")
    if category and category in VALID_CATEGORIES:
        query["category"] = category

    # Date range filter
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
    total = db.expenses.count_documents(query)
    expenses = list(db.expenses.find(query).sort("date", -1).skip(skip).limit(per_page))

    result = []
    for e in expenses:
        result.append({
            "id": str(e["_id"]),
            "amount": e.get("amount", 0),
            "category": e.get("category", "Other"),
            "date": e.get("date", ""),
            "description": e.get("description", ""),
            "payment_method": e.get("payment_method", "other"),
        })

    return jsonify({
        "expenses": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
    })


# ---------- GET /expenses/categories ----------
@expense_bp.route("/categories", methods=["GET"])
@token_required
def get_categories():
    """Get available expense categories"""
    categories = [
        {"name": "Food", "icon": "bi-cup-hot", "color": "#FF6384"},
        {"name": "Transport", "icon": "bi-car-front", "color": "#36A2EB"},
        {"name": "Books", "icon": "bi-book", "color": "#FFCE56"},
        {"name": "Entertainment", "icon": "bi-controller", "color": "#4BC0C0"},
        {"name": "Shopping", "icon": "bi-bag", "color": "#9966FF"},
        {"name": "Rent", "icon": "bi-house", "color": "#FF9F40"},
        {"name": "Utilities", "icon": "bi-lightning", "color": "#C9CBCF"},
        {"name": "Health", "icon": "bi-heart", "color": "#FF6B6B"},
        {"name": "Other", "icon": "bi-three-dots", "color": "#95A5A6"},
    ]
    return jsonify({"categories": categories})


# ---------- GET /expenses/analytics ----------
@expense_bp.route("/analytics", methods=["GET"])
@token_required
def get_analytics():
    """Get expense analytics and trends"""
    db = current_app.db
    now = datetime.utcnow()
    month_start = now.strftime("%Y-%m-01")

    # This month's expenses
    expenses_this_month = list(db.expenses.find({
        "user_id": request.user_id,
        "date": {"$gte": month_start},
    }))

    # Last month's expenses for comparison
    last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1).strftime("%Y-%m-01")
    last_month_end = now.replace(day=1).strftime("%Y-%m-01")
    expenses_last_month = list(db.expenses.find({
        "user_id": request.user_id,
        "date": {"$gte": last_month_start, "$lt": last_month_end},
    }))

    total_this_month = sum(e.get("amount", 0) for e in expenses_this_month)
    total_last_month = sum(e.get("amount", 0) for e in expenses_last_month)

    # Category breakdown this month
    category_breakdown = {}
    for e in expenses_this_month:
        cat = e.get("category", "Other")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + e.get("amount", 0)

    # Daily spending this month
    daily_spending = {}
    for e in expenses_this_month:
        day = e.get("date", "")[:10]
        daily_spending[day] = daily_spending.get(day, 0) + e.get("amount", 0)

    # Top categories (sorted by amount)
    top_categories = sorted(category_breakdown.items(), key=lambda x: -x[1])[:5]

    # Budget
    budget_doc = db.budgets.find_one({"user_id": request.user_id})
    budget = budget_doc.get("monthly_budget", 0) if budget_doc else 0

    # Month-over-month change
    mom_change = 0
    if total_last_month > 0:
        mom_change = round(((total_this_month - total_last_month) / total_last_month) * 100, 1)

    # Average daily spending
    days_in_month = now.day
    avg_daily = round(total_this_month / days_in_month, 2) if days_in_month > 0 else 0

    # Payment method breakdown
    payment_breakdown = {}
    for e in expenses_this_month:
        pm = e.get("payment_method", "other")
        payment_breakdown[pm] = payment_breakdown.get(pm, 0) + e.get("amount", 0)

    return jsonify({
        "total_this_month": round(total_this_month, 2),
        "total_last_month": round(total_last_month, 2),
        "mom_change": mom_change,
        "budget": budget,
        "remaining": round(budget - total_this_month, 2) if budget > 0 else 0,
        "avg_daily": avg_daily,
        "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
        "top_categories": [{"name": k, "amount": round(v, 2)} for k, v in top_categories],
        "daily_spending": {k: round(v, 2) for k, v in sorted(daily_spending.items())},
        "payment_breakdown": {k: round(v, 2) for k, v in payment_breakdown.items()},
        "expense_count": len(expenses_this_month),
    })


# ---------- POST /expenses ----------
@expense_bp.route("", methods=["POST"])
@token_required
def create_expense():
    """Create a new expense"""
    data = request.get_json()
    if not data or not data.get("amount") or not data.get("category"):
        return jsonify({"error": "Amount and category are required"}), 400

    try:
        amount = float(data["amount"])
        if amount <= 0:
            return jsonify({"error": "Amount must be positive"}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount"}), 400

    category = data["category"]
    if category not in VALID_CATEGORIES:
        category = "Other"

    payment_method = data.get("payment_method", "other")
    if payment_method not in VALID_PAYMENT_METHODS:
        payment_method = "other"

    db = current_app.db
    expense = {
        "user_id": request.user_id,
        "amount": amount,
        "category": category,
        "date": data.get("date", get_today_str()),
        "description": sanitize_string(data.get("description", ""), 200),
        "payment_method": payment_method,
        "created_at": get_now_iso(),
    }
    result = db.expenses.insert_one(expense)
    expense["id"] = str(result.inserted_id)
    expense.pop("_id", None)

    _check_budget_alert(db, request.user_id)

    logger.info(f"Expense created: {category} Rs.{amount} for user {request.user_id}")
    return jsonify({"expense": expense}), 201


# ---------- PUT /expenses/<id> ----------
@expense_bp.route("/<expense_id>", methods=["PUT"])
@token_required
def update_expense(expense_id):
    """Update an expense"""
    oid = to_object_id(expense_id)
    if not oid:
        return jsonify({"error": "Invalid expense ID"}), 400

    data = request.get_json()
    db = current_app.db

    expense = db.expenses.find_one({"_id": oid, "user_id": request.user_id})
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    update_fields = {}
    if "amount" in data:
        try:
            amount = float(data["amount"])
            if amount <= 0:
                return jsonify({"error": "Amount must be positive"}), 400
            update_fields["amount"] = amount
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid amount"}), 400
    if "category" in data:
        update_fields["category"] = data["category"] if data["category"] in VALID_CATEGORIES else "Other"
    if "date" in data:
        update_fields["date"] = data["date"]
    if "description" in data:
        update_fields["description"] = sanitize_string(data["description"], 200)
    if "payment_method" in data:
        update_fields["payment_method"] = data["payment_method"] if data["payment_method"] in VALID_PAYMENT_METHODS else "other"

    update_fields["updated_at"] = get_now_iso()

    db.expenses.update_one(
        {"_id": oid, "user_id": request.user_id},
        {"$set": update_fields},
    )
    return jsonify({"message": "Updated"})


# ---------- DELETE /expenses/<id> ----------
@expense_bp.route("/<expense_id>", methods=["DELETE"])
@token_required
def delete_expense(expense_id):
    """Delete an expense"""
    oid = to_object_id(expense_id)
    if not oid:
        return jsonify({"error": "Invalid expense ID"}), 400

    db = current_app.db
    result = db.expenses.delete_one({"_id": oid, "user_id": request.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Expense not found"}), 404

    logger.info(f"Expense deleted: {expense_id}")
    return jsonify({"message": "Deleted"})


# ---------- GET /expenses/budget ----------
@expense_bp.route("/budget", methods=["GET"])
@token_required
def get_budget():
    """Get monthly budget"""
    db = current_app.db
    budget = db.budgets.find_one({"user_id": request.user_id})
    return jsonify({"budget": budget.get("monthly_budget", 0) if budget else 0})


# ---------- PUT /expenses/budget ----------
@expense_bp.route("/budget", methods=["PUT"])
@token_required
def set_budget():
    """Set monthly budget"""
    data = request.get_json()
    db = current_app.db

    try:
        monthly_budget = float(data.get("monthly_budget", 0))
        if monthly_budget < 0:
            return jsonify({"error": "Budget must be non-negative"}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid budget amount"}), 400

    db.budgets.update_one(
        {"user_id": request.user_id},
        {"$set": {"monthly_budget": monthly_budget, "updated_at": get_now_iso()}},
        upsert=True,
    )
    logger.info(f"Budget updated: Rs.{monthly_budget} for user {request.user_id}")
    return jsonify({"message": "Budget updated", "budget": monthly_budget})


# ---------- GET /expenses/stats ----------
@expense_bp.route("/stats", methods=["GET"])
@token_required
def get_stats():
    """Get expense statistics for current month"""
    db = current_app.db
    now = datetime.utcnow()
    month_start = now.strftime("%Y-%m-01")
    expenses = list(db.expenses.find({
        "user_id": request.user_id,
        "date": {"$gte": month_start},
    }))
    total_spent = sum(e.get("amount", 0) for e in expenses)
    budget_doc = db.budgets.find_one({"user_id": request.user_id})
    budget = budget_doc.get("monthly_budget", 0) if budget_doc else 0

    category_breakdown = {}
    for e in expenses:
        cat = e.get("category", "Other")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + e.get("amount", 0)

    return jsonify({
        "total_spent": round(total_spent, 2),
        "budget": budget,
        "remaining": round(budget - total_spent, 2),
        "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
    })


# ---------- POST /expenses/bulk ----------
@expense_bp.route("/bulk", methods=["POST"])
@token_required
def bulk_create():
    """Create multiple expenses at once"""
    data = request.get_json()
    if not data or not isinstance(data.get("expenses"), list):
        return jsonify({"error": "expenses array is required"}), 400

    expenses_data = data["expenses"]
    if len(expenses_data) > 100:
        return jsonify({"error": "Maximum 100 expenses at once"}), 400

    db = current_app.db
    created = []
    errors = []

    for i, item in enumerate(expenses_data):
        try:
            amount = float(item.get("amount", 0))
            if amount <= 0:
                errors.append({"index": i, "error": "Amount must be positive"})
                continue
        except (TypeError, ValueError):
            errors.append({"index": i, "error": "Invalid amount"})
            continue

        category = item.get("category", "Other")
        if category not in VALID_CATEGORIES:
            category = "Other"

        expense = {
            "user_id": request.user_id,
            "amount": amount,
            "category": category,
            "date": item.get("date", get_today_str()),
            "description": sanitize_string(item.get("description", ""), 200),
            "payment_method": item.get("payment_method", "other") if item.get("payment_method") in VALID_PAYMENT_METHODS else "other",
            "created_at": get_now_iso(),
        }
        result = db.expenses.insert_one(expense)
        expense["id"] = str(result.inserted_id)
        expense.pop("_id", None)
        created.append(expense)

    if created:
        _check_budget_alert(db, request.user_id)

    logger.info(f"Bulk expenses: {len(created)} created, {len(errors)} errors")
    return jsonify({"created": created, "errors": errors, "total_created": len(created)}), 201 if created else 400


def _check_budget_alert(db, user_id):
    """Check if the user has exceeded their monthly budget and create a notification."""
    now = datetime.utcnow()
    month_start = now.strftime("%Y-%m-01")
    expenses = list(db.expenses.find({"user_id": user_id, "date": {"$gte": month_start}}))
    total = sum(e.get("amount", 0) for e in expenses)
    budget_doc = db.budgets.find_one({"user_id": user_id})
    budget = budget_doc.get("monthly_budget", 0) if budget_doc else 0
    if budget > 0 and total > budget:
        existing = db.notifications.find_one({
            "user_id": user_id,
            "type": "budget",
            "created_at": {"$gte": now.strftime("%Y-%m-%d")},
        })
        if not existing:
            db.notifications.insert_one({
                "user_id": user_id,
                "type": "budget",
                "title": "Budget Exceeded!",
                "message": f"You have spent Rs.{total:.2f} which exceeds your monthly budget of Rs.{budget:.2f}",
                "read": False,
                "created_at": get_now_iso(),
            })
            logger.info(f"Budget alert created for user {user_id}: {total:.2f} > {budget:.2f}")
