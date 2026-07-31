"""
Reusable MongoDB helper functions.
Provides a clean interface for common database operations across all modules.
"""

from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime


def get_collection(db, collection_name):
    """Get a collection reference from the database."""
    return db[collection_name]


def find_one(db, collection, query, projection=None):
    """Find a single document. Returns None if not found."""
    col = db[collection]
    return col.find_one(query, projection)


def find_many(db, collection, query=None, sort=None, limit=0, skip=0, projection=None):
    """Find multiple documents with optional sorting, pagination."""
    col = db[collection]
    query = query or {}
    cursor = col.find(query, projection)
    if sort:
        cursor = cursor.sort(sort)
    if skip:
        cursor = cursor.skip(skip)
    if limit:
        cursor = cursor.limit(limit)
    return list(cursor)


def insert_one(db, collection, document):
    """Insert a document and return its ID as string."""
    col = db[collection]
    result = col.insert_one(document)
    return str(result.inserted_id)


def insert_many(db, collection, documents):
    """Insert multiple documents and return their IDs."""
    col = db[collection]
    result = col.insert_many(documents)
    return [str(id) for id in result.inserted_ids]


def update_one(db, collection, query, update_fields):
    """Update a single document. Returns matched count."""
    col = db[collection]
    update_fields["updated_at"] = datetime.utcnow()
    result = col.update_one(query, {"$set": update_fields})
    return result.matched_count


def upsert_one(db, collection, query, update_fields):
    """Update or insert a single document."""
    col = db[collection]
    update_fields["updated_at"] = datetime.utcnow()
    result = col.update_one(query, {"$set": update_fields}, upsert=True)
    return result.upserted_id or result.matched_id


def delete_one(db, collection, query):
    """Delete a single document. Returns deleted count."""
    col = db[collection]
    result = col.delete_one(query)
    return result.deleted_count


def delete_many(db, collection, query):
    """Delete multiple documents. Returns deleted count."""
    col = db[collection]
    result = col.delete_many(query)
    return result.deleted_count


def count_documents(db, collection, query=None):
    """Count documents matching a query."""
    col = db[collection]
    return col.count_documents(query or {})


def aggregate(db, collection, pipeline):
    """Run an aggregation pipeline."""
    col = db[collection]
    return list(col.aggregate(pipeline))


def is_valid_object_id(id_string):
    """Check if a string is a valid MongoDB ObjectId."""
    try:
        ObjectId(id_string)
        return True
    except (InvalidId, TypeError):
        return False


def to_object_id(id_string):
    """Safely convert a string to ObjectId. Returns None if invalid."""
    try:
        return ObjectId(id_string)
    except (InvalidId, TypeError):
        return None


def serialize_doc(doc, exclude_fields=None):
    """Convert a MongoDB document to a JSON-serializable dict.
    Converts _id to 'id' string and excludes specified fields."""
    if not doc:
        return None
    exclude = set(exclude_fields or [])
    exclude.add("_id")
    result = {}
    for key, value in doc.items():
        if key in exclude:
            continue
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        else:
            result[key] = value
    result["id"] = str(doc["_id"])
    return result


def create_indexes(db):
    """Create all necessary indexes for performance optimization."""

    # Users
    db.users.create_index("email", unique=True)

    # Tasks
    db.tasks.create_index("user_id")
    db.tasks.create_index([("user_id", 1), ("status", 1)])
    db.tasks.create_index([("user_id", 1), ("deadline", 1)])
    db.tasks.create_index([("user_id", 1), ("priority", 1)])
    db.tasks.create_index([("user_id", 1), ("created_at", -1)])
    db.tasks.create_index([("user_id", 1), ("updated_at", -1)])
    db.tasks.create_index([("user_id", 1), ("tags", 1)])

    # Attendance
    db.attendance_subjects.create_index("user_id")
    db.attendance_records.create_index("user_id")
    db.attendance_records.create_index([("user_id", 1), ("subject_id", 1), ("date", 1)], unique=True)
    db.attendance_records.create_index([("user_id", 1), ("date", 1)])

    # Exams
    db.exam_subjects.create_index("user_id")
    db.exam_subjects.create_index([("user_id", 1), ("exam_date", 1)])
    db.exam_subjects.create_index([("user_id", 1), ("priority", 1)])

    # Timetable
    db.timetable.create_index("user_id")
    db.timetable.create_index([("user_id", 1), ("day", 1)])

    # GPA
    db.gpa_semesters.create_index("user_id")

    # Expenses
    db.expenses.create_index("user_id")
    db.expenses.create_index([("user_id", 1), ("date", -1)])
    db.expenses.create_index([("user_id", 1), ("category", 1)])

    # Budgets
    db.budgets.create_index("user_id", unique=True)

    # Notifications
    db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    db.notifications.create_index([("user_id", 1), ("read", 1)])

    # Reminders
    db.reminders.create_index("user_id")

    # Streaks
    db.streaks.create_index("user_id", unique=True)

    # Activity logs (for future use)
    db.activity_logs.create_index([("user_id", 1), ("created_at", -1)])

    # OTPs
    db.otps.create_index([("user_id", 1), ("purpose", 1), ("used", 1)])
    db.otps.create_index("expires_at", expireAfterSeconds=0)
