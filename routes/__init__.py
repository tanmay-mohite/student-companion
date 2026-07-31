from routes.auth_routes import auth_bp
from routes.task_routes import task_bp
from routes.attendance_routes import attendance_bp
from routes.exam_routes import exam_bp
from routes.timetable_routes import timetable_bp
from routes.gpa_routes import gpa_bp
from routes.expense_routes import expense_bp
from routes.notification_routes import notification_bp
from routes.profile_routes import profile_bp
from routes.dashboard_routes import dashboard_bp


def register_routes(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(task_bp, url_prefix="/api/tasks")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(exam_bp, url_prefix="/api/exams")
    app.register_blueprint(timetable_bp, url_prefix="/api/timetable")
    app.register_blueprint(gpa_bp, url_prefix="/api/gpa")
    app.register_blueprint(expense_bp, url_prefix="/api/expenses")
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
