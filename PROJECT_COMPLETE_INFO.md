# PROJECT COMPLETE INFORMATION DOCUMENT

> **Purpose:** This document contains verified information extracted from the actual codebase.
> It is intended to serve as the primary reference for preparing a college Black Book.
>
> **Rules followed:**
> - No secrets, API keys, or credentials are included.
> - Nothing is invented or assumed.
> - Implemented vs. planned features are clearly separated.
> - Anything unclear is marked "Needs confirmation."

---

## 1. PROJECT BASIC INFORMATION

| Attribute | Value |
|-----------|-------|
| **Project Name** | Student Companion |
| **Project Purpose** | An all-in-one academic assistant web application for students to manage tasks, attendance, exams, timetable, GPA/CGPA, expenses, notifications, and profile in one place. |
| **Project Type** | Web Application (Single-Page Application) |
| **Target Users** | Students (higher education: college/university) |
| **Main Problem Being Solved** | Students use multiple disconnected tools for academic tracking. This app centralizes academics, attendance, exams, finances, and scheduling into one dashboard. |
| **Main Solution Provided** | A unified, authenticated SPA with role-less single-user access per account, providing dashboard overview plus dedicated modules for every major academic need. |
| **Current Project Status** | Functionally complete with all major modules implemented. Frontend SPA with hash routing, backend Flask API, MongoDB persistence. |
| **Deployment Status** | Deployment configuration exists (`render.yaml`) but is not guaranteed deployed. Application runs locally via `python app.py` on port 5000. |

---

## 2. COMPLETE TECHNOLOGY STACK

### Frontend
| Technology | Version | Why Used | Where Used |
|------------|---------|----------|------------|
| **HTML5** | N/A | App shell and single-page structure | `static/index.html` |
| **CSS3** | N/A | Custom styling, responsive layout, dark mode | `static/css/style.css` (~1286 lines) |
| **JavaScript (Vanilla)** | ES6+ | Core application logic, SPA routing, module rendering | `static/js/app.js`, `static/js/api.js`, `static/js/utils.js`, `static/js/modules/*.js` |
| **Bootstrap** | 5.3.3 | UI framework for layout, components, responsive grid, modals, toasts | Loaded from CDN in `index.html`; used throughout all frontend modules |
| **Bootstrap Icons** | 1.11.3 | Icon library for UI elements | Loaded from CDN in `index.html` |
| **Chart.js** | 4.4.0 | Data visualization (weekly activity bar chart on dashboard) | Loaded from CDN; used in `static/js/modules/dashboard.js` |
| **jsPDF** | 2.5.1 | PDF export functionality (attendance module) | Loaded from CDN; referenced in `static/js/modules/attendance.js` |
| **Google Identity Services** | N/A | Google Sign-In button and credential handling | Loaded from `accounts.google.com/gsi/client` in `index.html`; initialized in `app.js` |

### Backend
| Technology | Version | Why Used | Where Used |
|------------|---------|----------|------------|
| **Python** | N/A (venv Python 3.14 based on pip) | Core backend language | All `.py` files |
| **Flask** | 3.1.1 | Web framework, routing, request handling, static file serving | `app.py`, all route files in `routes/` |
| **Flask-CORS** | 6.0.1 | Cross-Origin Resource Sharing for API | `app.py` |
| **Werkzeug** | 3.1.8 | Password hashing utilities (`generate_password_hash`, `check_password_hash`) | `routes/auth_routes.py`, `routes/profile_routes.py` |

### Database
| Technology | Version | Why Used | Where Used |
|------------|---------|----------|------------|
| **MongoDB** | N/A (Atlas cluster based on `.env`) | Primary data store for all application data | `utils/db.py`, all route files |

### Libraries & Packages
| Package | Version | Why Used | Where Used |
|---------|---------|----------|------------|
| **PyMongo** | 4.14.1 | MongoDB Python driver | `app.py`, `utils/db.py`, all route files |
| **PyJWT** | 2.10.1 | JWT token encoding/decoding for authentication | `utils/auth.py`, `routes/auth_routes.py` |
| **python-dotenv** | 1.2.1 | Environment variable loading from `.env` | `config.py` |
| **pyotp** | 2.10.0 | TOTP generation/verification for 2FA and OTP flows | `utils/otp.py`, `routes/auth_routes.py` |
| **requests** | 2.34.2 | HTTP requests (Google OAuth token verification) | `routes/auth_routes.py` |
| **gunicorn** | N/A | WSGI production server (for deployment) | `render.yaml`, `requirements.txt` |

### Authentication Technologies
- **JWT (JSON Web Tokens)** — HS256 algorithm, access + refresh tokens
- **TOTP (Time-based One-Time Password)** — via `pyotp` for 2FA and email verification/reset
- **Werkzeug Password Hashing** — `generate_password_hash` / `check_password_hash` (pbkdf2-based)
- **Google OAuth 2.0** — ID token verification via Google tokeninfo endpoint

### External Services
| Service | Purpose | Configuration |
|---------|---------|---------------|
| **MongoDB Atlas** | Cloud database | `MONGO_URI` in `.env` |
| **Google OAuth** | Social login (optional, not currently configured) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env` |
| **CDNs** | Bootstrap, Bootstrap Icons, Chart.js, jsPDF, Google GIS | Hardcoded in `static/index.html` |

### Deployment/Hosting
| Component | Details |
|-----------|---------|
| **Local Development** | `python app.py` — runs Flask dev server on `http://localhost:5000` |
| **Production (Render.com)** | Configured via `render.yaml` — Python environment, gunicorn start command |
| **PWA Support** | Service worker (`static/sw.js`) + manifest (`static/manifest.json`) for installability |

---

## 3. COMPLETE PROJECT STRUCTURE

```
student-companion/
├── app.py                              # Flask application factory
├── config.py                           # Configuration class
├── requirements.txt                    # Python dependencies
├── .env                                # Environment variables (SECRETS — not in repo)
├── .gitignore                          # Git ignore rules
├── render.yaml                         # Render.com deployment config
├── routes/
│   ├── __init__.py                     # Blueprint registration
│   ├── auth_routes.py                  # Authentication routes
│   ├── task_routes.py                  # Task management routes
│   ├── attendance_routes.py            # Attendance routes
│   ├── exam_routes.py                  # Exam preparation routes
│   ├── timetable_routes.py             # Timetable routes
│   ├── gpa_routes.py                   # GPA/CGPA routes
│   ├── expense_routes.py               # Expense tracker routes
│   ├── notification_routes.py          # Notifications & reminders routes
│   └── profile_routes.py               # Profile & settings routes
├── utils/
│   ├── __init__.py
│   ├── db.py                           # MongoDB helpers + index creation
│   ├── auth.py                         # JWT token utilities + decorators
│   ├── validators.py                   # Input validation/sanitization
│   ├── errors.py                       # Custom exceptions + error handlers
│   ├── otp.py                          # OTP generation/verification
│   ├── rate_limiter.py                 # In-memory rate limiting
│   └── logger.py                       # Logging configuration
├── static/
│   ├── index.html                      # SPA shell
│   ├── favicon.ico                     # Site icon
│   ├── manifest.json                   # PWA manifest
│   ├── sw.js                           # Service worker for PWA
│   ├── css/
│   │   └── style.css                   # All custom CSS (~1286 lines)
│   └── js/
│       ├── app.js                      # Main app controller, routing, auth UI
│       ├── api.js                      # API service layer with token refresh
│       ├── utils.js                    # Frontend utility functions
│       └── modules/
│           ├── dashboard.js            # Dashboard module
│           ├── tasks.js                # Tasks module
│           ├── attendance.js           # Attendance module
│           ├── exams.js                # Exam preparation module
│           ├── timetable.js            # Timetable module
│           ├── gpa.js                  # GPA/CGPA module
│           ├── expenses.js             # Expense tracker module
│           ├── notifications.js        # Notifications & reminders module
│           └── profile.js              # Profile & settings module
├── logs/                               # Daily log files (gitignored)
└── uploads/                            # File upload directory (gitignored, currently empty)
```

### Important Files Detail

| File/Folder | Purpose | Important Functionality | Dependencies | Notes |
|-------------|---------|------------------------|--------------|-------|
| `app.py` | Flask app factory | Creates app, loads config, connects MongoDB, registers routes, serves static files, exposes Google Client ID endpoint | Flask, Flask-CORS, PyMongo, config, routes, utils | Entry point. `create_app()` function. |
| `config.py` | Centralized configuration | Loads env vars via `python-dotenv`; defines `Config` class with MongoDB URI, JWT settings, security limits, Google OAuth, file upload limits | `python-dotenv` | All config values sourced from environment with sensible defaults. |
| `requirements.txt` | Python dependencies | Lists all required packages with pinned versions | N/A | `gunicorn` listed without version. |
| `.env` | Environment variables | Contains `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRY_HOURS`, Google OAuth placeholders | N/A | **Contains secrets — must not be committed.** |
| `render.yaml` | Render.com deployment config | Defines web service, build command, start command, env vars | N/A | Env var `value` fields are empty — must be filled before deployment. |
| `routes/__init__.py` | Blueprint registration | Imports all blueprints and registers them with URL prefixes | All route modules | Central routing map. |
| `routes/auth_routes.py` | Authentication API | Registration, login, 2FA, email verification, password reset, Google OAuth, token refresh, login history | `utils/auth`, `utils/otp`, `utils/rate_limiter`, `utils/validators`, `pyotp`, `requests` | Largest route file (~695 lines). |
| `routes/task_routes.py` | Task management API | CRUD, bulk operations, subtask management, stats | `utils/auth`, `utils/db`, `utils/validators` | |
| `routes/attendance_routes.py` | Attendance API | Subject CRUD, mark attendance (single/bulk), stats, predictions, calendar heatmap | `utils/auth`, `utils/db`, `utils/validators` | |
| `routes/exam_routes.py` | Exam preparation API | Subject CRUD, topic management (add/toggle/delete), stats, upcoming exams | `utils/auth`, `utils/db`, `utils/validators` | |
| `routes/timetable_routes.py` | Timetable API | Entry CRUD, conflict detection, stats, bulk create, today view | `utils/auth`, `utils/db`, `utils/validators` | Contains time validation and conflict-checking logic. |
| `routes/gpa_routes.py` | GPA/CGPA API | Semester CRUD, grade calculation (10-point and 4-point scales), CGPA, stats, quick calculator | `utils/auth`, `utils/db`, `utils/validators` | Contains grade point mapping tables. |
| `routes/expense_routes.py` | Expense tracker API | CRUD, category filtering, analytics, budget management, bulk import, budget alert creation | `utils/auth`, `utils/db`, `utils/validators` | Automatically creates budget-exceeded notifications. |
| `routes/notification_routes.py` | Notifications API | Notification CRUD, mark read, reminders CRUD, notification settings | `utils/auth`, `utils/db`, `utils/validators` | |
| `routes/profile_routes.py` | Profile API | Profile CRUD, avatar upload (base64), activity stats, data export/import, account deletion | `utils/auth`, `utils/db`, `utils/validators` | Account deletion removes all user data across collections. |
| `utils/db.py` | Database abstraction layer | CRUD helpers (`find_one`, `find_many`, `insert_one`, `update_one`, etc.), ObjectId helpers, `create_indexes()` | `pymongo`, `bson` | Indexes defined for all major collections. |
| `utils/auth.py` | Authentication utilities | `create_token`, `create_token_pair`, `decode_token`, `@token_required`, `@optional_token` | `PyJWT`, `flask` | Uses `current_app.config` for JWT secret and expiry. |
| `utils/validators.py` | Input validation | `validate_email`, `validate_password`, `validate_date`, `sanitize_string`, `get_today_str`, `get_now_iso` | `re`, `datetime` | |
| `utils/errors.py` | Error handling | Custom exception classes (`AppError`, `ValidationError`, etc.), Flask error handlers for 400/401/404/409/429/500 | `flask` | |
| `utils/otp.py` | OTP utilities | `generate_otp`, `store_otp`, `verify_otp`, `get_password_strength` | N/A | OTPs stored in MongoDB with expiry; logged to console. |
| `utils/rate_limiter.py` | Rate limiting | In-memory sliding window rate limiter; `@auth_rate_limit` and `@api_rate_limit` decorators | `flask`, `time` | **In-memory only** — state lost on restart. |
| `utils/logger.py` | Logging setup | Configures console + daily file logging under `logs/` directory | `logging`, `os`, `datetime` | Log files named `app_YYYYMMDD.log`. |
| `static/index.html` | SPA shell | Contains intro, auth, and app containers; loads all external and internal scripts/styles | Bootstrap 5 CDN, Bootstrap Icons CDN, Chart.js CDN, jsPDF CDN, Google GIS CDN | Hash-based routing. No server-side templating. |
| `static/css/style.css` | Custom styles | Layout, cards, Kanban, attendance heatmap, timetable grid, GPA ring, expense tracker, dark mode, responsive breakpoints | CSS custom properties (Bootstrap variables) | ~1286 lines. |
| `static/js/app.js` | Main controller | App initialization, routing, auth form rendering, 2FA flow, forgot password, Google Sign-In, theme management, notification polling | `API`, `Utils` | ~599 lines. |
| `static/js/api.js` | API client | Token storage, automatic JWT refresh on 401, request helpers (GET/POST/PUT/DELETE) | `fetch` API, `localStorage` | ~117 lines. |
| `static/js/utils.js` | Frontend utilities | HTML escaping, toast notifications, confirmation modals, date formatting, debounce, priority/status helpers | None | ~206 lines. |
| `static/js/modules/dashboard.js` | Dashboard module | Renders stat cards, weekly activity chart, today's schedule, upcoming deadlines, productivity score ring, budget widget, streak, recent activity, alerts | `API`, `Utils` | ~483 lines. |
| `static/js/modules/tasks.js` | Tasks module | List/Kanban views, filters, bulk actions, subtasks, stats | `API`, `Utils` | ~470 lines. |
| `static/js/modules/attendance.js` | Attendance module | Mark attendance (single/bulk), subject stats, predictions, calendar heatmap, PDF export | `API`, `Utils`, `jspdf` | ~422 lines. |
| `static/js/modules/exams.js` | Exam module | Subject CRUD, topic management, progress tracking, stats, upcoming exams list | `API`, `Utils` | ~478 lines. |
| `static/js/modules/timetable.js` | Timetable module | Weekly grid + day view, entry CRUD, conflict detection, stats, bulk create | `API`, `Utils` | ~455 lines. |
| `static/js/modules/gpa.js` | GPA module | Semester management, grade entry, CGPA calculation, trend charts, quick calculator | `API`, `Utils`, `Chart.js` | ~505 lines. |
| `static/js/modules/expenses.js` | Expense module | Expense CRUD, category filters, analytics, budget tracking, bulk import | `API`, `Utils`, `Chart.js` | ~462 lines. |
| `static/js/modules/notifications.js` | Notifications module | Notification list, read/unread, reminders, settings | `API`, `Utils` | ~387 lines. |
| `static/js/modules/profile.js` | Profile module | Profile view/edit, avatar upload, activity stats, export/import, account deletion | `API`, `Utils` | ~101 lines inspected (file exists, full length not inspected). |
| `static/manifest.json` | PWA manifest | App metadata for installability | N/A | References `/favicon.ico?v=2` as icon. |
| `static/sw.js` | Service worker | Cache-first strategy for assets, network fallback, offline handling for navigation | Cache API | Does not cache CDN resources; references `/offline.html` which does not exist. |
| `logs/` | Log directory | Stores daily log files (`app_YYYYMMDD.log`) | N/A | Gitignored. Contains historical log files. |
| `uploads/` | Upload directory | Intended for file uploads (currently unused; avatars stored as base64 in DB) | N/A | Gitignored. Currently empty. |

---

## 4. COMPLETE FEATURE LIST

### 4.1 Dashboard
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Overview Cards** | Attendance %, tasks completed/total, CGPA, study hours, monthly expenses with budget remaining |
| **Weekly Activity Chart** | Bar chart showing tasks completed per day for last 7 days (Chart.js) |
| **Today's Schedule** | Classes and tasks due today with time-based status (upcoming/ongoing/completed) |
| **Upcoming Deadlines** | Next 7 days of task deadlines with urgency badges |
| **Productivity Score** | Weighted composite score (tasks 40%, attendance 40%, streak 20%) rendered as SVG ring |
| **Budget Widget** | Monthly spending vs budget with progress bar |
| **Streak Badge** | Current and longest login streak |
| **Recent Activity Feed** | Mixed feed of completed tasks, attendance records, expenses |
| **Alerts Bar** | Low attendance, budget exceeded, overdue tasks |

**Frontend:** `static/js/modules/dashboard.js`
**Backend:** `routes/dashboard_routes.py`
**API Endpoints:** `GET /api/dashboard/overview`, `GET /api/dashboard/today-schedule`, `GET /api/dashboard/recent-activity`, `GET /api/dashboard/attendance-alerts`
**Database Collections:** `tasks`, `attendance_subjects`, `attendance_records`, `gpa_semesters`, `timetable`, `expenses`, `budgets`, `streaks`, `activity_logs`

---

### 4.2 Tasks & Assignments
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **List View** | Paginated task list with filtering by status, priority, subject, tag, search |
| **Kanban View** | Three-column board (To-Do, In Progress, Completed) |
| **Task CRUD** | Create, edit, delete tasks with title, description, subject, deadline, priority, tags |
| **Subtasks** | Add, toggle, remove subtasks per task; auto-complete task when all subtasks done |
| **Bulk Operations** | Bulk complete multiple tasks; bulk delete or delete all completed |
| **Stats** | Total, completed, pending, in-progress, overdue counts; by-priority breakdown; top subjects; 7-day completion trend; tag usage; subtask stats |
| **Sorting** | By deadline, priority, created date, title |

**Frontend:** `static/js/modules/tasks.js`
**Backend:** `routes/task_routes.py`
**API Endpoints:** `GET /api/tasks`, `GET /api/tasks/stats`, `POST /api/tasks`, `PUT /api/tasks/<id>`, `DELETE /api/tasks/<id>`, `POST /api/tasks/bulk/complete`, `POST /api/tasks/bulk/delete`, `POST /api/tasks/<id>/subtasks`, `PUT /api/tasks/<id>/subtasks/<index>`, `DELETE /api/tasks/<id>/subtasks/<index>`
**Database Collections:** `tasks`
**Validation:** Title required; priority must be low/medium/high; status must be todo/in_progress/completed; tags sanitized; subtask titles sanitized.

---

### 4.3 Attendance Tracker
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Subject Management** | Create, edit, delete attendance subjects with credit hours |
| **Mark Attendance** | Single record creation/update per subject per date |
| **Bulk Mark** | Mark multiple subjects for a single date at once |
| **Stats** | Per-subject and overall attendance %, present/absent/leave counts, classes needed to reach 75%, classes can skip |
| **Predictions** | Smart advice: how many classes to attend or can skip to maintain 75% |
| **Calendar Heatmap** | Monthly grid showing per-day attendance percentage with color coding |
| **PDF Export** | Generate PDF of attendance records (frontend uses jsPDF) |

**Frontend:** `static/js/modules/attendance.js`
**Backend:** `routes/attendance_routes.py`
**API Endpoints:** `GET /api/attendance/subjects`, `POST /api/attendance/subjects`, `PUT /api/attendance/subjects/<id>`, `DELETE /api/attendance/subjects/<id>`, `POST /api/attendance/records`, `POST /api/attendance/bulk`, `GET /api/attendance/records`, `GET /api/attendance/stats`, `GET /api/attendance/predictions`, `GET /api/attendance/calendar`
**Database Collections:** `attendance_subjects`, `attendance_records`
**Validation:** Subject name required; status defaults to "present"; unique index on (user_id, subject_id, date).

---

### 4.4 Exam Preparation
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Subject CRUD** | Create, edit, delete exam subjects with exam date, priority, notes |
| **Topic Management** | Add, toggle completion, delete topics within a subject |
| **Topic Difficulty** | Each topic tagged easy/medium/hard |
| **Progress Tracking** | Per-subject and overall completion percentage |
| **Countdown** | Days until exam calculated from exam_date |
| **Stats Overview** | Total subjects, topics completed, nearest exam, exams this week/month |
| **Upcoming Exams** | Sorted list of future exams |

**Frontend:** `static/js/modules/exams.js`
**Backend:** `routes/exam_routes.py`
**API Endpoints:** `GET /api/exams/subjects`, `GET /api/exams/stats`, `GET /api/exams/upcoming`, `POST /api/exams/subjects`, `PUT /api/exams/subjects/<id>`, `DELETE /api/exams/subjects/<id>`, `PUT /api/exams/subjects/<id>/topics/<index>`, `POST /api/exams/subjects/<id>/topics`, `DELETE /api/exams/subjects/<id>/topics/<index>`
**Database Collections:** `exam_subjects`
**Validation:** Subject name required, unique per user; topic name required; priority low/medium/high; difficulty easy/medium/hard.

---

### 4.5 Timetable
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Weekly Grid View** | Grid display of classes by day and time |
| **Today View** | Day-specific view with ongoing/completed/upcoming status based on current time |
| **Entry CRUD** | Create, edit, delete timetable entries with subject, day, start/end time, room, teacher, color, type |
| **Conflict Detection** | Prevents overlapping entries on the same day |
| **Stats** | Total hours, busiest day, subject frequency, class type breakdown |
| **Bulk Create** | Add multiple entries at once (max 50) with conflict checking |

**Frontend:** `static/js/modules/timetable.js`
**Backend:** `routes/timetable_routes.py`
**API Endpoints:** `GET /api/timetable`, `GET /api/timetable/today`, `GET /api/timetable/stats`, `POST /api/timetable`, `PUT /api/timetable/<id>`, `DELETE /api/timetable/<id>`, `POST /api/timetable/bulk`
**Database Collections:** `timetable`
**Validation:** Day must be 1-7 (Monday=1); time format HH:MM; end time after start time; type must be lecture/lab/tutorial/other; color must be valid hex.

---

### 4.6 GPA / CGPA Calculator
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Semester CRUD** | Create, edit, delete semesters with multiple subjects |
| **Grade Management** | Assign grades (O, A+, A, B+, B, C+, C, D, F) and credits to subjects |
| **Dual Scale** | Supports 10-point and 4-point grade scales |
| **GPA Calculation** | Per-semester GPA calculated automatically |
| **CGPA Calculation** | Credit-weighted CGPA across all semesters |
| **Stats & Trends** | Best/worst semester, improvement detection, total credits, trend data |
| **Quick Calculator** | One-time GPA calculation without saving semester |

**Frontend:** `static/js/modules/gpa.js`
**Backend:** `routes/gpa_routes.py`
**API Endpoints:** `GET /api/gpa/semesters`, `GET /api/gpa/stats`, `POST /api/gpa/calculator`, `POST /api/gpa/semesters`, `PUT /api/gpa/semesters/<id>`, `DELETE /api/gpa/semesters/<id>`, `GET /api/gpa/overview`
**Database Collections:** `gpa_semesters`
**Validation:** Semester name required and unique per user; grade must be from valid set; credits must be non-negative number.

---

### 4.7 Expense Tracker
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Expense CRUD** | Create, edit, delete expenses with amount, category, date, description, payment method |
| **Categories** | Predefined categories: Food, Transport, Books, Entertainment, Shopping, Rent, Utilities, Health, Other |
| **Monthly Stats** | Total spent, budget, remaining, category breakdown |
| **Analytics** | Month-over-month change, daily spending trend, top categories, payment method breakdown, average daily spend |
| **Budget Management** | Set monthly budget; visual warning when exceeded |
| **Bulk Import** | Add up to 100 expenses at once |
| **Budget Alerts** | Automatic notification when monthly spending exceeds budget |

**Frontend:** `static/js/modules/expenses.js`
**Backend:** `routes/expense_routes.py`
**API Endpoints:** `GET /api/expenses`, `GET /api/expenses/categories`, `GET /api/expenses/analytics`, `POST /api/expenses`, `PUT /api/expenses/<id>`, `DELETE /api/expenses/<id>`, `GET /api/expenses/budget`, `PUT /api/expenses/budget`, `GET /api/expenses/stats`, `POST /api/expenses/bulk`
**Database Collections:** `expenses`, `budgets`, `notifications`
**Validation:** Amount must be positive number; category from allowed list; payment method from allowed list; date defaults to today.

---

### 4.8 Notifications & Reminders
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Notifications List** | Paginated list with type filter and read/unread filter |
| **Mark Read** | Single or mark-all-read |
| **Clear Read** | Delete all read notifications at once |
| **Notification Settings** | Toggle notification categories: tasks, exams, attendance, budget, timetable, system |
| **Reminders** | Create, edit, delete reminders with title, description, date, priority, completed status |
| **Bell Badge** | Real-time unread count in navbar |
| **Popup Alerts** | Desktop-style toast notifications for new notifications (polled every 30s) |

**Frontend:** `static/js/modules/notifications.js`
**Backend:** `routes/notification_routes.py`
**API Endpoints:** `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/<id>/read`, `PUT /api/notifications/mark-all-read`, `DELETE /api/notifications/<id>`, `DELETE /api/notifications/clear-read`, `GET /api/notifications/settings`, `PUT /api/notifications/settings`, `GET /api/notifications/reminders`, `POST /api/notifications/reminders`, `PUT /api/notifications/reminders/<id>`, `DELETE /api/notifications/reminders/<id>`
**Database Collections:** `notifications`, `reminders`
**Validation:** Notification type must be from allowed list; reminder priority low/medium/high; title required for reminders.

---

### 4.9 Profile & Settings
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **View Profile** | Display name, email, roll no, branch, semester, avatar, verification status, 2FA status |
| **Edit Profile** | Update name, roll no, branch, semester, theme, language, notification settings |
| **Avatar Upload** | Base64 image upload (max 2MB) |
| **Activity Stats** | Task counts, attendance %, exam subjects, timetable entries, GPA semesters, expenses this month, notifications, reminders, account age |
| **Data Export** | Export all user data as JSON |
| **Data Import** | Import previously exported JSON data |
| **Account Deletion** | Delete all user data with password confirmation |

**Frontend:** `static/js/modules/profile.js`
**Backend:** `routes/profile_routes.py`
**API Endpoints:** `GET /api/profile`, `PUT /api/profile`, `POST /api/profile/avatar`, `GET /api/profile/stats`, `GET /api/profile/export`, `POST /api/profile/import`, `DELETE /api/profile/account`
**Database Collections:** `users`, `tasks`, `attendance_records`, `attendance_subjects`, `exam_subjects`, `timetable`, `gpa_semesters`, `expenses`, `notifications`, `reminders`, `budgets`, `activity_logs`
**Validation:** Name, roll no, branch, semester sanitized to 100 chars; theme must be light/dark; language must be en/hi/es/fr; avatar max 2MB string.

---

### 4.10 Authentication System
**Status:** COMPLETED

| Sub-feature | Details |
|-------------|---------|
| **Registration** | Email + password (min 6 chars) + name + optional roll no, branch, semester |
| **Login** | Email + password with account lockout after 5 failed attempts (15 min lock) |
| **Remember Me** | Extends access token expiry to 90 days |
| **2FA (TOTP)** | Optional TOTP-based 2FA using pyotp; setup with QR code; enforced on login |
| **Email Verification** | OTP-based (logged to console); 6-digit numeric OTP, 10-minute expiry |
| **Password Reset** | Forgot password flow with OTP |
| **Change Password** | Authenticated users can change password with current password confirmation |
| **Password Strength** | Real-time strength indicator during registration |
| **Google OAuth** | Google Sign-In via ID token verification (frontend button exists, backend route exists, but not configured) |
| **Token Refresh** | Automatic access token refresh using refresh token (30-day expiry) |
| **Login Streak** | Tracks consecutive daily logins |
| **Login History** | Records login IP, user agent, timestamp in activity_logs |

**Frontend:** `static/js/app.js` (auth forms, 2FA, forgot password, Google Sign-In)
**Backend:** `routes/auth_routes.py`
**API Endpoints:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/verify-2fa`, `POST /api/auth/refresh`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/send-verification`, `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/change-password`, `POST /api/auth/password-strength`, `GET /api/auth/2fa/setup`, `POST /api/auth/2fa/verify-setup`, `POST /api/auth/2fa/disable`, `POST /api/auth/google`, `GET /api/auth/login-history`
**Database Collections:** `users`, `streaks`, `otps`, `activity_logs`
**Validation:** Email format validated; password min 6 chars (registration), current password verified for changes; OTP format 6 digits.

---

## 5. MODULE DOCUMENTATION

### 5.1 Dashboard Module
**Purpose:** Central overview showing key metrics and recent activity.
**Features:** Stat cards, weekly activity chart, today's schedule, upcoming deadlines, productivity score, budget widget, streak, alerts.
**User Workflow:** On login, user lands on dashboard. Data loads automatically from multiple endpoints. User sees summary and can click into other modules.
**Frontend:** `static/js/modules/dashboard.js` — renders HTML into `#content`, uses Chart.js for bar chart, SVG for productivity ring.
**Backend:** `routes/dashboard_routes.py` — aggregates data from tasks, attendance, timetable, expenses, budgets, streaks, activity_logs.
**APIs:** `/api/dashboard/overview`, `/api/dashboard/today-schedule`, `/api/dashboard/recent-activity`, `/api/dashboard/attendance-alerts`
**Validation:** None beyond authentication.
**Error Handling:** Falls back to retry button on fetch failure.
**Status:** COMPLETED

### 5.2 Tasks Module
**Purpose:** Manage assignments and to-do items.
**Features:** List/Kanban views, filters, bulk actions, subtasks, stats, search, tags, sorting.
**User Workflow:** User navigates to #tasks, views tasks, adds new task with optional subtasks/tags, marks complete, filters/sorts.
**Frontend:** `static/js/modules/tasks.js` — toggles between list and Kanban, renders modals for create/edit.
**Backend:** `routes/task_routes.py` — full CRUD with pagination, search, bulk operations.
**APIs:** See section 4.2.
**Validation:** Title required; status/priority enum validation; tags sanitized.
**Error Handling:** 404 if task not found; 400 for invalid ID.
**Status:** COMPLETED

### 5.3 Attendance Module
**Purpose:** Track class attendance with smart predictions.
**Features:** Subject management, mark attendance (single/bulk), stats, predictions, calendar heatmap, PDF export.
**User Workflow:** User adds subjects, marks attendance daily/weekly, views predictions on how many classes to attend/skip, exports PDF.
**Frontend:** `static/js/modules/attendance.js` — renders heatmap grid, prediction cards, mark form.
**Backend:** `routes/attendance_routes.py` — CRUD for subjects and records, statistical calculations, calendar data aggregation.
**APIs:** See section 4.3.
**Validation:** Subject name required; unique (user, subject_id, date) for records.
**Error Handling:** Duplicate record handling via upsert.
**Status:** COMPLETED

### 5.4 Exam Preparation Module
**Purpose:** Track exam preparation progress.
**Features:** Subject CRUD, topic management with difficulty, progress tracking, countdown, stats.
**User Workflow:** User adds exam subjects with topics, marks topics complete, monitors progress and days remaining.
**Frontend:** `static/js/modules/exams.js` — renders subject cards with progress bars, topic checklists.
**Backend:** `routes/exam_routes.py` — stores topics as embedded array within exam_subject documents.
**APIs:** See section 4.4.
**Validation:** Subject name unique per user; topic name required; priority/difficulty enum validation.
**Error Handling:** 409 for duplicate subjects; 404 for missing subject/topic index.
**Status:** COMPLETED

### 5.5 Timetable Module
**Purpose:** Manage weekly class schedule.
**Features:** Weekly grid, today view, entry CRUD, conflict detection, stats, bulk create.
**User Workend:** User adds class entries, views weekly schedule, checks today's classes, sees stats.
**Frontend:** `static/js/modules/timetable.js` — renders CSS grid for weekly view, card list for day view.
**Backend:** `routes/timetable_routes.py` — validates times and days, checks for overlaps.
**APIs:** See section 4.5.
**Validation:** Day 1-7; HH:MM times; end > start; valid entry type; hex color.
**Error Handling:** 409 on time conflict with `conflict_with` ID.
**Status:** COMPLETED

### 5.6 GPA/CGPA Module
**Purpose:** Calculate and track academic performance.
**Features:** Semester management, grade entry, 10-point and 4-point scales, CGPA, trends, quick calculator.
**User Workflow:** User adds semesters with subjects and grades, views CGPA and trends, uses quick calculator for hypothetical scenarios.
**Frontend:** `static/js/modules/gpa.js` — renders semester cards, grade tables, trend charts (Chart.js), ring chart for CGPA.
**Backend:** `routes/gpa_routes.py` — credit-weighted CGPA calculation, grade validation.
**APIs:** See section 4.6.
**Validation:** Valid grade from scale-specific set; credits non-negative; semester name unique per user.
**Error Handling:** 404 for missing semester; 400 for invalid ID.
**Status:** COMPLETED

### 5.7 Expense Tracker Module
**Purpose:** Track personal expenses and budget.
**Features:** Expense CRUD, categories, monthly stats, analytics, budget setting, bulk import, budget alerts.
**User Workflow:** User logs expenses, sets monthly budget, views analytics, receives alerts when over budget.
**Frontend:** `static/js/modules/expenses.js` — renders expense list, analytics cards, budget bar, category breakdown charts.
**Backend:** `routes/expense_routes.py` — expense CRUD, budget upsert, analytics aggregation, automatic budget alert notification creation.
**APIs:** See section 4.7.
**Validation:** Amount positive; category from allowed list; payment method validated; date defaults to today.
**Error Handling:** Creates notification when budget exceeded.
**Status:** COMPLETED

### 5.8 Notifications & Reminders Module
**Purpose:** Centralized notifications and user reminders.
**Features:** Notification list, read/unread management, type filtering, reminder CRUD, notification settings.
**User Workflow:** User views notifications in bell dropdown or dedicated page, marks read, manages reminders, adjusts settings.
**Frontend:** `static/js/modules/notifications.js` — renders notification list, reminder list, settings modal.
**Backend:** `routes/notification_routes.py` — notification and reminder CRUD, settings updates.
**APIs:** See section 4.8.
**Validation:** Notification type from allowed list; reminder priority enum; title required for reminders.
**Error Handling:** 404 for missing notification/reminder.
**Status:** COMPLETED

### 5.9 Profile Module
**Purpose:** User profile management and data portability.
**Features:** View/edit profile, avatar upload, activity stats, data export/import, account deletion.
**User Workflow:** User navigates to profile, edits details, uploads avatar, views stats, exports data for backup, or deletes account.
**Frontend:** `static/js/modules/profile.js` — renders profile card, stats, export/import buttons.
**Backend:** `routes/profile_routes.py` — profile updates, base64 avatar storage, stats aggregation, JSON export/import, cascading account deletion.
**APIs:** See section 4.9.
**Validation:** Text fields sanitized; theme/language enum validated; avatar max 2MB.
**Error Handling:** Password confirmation required for account deletion; 404 if user not found.
**Status:** COMPLETED

---

## 6. USER ROLES

| Role | Permissions | Accessible Pages | Available Features | Restrictions |
|------|-------------|------------------|--------------------|--------------|
| **Student (default)** | Full access to own data only | Dashboard, Tasks, Attendance, Exams, Timetable, GPA, Expenses, Notifications, Profile | All features listed in section 4 | Cannot access other users' data; authenticated routes require valid JWT |

**Notes:**
- There is no admin role, no teacher role, and no parent role implemented.
- All non-auth routes are protected by `@token_required` and filter by `request.user_id`.
- The application is designed as a single-user-per-account system.

---

## 7. AUTHENTICATION AND AUTHORIZATION

### Registration
- **Endpoint:** `POST /api/auth/register`
- **Input:** `email`, `password`, `name`, optional `roll_no`, `branch`, `semester`
- **Process:**
  1. Validate email format, password length (>= 6), name presence.
  2. Check email uniqueness.
  3. Hash password with `werkzeug.security.generate_password_hash`.
  4. Create user document with defaults (theme: light, language: en, notification_settings: all true, email_verified: false, two_factor_enabled: false).
  5. Create initial streak document.
  6. Generate and store email verification OTP (logged to console).
  7. Return JWT access + refresh tokens and user object.

### Login
- **Endpoint:** `POST /api/auth/login`
- **Input:** `email`, `password`, optional `remember_me`
- **Process:**
  1. Validate email and password presence.
  2. Find user by email.
  3. Check account lock status (`locked_until`).
  4. Verify password hash.
  5. On failure: increment `login_attempts`; lock account after 5 attempts for 15 minutes.
  6. On success: check if 2FA enabled; if yes, return `requires_2fa: true` with `user_id`.
  7. If 2FA not enabled: complete login (update streak, log activity, reset attempts), generate tokens, return user.

### 2FA Verification
- **Endpoint:** `POST /api/auth/verify-2fa`
- **Input:** `user_id`, `code`, `remember_me`
- **Process:**
  1. Validate user exists and 2FA is enabled.
  2. Verify 6-digit TOTP code using stored `two_factor_secret` with `pyotp.TOTP.verify(valid_window=1)`.
  3. Complete login same as successful login.

### Logout
- **Endpoint:** `POST /api/auth/logout`
- **Process:** Logs activity entry; returns success. Tokens not invalidated server-side (JWT stateless).

### Password Handling
- **Hashing:** `werkzeug.security.generate_password_hash` / `check_password_hash`
- **Reset:** OTP-based flow (`forgot-password` → `reset-password`)
- **Change:** Authenticated endpoint requiring current password

### Sessions/Tokens
- **Access Token:** JWT HS256, expires in 72 hours (configurable). `remember_me` extends to 90 days.
- **Refresh Token:** JWT HS256, expires in 30 days (configurable).
- **Storage:** `localStorage` in browser (`token`, `refresh_token`).
- **Refresh Flow:** `POST /api/auth/refresh` with `refresh_token`; frontend auto-retries on 401.

### Protected Routes
- **Decorator:** `@token_required` in `utils/auth.py`
- **Mechanism:** Extracts `Authorization: Bearer <token>` header, decodes JWT, sets `request.user_id`.
- **Scope:** All feature routes require authentication except password strength check.

### Authorization
- **Model:** Single-tenant per user. All queries filter by `user_id`.
- **Enforcement:** Each route handler explicitly scopes queries to `request.user_id`.
- **No RBAC:** No roles, permissions, or admin access.

### Validation
- Email format regex validation.
- Password minimum length enforcement.
- OTP expiration and single-use enforcement.
- Account lockout after repeated failures.

### Error Handling
- 400 for bad request/missing fields.
- 401 for invalid/expired tokens or wrong password.
- 404 for user not found.
- 409 for duplicate email.
- 423 for account locked.

---

## 8. FRONTEND

### Architecture
- **Type:** Single-Page Application (SPA) with hash-based routing.
- **Structure:** Three main containers in `index.html`:
  1. `#intro-container` — welcome screen shown once.
  2. `#auth-container` — login/register forms.
  3. `#app-container` — main app with navbar, sidebar, and content area.
- **Navigation:** Hash changes (`#dashboard`, `#tasks`, etc.) trigger `App.route()`.
- **State:** `App.currentUser` holds authenticated user; tokens in `localStorage`.

### HTML/Templates
- **Single file:** `static/index.html`
- **No server-side templating** — all UI rendered dynamically via JavaScript.
- **Modals:** Injected into `#modals-container` via `Utils.confirm()`.
- **Toasts:** Injected into `#toast-container` via `Utils.showToast()`.

### CSS
- **File:** `static/css/style.css`
- **Approach:** Extends Bootstrap with custom component styles.
- **Responsive:** Media queries for tablet (`md`) and mobile (`sm`, `xs`). Sidebar collapses to off-canvas on mobile.
- **Dark Mode:** Uses Bootstrap 5 `data-bs-theme="dark"` attribute with custom overrides.
- **Key Components:** Stat cards, task cards, Kanban board, attendance heatmap, timetable grid, GPA ring, expense analytics, notification items, profile avatar.

### JavaScript
- **Core files:**
  - `app.js` — app lifecycle, routing, auth UI, theme, notification polling.
  - `api.js` — HTTP client with auto token refresh.
  - `utils.js` — shared utilities.
  - `modules/*.js` — feature-specific rendering and logic.
- **Module Registration:** Each module calls `App.registerModule('name', renderFn)`.
- **Event-driven:** `dashboard:refresh` custom event for cross-module updates.

### Bootstrap Components
- Navbar, sidebar nav, cards, buttons, forms, modals, toasts, badges, progress bars, dropdowns, tables, grids.

### Charts/Visualization
- **Chart.js** used in dashboard (weekly activity bar chart), GPA module (trend line), expenses module (category/trend charts).

### Responsive Design
- **Desktop:** Full sidebar, multi-column grids.
- **Tablet:** Collapsed sidebar, adjusted column spans.
- **Mobile:** Hamburger menu for sidebar, single-column layouts, Kanban collapses to one column.

### Light/Dark Mode
- Implemented via Bootstrap 5 `data-bs-theme` attribute.
- Toggle in UI updates attribute and persists to backend via `PUT /api/profile`.

### Frontend-Backend Communication
- All API calls go through `API` object (`static/js/api.js`).
- Base URL: `/api`.
- Authentication via `Authorization: Bearer <token>` header.
- Automatic token refresh on 401 responses.
- JSON request/response format throughout.

---

## 9. BACKEND

### Application Entry Point
- **File:** `app.py`
- **Function:** `create_app()` — Flask app factory.
- **Steps:**
  1. Create Flask app with `static_folder="static"`, `static_url_path=""`.
  2. Load config from `config.Config`.
  3. Enable CORS.
  4. Setup logging.
  5. Register error handlers.
  6. Ensure `uploads/` directory exists.
  7. Connect to MongoDB via `MongoClient`.
  8. Verify connection with `ping`; create indexes.
  9. Register all blueprints via `register_routes(app)`.
  10. Define `/` route to serve `index.html`.
  11. Define `/api/config/google-client-id` endpoint.

### Flask Configuration
- **File:** `config.py`
- **Class:** `Config`
- **Key settings:**
  - `MONGO_URI` — MongoDB connection string
  - `JWT_SECRET` — JWT signing secret
  - `JWT_EXPIRY_HOURS` — 72 (default)
  - `JWT_REFRESH_EXPIRY_DAYS` — 30 (default)
  - `JWT_REMEMBER_ME_EXPIRY_DAYS` — 90 (default)
  - `MAX_LOGIN_ATTEMPTS` — 5 (default)
  - `ACCOUNT_LOCK_MINUTES` — 15 (default)
  - `RATE_LIMIT_PER_MINUTE` — 60 (default)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - `MAX_CONTENT_LENGTH` — 16MB
  - `UPLOAD_FOLDER` — "uploads"
  - `DEBUG` — True if `FLASK_DEBUG` is true

### Routes
Organized as Flask Blueprints:
- `auth_bp` — `/api/auth`
- `task_bp` — `/api/tasks`
- `attendance_bp` — `/api/attendance`
- `exam_bp` — `/api/exams`
- `timetable_bp` — `/api/timetable`
- `gpa_bp` — `/api/gpa`
- `expense_bp` — `/api/expenses`
- `notification_bp` — `/api/notifications`
- `profile_bp` — `/api/profile`
- `dashboard_bp` — `/api/dashboard`

### Business Logic
- **Authentication:** JWT-based with refresh, 2FA, lockout.
- **Authorization:** Implicit via `request.user_id` scoping.
- **Validation:** Centralized in `utils/validators.py`.
- **Rate Limiting:** In-memory sliding window via decorators.
- **Logging:** All routes use `get_logger()` for structured logging.

### Error Handling
- **File:** `utils/errors.py`
- **Custom Exceptions:** `AppError`, `ValidationError`, `AuthenticationError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitError`.
- **Flask Handlers:** Registered for 400, 401, 403, 404, 405, 409, 429, 500.

### Complete API Table

| Method | Endpoint | Purpose | Request Body/Params | Response | Authentication |
|--------|----------|---------|---------------------|----------|----------------|
| POST | `/api/auth/register` | Register user | JSON: email, password, name, roll_no, branch, semester | tokens, user | No |
| POST | `/api/auth/login` | Login | JSON: email, password, remember_me | token, refresh_token, user or requires_2fa flag | No |
| POST | `/api/auth/verify-2fa` | Verify 2FA | JSON: user_id, code, remember_me | token, refresh_token, user | No |
| POST | `/api/auth/refresh` | Refresh access token | JSON: refresh_token | token, refresh_token | No |
| GET | `/api/auth/me` | Get current user | — | user | Yes |
| POST | `/api/auth/logout` | Logout | — | message | Yes |
| POST | `/api/auth/send-verification` | Send email OTP | — | message | Yes |
| POST | `/api/auth/verify-email` | Verify email OTP | JSON: otp | message | Yes |
| POST | `/api/auth/forgot-password` | Request password reset | JSON: email | message | No |
| POST | `/api/auth/reset-password` | Reset password | JSON: email, otp, new_password | message | No |
| POST | `/api/auth/change-password` | Change password | JSON: current_password, new_password | message | Yes |
| POST | `/api/auth/password-strength` | Check password strength | JSON: password | strength object | No |
| GET | `/api/auth/2fa/setup` | Setup 2FA | — | secret, qr_uri | Yes |
| POST | `/api/auth/2fa/verify-setup` | Verify 2FA setup | JSON: code | message, enabled | Yes |
| POST | `/api/auth/2fa/disable` | Disable 2FA | JSON: password | message, enabled | Yes |
| POST | `/api/auth/google` | Google login | JSON: credential, remember_me | token, refresh_token, user | No |
| GET | `/api/auth/login-history` | Get login history | — | history array | Yes |
| GET | `/api/tasks` | List tasks | Query: status, priority, subject, tag, search, sort_by, sort_order, page, per_page | tasks, total, page, per_page | Yes |
| GET | `/api/tasks/stats` | Task statistics | — | stats object | Yes |
| POST | `/api/tasks` | Create task | JSON: title, description, subject, deadline, priority, status, tags, subtasks | task | Yes |
| PUT | `/api/tasks/<id>` | Update task | JSON: updatable fields | task | Yes |
| DELETE | `/api/tasks/<id>` | Delete task | — | message | Yes |
| POST | `/api/tasks/bulk/complete` | Bulk complete tasks | JSON: task_ids | message | Yes |
| POST | `/api/tasks/bulk/delete` | Bulk delete tasks | JSON: task_ids or delete_completed flag | message | Yes |
| POST | `/api/tasks/<id>/subtasks` | Add subtask | JSON: title | message, subtask | Yes |
| PUT | `/api/tasks/<id>/subtasks/<index>` | Toggle subtask | — | message, done | Yes |
| DELETE | `/api/tasks/<id>/subtasks/<index>` | Remove subtask | — | message | Yes |
| GET | `/api/attendance/subjects` | List subjects | — | subjects | Yes |
| POST | `/api/attendance/subjects` | Create subject | JSON: name, credit_hours | subject | Yes |
| PUT | `/api/attendance/subjects/<id>` | Update subject | JSON: name, credit_hours | message | Yes |
| DELETE | `/api/attendance/subjects/<id>` | Delete subject | — | message | Yes |
| POST | `/api/attendance/records` | Mark attendance | JSON: subject_id, date, status | record | Yes |
| POST | `/api/attendance/bulk` | Bulk mark attendance | JSON: date, records array | records | Yes |
| GET | `/api/attendance/records` | List records | Query: subject_id, from_date, to_date | records | Yes |
| GET | `/api/attendance/stats` | Attendance statistics | Query: target | stats object | Yes |
| GET | `/api/attendance/predictions` | Smart predictions | Query: target | predictions array | Yes |
| GET | `/api/attendance/calendar` | Calendar heatmap data | Query: year, month | calendar object | Yes |
| GET | `/api/exams/subjects` | List exam subjects | — | subjects array | Yes |
| GET | `/api/exams/stats` | Exam stats | — | stats object | Yes |
| GET | `/api/exams/upcoming` | Upcoming exams | — | exams array | Yes |
| POST | `/api/exams/subjects` | Create exam subject | JSON: name, exam_date, topics, notes, priority | subject | Yes |
| PUT | `/api/exams/subjects/<id>` | Update exam subject | JSON: updatable fields | message | Yes |
| DELETE | `/api/exams/subjects/<id>` | Delete exam subject | — | message | Yes |
| PUT | `/api/exams/subjects/<id>/topics/<index>` | Toggle topic | — | topics, progress, completed, total | Yes |
| POST | `/api/exams/subjects/<id>/topics` | Add topic | JSON: name, difficulty | topic, message | Yes |
| DELETE | `/api/exams/subjects/<id>/topics/<index>` | Delete topic | — | message, removed | Yes |
| GET | `/api/timetable` | List timetable entries | — | entries | Yes |
| GET | `/api/timetable/today` | Today's schedule | — | schedule object | Yes |
| GET | `/api/timetable/stats` | Timetable statistics | — | stats object | Yes |
| POST | `/api/timetable` | Create entry | JSON: subject, day, start_time, end_time, room, teacher, color, type | entry | Yes |
| PUT | `/api/timetable/<id>` | Update entry | JSON: updatable fields | message | Yes |
| DELETE | `/api/timetable/<id>` | Delete entry | — | message | Yes |
| POST | `/api/timetable/bulk` | Bulk create entries | JSON: entries array (max 50) | created, errors, total_created | Yes |
| GET | `/api/gpa/semesters` | List semesters + CGPA | — | semesters, cgpa, total_credits | Yes |
| GET | `/api/gpa/stats` | GPA stats | — | stats object | Yes |
| POST | `/api/gpa/calculator` | Quick GPA calc | JSON: subjects, scale | gpa, scale, total_credits, breakdown | Yes |
| POST | `/api/gpa/semesters` | Create semester | JSON: name, subjects, scale | semester | Yes |
| PUT | `/api/gpa/semesters/<id>` | Update semester | JSON: updatable fields | message | Yes |
| DELETE | `/api/gpa/semesters/<id>` | Delete semester | — | message | Yes |
| GET | `/api/gpa/overview` | GPA overview | — | overview object | Yes |
| GET | `/api/expenses` | List expenses | Query: category, from_date, to_date, page, per_page | expenses, total, page, per_page | Yes |
| GET | `/api/expenses/categories` | Get categories | — | categories array | Yes |
| GET | `/api/expenses/analytics` | Expense analytics | — | analytics object | Yes |
| POST | `/api/expenses` | Create expense | JSON: amount, category, date, description, payment_method | expense | Yes |
| PUT | `/api/expenses/<id>` | Update expense | JSON: updatable fields | message | Yes |
| DELETE | `/api/expenses/<id>` | Delete expense | — | message | Yes |
| GET | `/api/expenses/budget` | Get budget | — | budget | Yes |
| PUT | `/api/expenses/budget` | Set budget | JSON: monthly_budget | message, budget | Yes |
| GET | `/api/expenses/stats` | Monthly stats | — | stats object | Yes |
| POST | `/api/expenses/bulk` | Bulk create expenses | JSON: expenses array (max 100) | created, errors, total_created | Yes |
| GET | `/api/notifications` | List notifications | Query: type, unread, page, per_page | notifications, unread_count, total, page, per_page | Yes |
| GET | `/api/notifications/unread-count` | Unread count | — | unread_count | Yes |
| PUT | `/api/notifications/<id>/read` | Mark read | — | message | Yes |
| PUT | `/api/notifications/mark-all-read` | Mark all read | — | message, marked | Yes |
| DELETE | `/api/notifications/<id>` | Delete notification | — | message | Yes |
| DELETE | `/api/notifications/clear-read` | Clear read notifications | — | message, deleted | Yes |
| GET | `/api/notifications/settings` | Get settings | — | settings | Yes |
| PUT | `/api/notifications/settings` | Update settings | JSON: key=boolean settings | message | Yes |
| GET | `/api/notifications/reminders` | List reminders | — | reminders array | Yes |
| POST | `/api/notifications/reminders` | Create reminder | JSON: title, description, date, priority | reminder | Yes |
| PUT | `/api/notifications/reminders/<id>` | Update reminder | JSON: updatable fields | message | Yes |
| DELETE | `/api/notifications/reminders/<id>` | Delete reminder | — | message | Yes |
| GET | `/api/profile` | Get profile | — | profile object | Yes |
| PUT | `/api/profile` | Update profile | JSON: updatable fields | message | Yes |
| POST | `/api/profile/avatar` | Upload avatar | JSON: avatar (base64 string) | message | Yes |
| GET | `/api/profile/stats` | Activity stats | — | stats object | Yes |
| GET | `/api/profile/export` | Export all data | — | export_data object | Yes |
| POST | `/api/profile/import` | Import data | JSON: import_data object | message, imported count | Yes |
| DELETE | `/api/profile/account` | Delete account | JSON: password | message, records_deleted | Yes |
| GET | `/api/dashboard/overview` | Dashboard overview | — | overview object | Yes |
| GET | `/api/dashboard/today-schedule` | Today's schedule | — | schedule object | Yes |
| GET | `/api/dashboard/recent-activity` | Recent activity feed | — | activities array | Yes |
| GET | `/api/dashboard/attendance-alerts` | Attendance alerts | — | alerts array | Yes |
| GET | `/api/config/google-client-id` | Get Google Client ID | — | client_id | No |

---

## 10. DATABASE

### Database Technology
- **System:** MongoDB
- **Connection:** PyMongo (`pymongo.MongoClient`)
- **Connection String:** Configured via `MONGO_URI` environment variable (Atlas cluster based on `.env`).
- **Database Name:** `student_companion`

### Connection Method
- **File:** `app.py`, lines 30-48.
- **Mechanism:** `MongoClient` created on app startup; `app.db` attached to Flask app.
- **Timeout:** `serverSelectionTimeoutMS=5000`, `connectTimeoutMS=5000`.
- **Index Creation:** `create_indexes(app.db)` called after successful ping.

### Collections

#### Collection: `users`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `email` | string | Yes | Unique user email (lowercase, validated) |
| `password_hash` | string | Yes | Werkzeug password hash |
| `name` | string | Yes | Full name |
| `roll_no` | string | No | Roll number |
| `branch` | string | No | Branch/department |
| `semester` | string | No | Current semester |
| `avatar` | string | No | Base64 image data |
| `theme` | string | No | "light" or "dark" |
| `language` | string | No | "en", "hi", "es", "fr" |
| `notification_settings` | object | No | Dict of boolean toggles |
| `email_verified` | boolean | No | Email verification status |
| `two_factor_enabled` | boolean | No | 2FA status |
| `two_factor_secret` | string | No | TOTP secret |
| `google_id` | string | No | Google OAuth sub ID |
| `login_attempts` | int | No | Failed login count |
| `locked_until` | datetime | No | Account lock expiry |
| `created_at` | datetime | Yes | Account creation timestamp |
| `updated_at` | datetime | Yes | Last update timestamp |

**Indexes:** `email` (unique)

#### Collection: `tasks`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `title` | string | Yes | Task title |
| `description` | string | No | Task description |
| `subject` | string | No | Subject name |
| `deadline` | string | No | Date string YYYY-MM-DD |
| `priority` | string | No | "low", "medium", "high" |
| `status` | string | No | "todo", "in_progress", "completed" |
| `tags` | array | No | Array of tag strings |
| `subtasks` | array | No | Array of `{title, done}` objects |
| `created_at` | string | Yes | ISO datetime string |
| `updated_at` | string | Yes | ISO datetime string |

**Indexes:** `user_id`; compound `(user_id, status)`, `(user_id, deadline)`, `(user_id, priority)`, `(user_id, created_at, -1)`, `(user_id, updated_at, -1)`, `(user_id, tags)`

#### Collection: `attendance_subjects`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `name` | string | Yes | Subject name |
| `credit_hours` | int | No | Credit hours (default 0) |

**Indexes:** `user_id`

#### Collection: `attendance_records`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `subject_id` | string | Yes | Reference to attendance_subjects `_id` |
| `date` | string | Yes | Date string YYYY-MM-DD |
| `status` | string | Yes | "present", "absent", or "leave" |

**Indexes:** `user_id`; compound unique `(user_id, subject_id, date)`; compound `(user_id, date)`

#### Collection: `exam_subjects`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `name` | string | Yes | Exam subject name |
| `exam_date` | string | No | Date string YYYY-MM-DD |
| `topics` | array | No | Array of `{name, completed, difficulty}` |
| `notes` | string | No | Study notes |
| `priority` | string | No | "low", "medium", "high" |
| `created_at` | string | Yes | ISO datetime string |
| `updated_at` | string | No | ISO datetime string |

**Indexes:** `user_id`; compound `(user_id, exam_date)`, `(user_id, priority)`

#### Collection: `timetable`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `subject` | string | Yes | Subject/class name |
| `day` | int | Yes | Day of week 1-7 (Monday=1) |
| `start_time` | string | Yes | Time string HH:MM |
| `end_time` | string | Yes | Time string HH:MM |
| `room` | string | No | Room number |
| `teacher` | string | No | Teacher name |
| `color` | string | No | Hex color (default #4A90D9) |
| `type` | string | No | "lecture", "lab", "tutorial", "other" |
| `created_at` | string | Yes | ISO datetime string |
| `updated_at` | string | No | ISO datetime string |

**Indexes:** `user_id`; compound `(user_id, day)`

#### Collection: `gpa_semesters`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `name` | string | Yes | Semester name |
| `subjects` | array | Yes | Array of `{name, credits, grade}` |
| `gpa` | float | Yes | Calculated GPA |
| `scale` | string | Yes | "10" or "4" |
| `created_at` | string | Yes | ISO datetime string |
| `updated_at` | string | No | ISO datetime string |

**Indexes:** `user_id`

#### Collection: `expenses`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `amount` | float | Yes | Expense amount |
| `category` | string | Yes | Expense category |
| `date` | string | Yes | Date string YYYY-MM-DD |
| `description` | string | No | Short description |
| `payment_method` | string | No | "cash", "card", "online", "other" |
| `created_at` | string | Yes | ISO datetime string |

**Indexes:** `user_id`; compound `(user_id, date, -1)`; compound `(user_id, category)`

#### Collection: `budgets`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID (unique) |
| `monthly_budget` | float | Yes | Budget amount |
| `updated_at` | string | No | ISO datetime string |

**Indexes:** `user_id` (unique)

#### Collection: `notifications`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `type` | string | Yes | "task", "exam", "attendance", "budget", "timetable", "system", "reminder" |
| `title` | string | No | Notification title |
| `message` | string | No | Notification message |
| `read` | boolean | No | Read status (default false) |
| `created_at` | string | Yes | ISO datetime string |

**Indexes:** compound `(user_id, created_at, -1)`; compound `(user_id, read)`

#### Collection: `reminders`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `title` | string | Yes | Reminder title |
| `description` | string | No | Reminder description |
| `date` | string | No | Date string |
| `priority` | string | No | "low", "medium", "high" |
| `completed` | boolean | No | Completion status |
| `created_at` | string | Yes | ISO datetime string |

**Indexes:** `user_id`

#### Collection: `streaks`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID (unique) |
| `current_streak` | int | Yes | Current consecutive login days |
| `longest_streak` | int | Yes | Best streak |
| `last_login` | string | Yes | Date string YYYY-MM-DD |

**Indexes:** `user_id` (unique)

#### Collection: `activity_logs`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `action` | string | Yes | Action type (e.g., "login", "logout") |
| `ip_address` | string | No | Client IP |
| `user_agent` | string | No | Browser user agent |
| `created_at` | datetime | Yes | Timestamp |

**Indexes:** compound `(user_id, created_at, -1)`

#### Collection: `otps`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `user_id` | string | Yes | Owner user ID |
| `otp` | string | Yes | OTP code |
| `purpose` | string | Yes | "email_verification" or "password_reset" |
| `created_at` | datetime | Yes | Creation timestamp |
| `expires_at` | datetime | Yes | Expiry timestamp |
| `used` | boolean | Yes | Whether OTP has been used |

**Indexes:** compound `(user_id, purpose, used)`; `expires_at` with TTL (`expireAfterSeconds=0`)

### Relationships
- **One-to-Many:** `users` → `tasks`, `attendance_subjects`, `attendance_records`, `exam_subjects`, `timetable`, `gpa_semesters`, `expenses`, `notifications`, `reminders`, `streaks`, `activity_logs`, `otps`
- **One-to-One:** `users` → `budgets` (one budget document per user)
- **Embedded:** `tasks.subtasks`, `exam_subjects.topics`, `gpa_semesters.subjects`

### CRUD Operations
All CRUD is performed via the route handlers using `utils/db.py` helpers or direct PyMongo calls. No ORM is used.

---

## 11. COMPLETE DATA FLOW

### 11.1 User Registration Flow
```
User fills registration form
  → app.js captures form data
  → API.post('/auth/register', data)
  → auth_routes.py: validate_email, sanitize_string
  → Check duplicate email in users collection
  → Hash password with generate_password_hash
  → Insert user document
  → Create streak document
  → Generate OTP (logged to console)
  → create_token_pair(user_id)
  → Return { token, refresh_token, user }
  → app.js stores tokens in localStorage
  → App.currentUser set
  → ShowApp() → navigate('dashboard')
```

### 11.2 Task Creation Flow
```
User clicks "Add Task" → TasksModule.showTaskModal()
  → User fills form and submits
  → API.post('/tasks', taskData)
  → task_routes.py: @token_required extracts user_id
  → Sanitize and validate fields
  → Parse tags and subtasks
  → Insert into tasks collection with user_id
  → Return created task document
  → Frontend adds to local tasks array and re-renders
```

### 11.3 Dashboard Load Flow
```
App.init() → currentUser exists → route() → 'dashboard'
  → DashboardModule.render()
  → content.innerHTML = dashboard HTML skeleton
  → Promise.all([
      API.get('/dashboard/overview'),
      API.get('/dashboard/today-schedule')
    ])
  → dashboard_routes.py aggregates data from multiple collections
  → Returns overview object + schedule object
  → Frontend renders stat cards, chart, schedule, deadlines, streak, budget, alerts
  → loadRecentActivity() loads activity feed asynchronously
```

### 11.4 Token Refresh Flow
```
API.request() → fetch with Authorization header
  → Server returns 401
  → API._refreshAccessToken()
    → POST /api/auth/refresh with refresh_token
    → Server validates refresh token, returns new token pair
    → API.setTokens(new token, new refresh_token)
  → Retry original request with new token
  → If refresh fails → clearTokens() → App.logout()
```

### 11.5 Budget Alert Flow
```
User creates/updates expense
  → expense_routes.py: insert/update expense
  → _check_budget_alert(db, user_id)
    → Sum expenses for current month
    → Get monthly budget
    → If total > budget and no notification exists today
      → Insert notification document (type: "budget")
  → Notification appears in bell dropdown within 30s polling interval
```

---

## 12. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  static/index.html (SPA Shell)                        │  │
│  │  - Intro / Auth / App containers                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  static/js/app.js (Main Controller)                   │  │
│  │  - Routing, Auth UI, Theme, Notification polling      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  static/js/api.js (API Client)                        │  │
│  │  - Token management, auto-refresh, fetch wrapper      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  static/js/modules/*.js (Feature Modules)             │  │
│  │  - Dashboard, Tasks, Attendance, Exams, Timetable,    │  │
│  │    GPA, Expenses, Notifications, Profile              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  static/css/style.css (Custom Styles)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS / JSON (REST)
                            │
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  app.py (Flask App Factory)                           │  │
│  │  - Config, CORS, Logging, Error Handlers              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Blueprints (routes/*.py)                             │  │
│  │  - auth, tasks, attendance, exams, timetable,         │  │
│  │    gpa, expenses, notifications, profile, dashboard   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  utils/                                                │  │
│  │  - db.py (MongoDB helpers + indexes)                  │  │
│  │  - auth.py (JWT tokens + decorators)                  │  │
│  │  - validators.py (input sanitization)                 │  │
│  │  - errors.py (custom exceptions + handlers)           │  │
│  │  - otp.py (OTP generation/verification)               │  │
│  │  - rate_limiter.py (in-memory sliding window)         │  │
│  │  - logger.py (console + file logging)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    PyMongo Driver
                            │
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MongoDB (student_companion)                           │  │
│  │  Collections:                                          │  │
│  │  users, tasks, attendance_subjects,                   │  │
│  │  attendance_records, exam_subjects, timetable,        │  │
│  │  gpa_semesters, expenses, budgets, notifications,     │  │
│  │  reminders, streaks, activity_logs, otps              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES:
  - MongoDB Atlas (cloud database)
  - Google OAuth 2.0 (optional, not currently configured)
  - CDNs: Bootstrap, Bootstrap Icons, Chart.js, jsPDF, Google GIS
```

---

## 13. USE CASE INFORMATION

### Actors
| Actor | Description |
|-------|-------------|
| **Student** | Primary user. Authenticated individual managing their academic life. |

### Use Cases
| Use Case | Description |
|----------|-------------|
| **Register** | Create new account with email and password |
| **Login** | Authenticate with email/password |
| **Login with 2FA** | Complete login when 2FA is enabled |
| **Logout** | End session |
| **Reset Password** | Recover account via OTP |
| **Change Password** | Update password while authenticated |
| **Setup 2FA** | Enable TOTP-based two-factor authentication |
| **Disable 2FA** | Disable 2FA with password confirmation |
| **Verify Email** | Verify email address with OTP |
| **Login with Google** | Authenticate via Google OAuth (not configured) |
| **View Dashboard** | See overview of all academic metrics |
| **Manage Tasks** | Create, edit, delete, complete tasks and subtasks |
| **Track Attendance** | Mark attendance, view stats, predictions, calendar |
| **Prepare Exams** | Manage exam subjects, topics, track progress |
| **Manage Timetable** | Create weekly schedule, detect conflicts |
| **Calculate GPA** | Track semesters, grades, CGPA |
| **Track Expenses** | Log expenses, set budget, view analytics |
| **View Notifications** | See notifications and reminders |
| **Manage Reminders** | Create, edit, delete reminders |
| **Update Profile** | Edit profile details and settings |
| **Upload Avatar** | Change profile picture |
| **Export Data** | Download all data as JSON |
| **Import Data** | Restore data from JSON |
| **Delete Account** | Permanently delete account and all data |

### Actor → Use Case Relationships
- **Student** has access to all use cases listed above.
- There are no admin, teacher, or other actor types.

---

## 14. DATA FLOW DIAGRAM INFORMATION

### Level 0 DFD (Context Diagram)
```
External Entity: Student
    ↓
Process: Student Companion Web Application
    ↓
Data Store: MongoDB Database
    ↓
External Entity: Google OAuth (optional)
```

### Level 1 DFD
```
External Entity: Student
    ↓
┌─────────────────────────────────────────────────────┐
│ Process 1: Authentication & User Management         │
│   - Register, Login, 2FA, Password Reset            │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Process 2: Academic Feature Modules                 │
│   - Tasks, Attendance, Exams, Timetable, GPA        │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Process 3: Personal Management                      │
│   - Expenses, Notifications, Reminders, Profile     │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ Data Store: MongoDB (student_companion)              │
│   - users, tasks, attendance_*, exam_subjects,       │
│     timetable, gpa_semesters, expenses, budgets,     │
│     notifications, reminders, streaks, activity_logs,│
│     otps                                             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ External Entity: Google OAuth (optional)             │
└─────────────────────────────────────────────────────┘
```

---

## 15. ER DIAGRAM INFORMATION

### Entity: users
- **Primary Key:** `_id` (ObjectId)
- **Relationships:**
  - One-to-Many → `tasks` (via `user_id`)
  - One-to-Many → `attendance_subjects` (via `user_id`)
  - One-to-Many → `attendance_records` (via `user_id`)
  - One-to-Many → `exam_subjects` (via `user_id`)
  - One-to-Many → `timetable` (via `user_id`)
  - One-to-Many → `gpa_semesters` (via `user_id`)
  - One-to-Many → `expenses` (via `user_id`)
  - One-to-One → `budgets` (via `user_id`)
  - One-to-Many → `notifications` (via `user_id`)
  - One-to-Many → `reminders` (via `user_id`)
  - One-to-One → `streaks` (via `user_id`)
  - One-to-Many → `activity_logs` (via `user_id`)
  - One-to-Many → `otps` (via `user_id`)

### Entity: tasks
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone (no references to other entities)

### Entity: attendance_subjects
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** One-to-Many → `attendance_records` (via `subject_id` string reference)

### Entity: attendance_records
- **Primary Key:** `_id` (ObjectId)
- **Foreign Keys:** `user_id` → `users._id`; `subject_id` → `attendance_subjects._id` (string)
- **Unique Constraint:** (`user_id`, `subject_id`, `date`)

### Entity: exam_subjects
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Embedded:** `topics` array (no separate entity)

### Entity: timetable
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone

### Entity: gpa_semesters
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Embedded:** `subjects` array

### Entity: expenses
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone (budget alerts create notifications)

### Entity: budgets
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id` (unique)
- **Relationships:** One-to-One with `users`

### Entity: notifications
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone

### Entity: reminders
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone

### Entity: streaks
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id` (unique)
- **Relationships:** One-to-One with `users`

### Entity: activity_logs
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone

### Entity: otps
- **Primary Key:** `_id` (ObjectId)
- **Foreign Key:** `user_id` → `users._id`
- **Relationships:** Standalone (TTL index on `expires_at`)

---

## 16. UI / SCREEN INFORMATION

| Screen Name | Route/Hash | Purpose | Main Components | User Actions | Important Information Displayed |
|-------------|-----------|---------|-----------------|--------------|--------------------------------|
| **Introduction** | First visit only | Welcome screen | Branding, "Get Started" button | Navigate to auth | App description |
| **Login** | `#login` (default) | User authentication | Email, password, remember me, forgot password, Google login | Enter credentials, submit, toggle to register | Error messages, 2FA prompt if enabled |
| **Register** | Toggle from login | New user signup | Name, email, password, roll no, branch, semester, password strength | Submit registration form | Password strength indicator |
| **Forgot Password** | From login link | Password reset request | Email input, OTP input, new password | Request OTP, submit reset | Step 1/2 flow |
| **2FA Verification** | After login if enabled | Two-factor auth | 6-digit code input | Enter TOTP code | Error on invalid code |
| **Dashboard** | `#dashboard` | Main overview | Stat cards, weekly chart, schedule, deadlines, productivity ring, budget, streak, activity, alerts | View summary, navigate to modules | Attendance %, tasks, CGPA, study hours, expenses, streak |
| **Tasks** | `#tasks` | Task management | Stats pills, filters, list/Kanban toggle, bulk actions, modals | Create/edit/delete tasks, toggle subtasks, bulk complete/delete, filter/sort/search | Task counts, overdue warnings, completion trend |
| **Attendance** | `#attendance` | Attendance tracking | Subject stats, mark form, predictions, calendar heatmap, PDF export | Add subjects, mark attendance (single/bulk), navigate months | Subject-wise %, overall %, classes needed/skip, calendar colors |
| **Exams** | `#exams` | Exam preparation | Stats banner, subject cards with topics, progress bars | Add/edit/delete subjects, toggle topics, add topics | Days until exam, progress %, difficulty breakdown |
| **Timetable** | `#timetable` | Class schedule | Stats bar, weekly grid or day view, entry cards | Add/edit/delete classes, toggle week/day view, bulk import | Total hours, busiest day, current/next class |
| **GPA** | `#gpa` | Grade tracking | Overview banner, semester cards, grade tables, trend chart, quick calculator | Add/edit/delete semesters, enter grades, switch scale, quick calc | CGPA, total credits, best/worst semester, improvement trend |
| **Expenses** | `#expenses` | Expense tracking | Overview banner, expense list, analytics view, budget setting | Add/edit/delete expenses, set budget, view analytics, bulk import | Total spent, remaining, budget %, category breakdown |
| **Notifications** | `#notifications` | Notifications & reminders | Notification list, reminders panel, settings | Mark read/delete notifications, add/edit/delete reminders, change settings | Unread count, notification types, reminder priorities |
| **Profile** | `#profile` | User profile | Avatar, profile card, activity stats, export/import, delete account | Edit profile, upload avatar, export/import data, delete account | Task/attendance/exam counts, account age |

---

## 17. VALIDATION

### Frontend Validation
- **HTML5 Attributes:** `required`, `minlength`, `type="email"`, `pattern` on inputs.
- **Password Strength:** Real-time feedback on registration via `POST /api/auth/password-strength`.
- **Form-level:** JavaScript prevents submission if required fields empty.

### Backend Validation
| Module | Validation |
|--------|------------|
| **Auth** | Email regex; password min 6 chars; name required; OTP 6-digit numeric; 2FA code 6 digits; current password check for changes |
| **Tasks** | Title required; priority enum; status enum; tags sanitized; subtask titles sanitized |
| **Attendance** | Subject name required; status defaults to "present"; date format YYYY-MM-DD |
| **Exams** | Subject name unique per user; priority enum; difficulty enum; topic name required |
| **Timetable** | Day 1-7; time format HH:MM; end > start; type enum; hex color validation |
| **GPA** | Grade from valid set per scale; credits non-negative; semester name unique per user |
| **Expenses** | Amount positive float; category from allowed list; payment method enum; date defaults to today |
| **Notifications** | Type from allowed list; reminder title required; priority enum |
| **Profile** | Text fields sanitized to max lengths; theme enum; language enum; avatar max 2MB |

### Database Validation
- **Unique Indexes:** `users.email`, `budgets.user_id`, `streaks.user_id`, `attendance_records` compound unique on (user_id, subject_id, date).
- **TTL Index:** `otps.expires_at` with `expireAfterSeconds=0` (auto-delete expired OTPs).
- **Required Fields:** Enforced by application logic; MongoDB does not enforce schema.

### Error Messages
- Consistent JSON format: `{"error": "message"}` for failures.
- Success messages: `{"message": "..."}`.
- Custom exceptions in `utils/errors.py` map to standard HTTP status codes.

---

## 18. ERROR HANDLING

### Authentication Errors
- **Missing/Invalid Token:** 401 `{"error": "Missing or invalid token"}`
- **Expired Token:** 401 `{"error": "Token expired or invalid"}` → triggers logout
- **Invalid Refresh Token:** 401 `{"error": "Invalid or expired refresh token"}`
- **Wrong Password:** 401 `{"error": "Invalid email or password. X attempts remaining"}`
- **Account Locked:** 423 `{"error": "Account locked. Try again in X minutes"}`
- **2FA Required:** 200 with `requires_2fa: true` flag

### Invalid Input
- **Missing Fields:** 400 `{"error": "No data provided"}` or field-specific message
- **Validation Failures:** 400 with descriptive error (e.g., "Password must be at least 6 characters")
- **Invalid ID:** 400 `{"error": "Invalid task ID"}`
- **Enum Violations:** Silently corrected to defaults (e.g., invalid priority → "medium")

### Database Errors
- **Duplicate Key:** 409 `{"error": "Email already registered"}` or "Subject already exists"
- **Not Found:** 404 `{"error": "User not found"}`, `{"error": "Task not found"}`, etc.
- **Connection Failure:** Logged to console; application continues but operations will fail. Warning printed on startup.

### API Errors
- **Method Not Allowed:** 405 `{"error": "Method not allowed"}`
- **Conflict:** 409 `{"error": "Time conflict with ..."}`
- **Rate Limit:** 429 `{"error": "Too many requests. Please try again later."}` with `Retry-After` header
- **Internal Error:** 500 `{"error": "Internal server error"}` with logging

### Frontend Errors
- **Network Failures:** Caught in module loaders; retry button shown.
- **Token Refresh Failure:** Forces logout and redirects to auth screen.
- **Unexpected JSON:** `res.json()` may fail; not explicitly caught in all places.

---

## 19. SECURITY

### Password Security
- **Hashing:** Werkzeug `generate_password_hash` (pbkdf2-based).
- **Storage:** Only hashes stored; plaintext never persisted.
- **Reset:** OTP-based with expiry.

### Authentication
- **JWT:** HS256-signed tokens with expiry.
- **Refresh Tokens:** Longer-lived tokens for session persistence.
- **2FA:** Optional TOTP via `pyotp` with `valid_window=1` for clock drift tolerance.

### Authorization
- **Scoping:** All queries filtered by `request.user_id`.
- **No Privilege Escalation:** No admin or elevated roles.
- **Ownership Checks:** Update/delete operations verify document ownership via `user_id`.

### Environment Variables
- **Secrets:** `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` stored in `.env`.
- **Gitignore:** `.env` is gitignored.
- **Defaults:** Development fallbacks exist in `config.py` but should be overridden in production.

### Input Validation
- **Sanitization:** `utils/validators.py` strips whitespace, truncates to max length.
- **Email Validation:** Regex pattern.
- **Enum Validation:** Priority, status, type, category, language, theme all validated against allowed values.
- **XSS Prevention:** Frontend `Utils.esc()` escapes HTML before rendering.

### Database Security
- **No Raw User Input in Queries:** All queries built with PyMongo operators.
- **ObjectId Validation:** `to_object_id()` safely converts strings; invalid IDs return None.
- **Indexes:** Performance optimization; no direct security impact.

### Session Security
- **Stateless JWT:** No server-side session storage.
- **Token Storage:** `localStorage` (vulnerable to XSS; acceptable for demo but not ideal for production).
- **Refresh Flow:** Automatic refresh prevents stale tokens.

### API Security
- **CORS:** Enabled globally (`CORS(app)`).
- **Rate Limiting:** `@auth_rate_limit` on sensitive endpoints (10 req/min per IP); `@api_rate_limit` available (120 req/min).
- **Content Length:** Max 16MB upload limit.

---

## 20. TESTING INFORMATION

> **Note:** No automated tests were found in the repository. All results below are marked "Not Tested" because testing was not performed during inspection.

| Test Case ID | Module | Scenario | Input | Expected Result | Actual Result | Status |
|-------------|--------|----------|-------|-----------------|---------------|--------|
| TC-001 | Auth | Valid registration | Valid email, password >= 6 chars, name | 201 with tokens and user | Not Tested | Not Tested |
| TC-002 | Auth | Duplicate email registration | Existing email | 409 conflict | Not Tested | Not Tested |
| TC-003 | Auth | Valid login | Correct email/password | 200 with tokens and user | Not Tested | Not Tested |
| TC-004 | Auth | Wrong password | Invalid password | 401 with attempts remaining | Not Tested | Not Tested |
| TC-005 | Auth | Account lockout | 5+ failed attempts | 423 locked message | Not Tested | Not Tested |
| TC-006 | Auth | 2FA login | Enabled 2FA + valid TOTP | 200 with tokens | Not Tested | Not Tested |
| TC-007 | Auth | Invalid 2FA code | Enabled 2FA + wrong code | 401 invalid code | Not Tested | Not Tested |
| TC-008 | Auth | Token refresh | Valid refresh token | 200 with new token pair | Not Tested | Not Tested |
| TC-009 | Tasks | Create task | Valid title and fields | 201 with task | Not Tested | Not Tested |
| TC-010 | Tasks | Bulk complete tasks | Array of task IDs | 200 with modified count | Not Tested | Not Tested |
| TC-011 | Tasks | Toggle subtask auto-complete | All subtasks marked done | Task status → completed | Not Tested | Not Tested |
| TC-012 | Attendance | Mark attendance | subject_id, date, status | 200 with record | Not Tested | Not Tested |
| TC-013 | Attendance | Duplicate attendance same day | Same subject/date twice | Upsert, no error | Not Tested | Not Tested |
| TC-014 | Attendance | Stats calculation | Multiple records | Correct percentages and classes_needed | Not Tested | Not Tested |
| TC-015 | Exams | Create exam subject | Valid name, exam_date, topics | 201 with subject | Not Tested | Not Tested |
| TC-016 | Exams | Toggle topic completion | Valid topic index | Updated topics and progress | Not Tested | Not Tested |
| TC-017 | Timetable | Conflict detection | Overlapping times same day | 409 conflict error | Not Tested | Not Tested |
| TC-018 | Timetable | Bulk create with conflicts | 5 entries, 1 conflict | 201 with created + errors | Not Tested | Not Tested |
| TC-019 | GPA | Calculate CGPA | Multiple semesters with credits | Correct credit-weighted CGPA | Not Tested | Not Tested |
| TC-020 | GPA | Quick calculator | Subjects with grades and credits | Correct GPA without saving | Not Tested | Not Tested |
| TC-021 | Expenses | Create expense over budget | Amount exceeds monthly budget | Budget alert notification created | Not Tested | Not Tested |
| TC-022 | Expenses | Bulk import | 50 valid expenses | 201 with all created | Not Tested | Not Tested |
| TC-023 | Notifications | Mark all read | Unread notifications exist | 200 with modified count | Not Tested | Not Tested |
| TC-024 | Profile | Account deletion | Correct password | 200 with records_deleted count | Not Tested | Not Tested |
| TC-025 | Profile | Export/Import | Valid export JSON | Imported record count matches | Not Tested | Not Tested |
| TC-026 | Security | Rate limit auth endpoint | 11 requests in 60s | 429 on 11th request | Not Tested | Not Tested |
| TC-027 | Security | Access other user's data | Valid token, different user_id | 404 or empty results | Not Tested | Not Tested |
| TC-028 | PWA | Offline navigation | Offline, navigate to cached page | Served from cache | Not Tested | Not Tested |

---

## 21. DEPLOYMENT

### Current Deployment Configuration
- **Platform:** Render.com (configured via `render.yaml`)
- **Environment:** Python
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn "app:create_app()"`
- **Service Type:** Web service

### Required Environment Variables
| Variable | Purpose | Currently Set In |
|----------|---------|------------------|
| `MONGO_URI` | MongoDB connection string | `.env` (contains actual URI with credentials) |
| `JWT_SECRET` | JWT signing secret | `.env` |
| `JWT_EXPIRY_HOURS` | Access token expiry | `.env` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `.env` (empty) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `.env` (empty) |

### Production Configuration Notes
- `render.yaml` has empty `value:` fields for envVars — must be populated before deployment.
- `gunicorn` used as production WSGI server.
- No database migration tool (MongoDB is schemaless).
- Static files served by Flask in development; in production, should ideally be served by a reverse proxy or CDN.
- Service worker provides basic offline caching but references `/offline.html` which does not exist.

### Local Development
- **Command:** `python app.py`
- **Port:** 5000
- **Debug Mode:** Enabled by default (`FLASK_DEBUG=True` in `.env`)

---

## 22. KNOWN BUGS

| Issue | Location | Possible Cause | Current Status | Possible Solution |
|--------|----------|---------------|----------------|-------------------|
| **Duplicate `setupRefreshListener()`** | `static/js/modules/dashboard.js` lines 167 and 474 | Copy-paste error | Harmless redundancy | Remove duplicate |
| **Duplicate `stopNotificationChecker()`** | `static/js/app.js` lines 480 and 583 | Copy-paste error | Harmless redundancy | Remove duplicate |
| **`_serialize_user` missing `google_id`** | `routes/auth_routes.py` | Oversight during refactor | Google ID not exposed to frontend | Add `google_id` to serialized output if needed |
| **`login_history` collection referenced but not indexed** | `routes/profile_routes.py` line 277; `utils/db.py` | Typo — uses `activity_logs` elsewhere but `login_history` in account deletion | Account deletion fails to remove login history | Change to `activity_logs` or create `login_history` collection |
| **`/offline.html` missing** | `static/sw.js` line 92 | Service worker references fallback that doesn't exist | Offline navigation shows blank or error on uncached pages | Create `offline.html` or remove fallback |
| **Empty `value:` in `render.yaml`** | `render.yaml` lines 9-16 | Placeholder not filled | Deployment fails without env vars | Populate with actual values or use Render dashboard |
| **In-memory rate limiter** | `utils/rate_limiter.py` | Simple implementation | Not suitable for multi-worker/restart | Use Redis or database-backed rate limiting |
| **No actual email delivery** | `utils/otp.py`, `routes/auth_routes.py` | OTPs only logged to console | Email verification and password reset rely on console OTPs | Integrate SMTP or email service |
| **`budget_doc` missing `monthly_budget` key check** | `routes/dashboard_routes.py` line 80 | Assumes key exists | Could KeyError if budget doc malformed | Use `.get("monthly_budget", 0)` |
| **Task overdue uses string date comparison** | `routes/task_routes.py`, `routes/dashboard_routes.py` | Works for YYYY-MM-DD but fragile | Current implementation OK for UTC dates | Consider timezone-aware comparison |

---

## 23. LIMITATIONS

1. **No Email Service:** OTPs for verification and password reset are only printed to the server console. No actual email delivery is implemented.
2. **Single-User Per Account:** No multi-user or family plans. Each account is strictly one student.
3. **No Admin Interface:** No role for teachers, parents, or administrators.
4. **In-Memory Rate Limiting:** Not suitable for horizontal scaling or process restarts.
5. **Stateless JWT:** No server-side token revocation; logout does not invalidate tokens.
6. **localStorage Token Storage:** Vulnerable to XSS attacks; not suitable for high-security contexts.
7. **No Data Backup/Restore UI:** Export/import exists but requires manual JSON handling.
8. **Limited Offline Support:** Service worker caches assets but not API data; offline.html missing.
9. **No Real-Time Updates:** Notification polling every 30 seconds; no WebSockets.
10. **MongoDB Only:** No support for other databases.
11. **No Automated Tests:** No unit, integration, or E2E tests found.
12. **Hardcoded CDN Dependencies:** External CDN URLs; offline or CDN outages break the app.
13. **No Input Length Limits on Some Fields:** While sanitization truncates, some backend validators use generous max_length values.
14. **Account Deletion Cascade:** Deletes all user data but may leave orphaned references if database constraints change.

---

## 24. FUTURE SCOPE

### Realistic Improvements Based on Current Implementation
- **Email Integration:** Add SMTP or email service (SendGrid, Mailgun) for OTP delivery.
- **Push Notifications:** Replace 30s polling with WebPush API.
- **Real-Time Sync:** Add WebSockets or Server-Sent Events for live updates.
- **Data Persistence Offline:** IndexedDB for offline data entry with sync on reconnect.
- **Export Enhancements:** PDF/Excel export for reports, not just JSON.
- **Advanced Analytics:** More charts, spending trends, attendance forecasting.
- **Recurring Tasks/Expenses:** Support for repeating entries.
- **File Attachments:** Allow attachments on tasks, expenses, exams beyond base64 avatars.
- **Multi-Language:** Expand beyond en/hi/es/fr; implement i18n framework.
- **Accessibility:** ARIA labels, keyboard navigation improvements.
- **Automated Tests:** Unit tests for routes, integration tests for API, E2E tests for critical flows.
- **Rate Limiting Backend:** Replace in-memory store with Redis for production scaling.
- **Token Revocation:** Add token blacklist or short-lived access tokens with frequent refresh.
- **Admin Dashboard:** For managing users (if deployed institution-wide).
- **Mobile App:** Wrap PWA with Capacitor or build native apps.
- **Dark/Light Mode Sync:** Sync theme across devices via profile.

### Clearly NOT Implemented (Do Not Claim)
- Email sending
- Google OAuth (configured but inactive)
- Real-time chat or collaboration
- Payment processing
- AI-based recommendations
- Mobile native apps

---

## 25. ADVANTAGES

1. **Unified Platform:** Single application replaces multiple tools for academic management.
2. **Offline-Capable PWA:** Service worker enables basic offline access to cached assets.
3. **Comprehensive Feature Set:** Covers tasks, attendance, exams, timetable, GPA, expenses, notifications, and profile.
4. **Responsive Design:** Works on desktop, tablet, and mobile with adaptive layouts.
5. **Dark Mode:** Built-in theme switching with persistence.
6. **Privacy-Focused:** No third-party analytics; data stored in user's own MongoDB cluster.
7. **Data Portability:** Export and import JSON for backup/restore.
8. **Smart Predictions:** Attendance guidance (classes needed/skip) is a unique helpful feature.
9. **Automatic Token Refresh:** Seamless session management without repeated logins.
10. **Conflict Detection:** Timetable prevents double-booking.
11. **Bulk Operations:** Efficient data entry via bulk create for timetable and expenses.
12. **Budget Alerts:** Automatic notifications when spending exceeds budget.
13. **Login Streaks:** Gamifies regular usage.
14. **2FA Support:** Optional TOTP-based two-factor authentication.
15. **Base64 Avatar Upload:** No separate file storage service needed.

---

## 26. PROJECT WORKFLOW

### Complete User Journey

1. **Opening Application**
   - User navigates to `http://localhost:5000` (or deployed URL).
   - Flask serves `static/index.html`.
   - `app.js` initializes.

2. **Introduction (First Visit)**
   - If `localStorage.introShown` is absent, intro screen displays.
   - User clicks "Get Started" → sets flag → shows auth screen.

3. **Authentication**
   - **New User:** Clicks "Create an account", fills registration form, submits. Receives tokens, user object. OTP logged to console. Redirected to dashboard.
   - **Returning User:** Enters email/password, optionally checks "Remember me", submits. If 2FA enabled, enters TOTP code. Receives tokens. Redirected to dashboard.
   - **Google User:** Clicks "Continue with Google", authenticates with Google, receives tokens. Redirected to dashboard.
   - **Forgot Password:** Clicks "Forgot password?", enters email, receives OTP (console), enters OTP + new password, redirected to login.

4. **Dashboard**
   - Overview cards load with aggregated metrics.
   - Weekly activity chart renders.
   - Today's schedule and upcoming deadlines load.
   - Recent activity feed loads asynchronously.
   - Notification bell polls every 30 seconds.

5. **Using Modules**
   - User navigates via sidebar or direct hash.
   - Each module loads data via `API.get()` calls.
   - CRUD operations send POST/PUT/DELETE requests.
   - Successful mutations trigger `dashboard:refresh` event for live updates.

6. **Saving/Updating Data**
   - Form submission → `API.post()` → backend validates → MongoDB write → JSON response → frontend re-renders module or shows success toast.
   - Token refresh handled transparently if access token expired.

7. **Logout**
   - User clicks logout → `API.clearTokens()` → `App.logout()` → auth screen shown.
   - Backend logs activity entry.

---

## 27. IMPORTANT CODE INFORMATION

| Name | Location | Purpose | How It Connects |
|------|----------|---------|-----------------|
| `create_app()` | `app.py:15` | Flask app factory | Creates app, connects DB, registers routes, returns app |
| `Config` | `config.py:7` | Configuration | Provides all settings to app via `app.config.from_object()` |
| `register_routes()` | `routes/__init__.py:13` | Blueprint registration | Maps all blueprints to URL prefixes |
| `@token_required` | `utils/auth.py:54` | Authentication decorator | Extracts JWT, sets `request.user_id`, blocks unauthenticated access |
| `create_token()` / `create_token_pair()` | `utils/auth.py:15`, `utils/auth.py:31` | JWT generation | Used in login, refresh, registration to issue tokens |
| `create_indexes()` | `utils/db.py:130` | Database optimization | Called at startup to ensure query performance |
| `API.request()` | `static/js/api.js:73` | HTTP client | Central method for all API calls; handles 401 refresh |
| `App.init()` | `static/js/app.js:10` | App bootstrap | Checks token, loads user, shows appropriate container, sets up routing |
| `App.route()` | `static/js/app.js:56` | Hash router | Dispatches to module renderers based on `location.hash` |
| `DashboardModule.render()` | `static/js/modules/dashboard.js:7` | Dashboard rendering | Aggregates data from 4 API endpoints, renders complex UI |
| `TasksModule.render()` | `static/js/modules/tasks.js:10` | Tasks rendering | Manages list/Kanban toggle, filters, bulk actions |
| `check_conflict()` | `routes/timetable_routes.py:48` | Timetable conflict detection | Prevents overlapping class entries |
| `_check_budget_alert()` | `routes/expense_routes.py:391` | Budget notification | Auto-creates notification when monthly budget exceeded |
| `_complete_login()` | `routes/auth_routes.py:615` | Login post-processing | Updates streak, logs activity, resets login attempts |

---

## 28. PROJECT STATISTICS

| Metric | Count | Notes |
|--------|-------|-------|
| **Frontend "pages" (SPA views)** | 9 | Dashboard, Tasks, Attendance, Exams, Timetable, GPA, Expenses, Notifications, Profile |
| **Backend route files** | 10 | 9 feature blueprints + `__init__.py` |
| **API endpoints** | 58 | Exact count from route table in section 9 |
| **Database collections** | 14 | users, tasks, attendance_subjects, attendance_records, exam_subjects, timetable, gpa_semesters, expenses, budgets, notifications, reminders, streaks, activity_logs, otps |
| **Major frontend modules** | 9 | One per feature in `static/js/modules/` |
| **Important JavaScript files** | 11 | app.js, api.js, utils.js, 9 module files |
| **CSS files** | 1 | `static/css/style.css` |
| **Python files** | 12 | app.py, config.py, requirements.txt, routes/ (10 files), utils/ (7 files, excluding __pycache__) |
| **Approximate lines of code** | ~5,500+ | Backend Python ~2,500 lines; Frontend JS ~3,000+ lines; CSS ~1,286 lines; HTML ~168 lines |

*Note: Line counts are approximate and based on file inspection.*

---

## 29. BLACK BOOK INFORMATION

### Mapping to Standard Black Book Sections

| Black Book Section | Information Source | Notes |
|--------------------|-------------------|-------|
| **Abstract** | Section 1 (Project purpose, type, users) + Section 25 (Advantages) | Summarize what the app does and its value. |
| **Introduction** | Section 1 (purpose, problem, solution) | Explain why students need a unified academic assistant. |
| **Problem Statement** | Section 1 (main problem being solved) | Fragmented academic tools, lack of integration. |
| **Objectives** | Section 4 (feature list) + Section 24 (future scope) | Objectives: centralize tasks, attendance, exams, timetable, GPA, expenses. |
| **Scope** | Section 4 (feature list) + Section 23 (limitations) | Clearly define in-scope modules and out-of-scope items (no email, no admin, etc.). |
| **Existing System** | Section 23 (limitations) + general context | Describe current fragmented solutions (diaries, spreadsheets, multiple apps). |
| **Proposed System** | Section 4 (feature list) + Section 12 (architecture) | Describe the unified SPA with MongoDB backend. |
| **Requirements** | Section 2 (technology stack) + Section 17 (validation) | Functional: all features. Non-functional: responsive, dark mode, PWA, JWT auth. |
| **Technology Stack** | Section 2 (complete technology stack) | Flask, MongoDB, Bootstrap, JWT, etc. |
| **System Analysis** | Section 11 (data flow) + Section 13 (use cases) + Section 14 (DFD) | Use case diagram, DFDs, data flow descriptions. |
| **System Design** | Section 12 (system architecture) + Section 15 (ER diagram) | Architecture diagram, ER diagram, collection relationships. |
| **Database Design** | Section 10 (database) | Collection tables with fields, types, relationships. |
| **Module Description** | Section 5 (module documentation) | Detailed per-module explanation. |
| **Implementation** | Section 27 (important code) + Section 3 (file structure) | Key files, functions, and their roles. |
| **Testing** | Section 20 (testing information) | Test scenarios; note that actual testing not performed. |
| **Results** | Needs confirmation | Screenshots or live demo not available from code alone. |
| **Advantages** | Section 25 (advantages) | List of actual implemented advantages. |
| **Limitations** | Section 23 (limitations) | Honest limitations for balanced documentation. |
| **Future Scope** | Section 24 (future scope) | Realistic improvements based on current code. |
| **Conclusion** | Section 1 (project status) + Section 25 (advantages) | Summarize completion and value. |

### Additional Black Book Content Needed
The following must be provided externally and cannot be determined from code:

- **Title Page:** Student name, roll number, college, department, university, project guide, academic year/semester.
- **Certificate:** Internal and external examiner signatures, college certificate format.
- **Acknowledgement:** Personal acknowledgments.
- **Table of Figures:** Screenshots, diagrams, flowcharts (must be generated separately).
- **Live Demo / Screenshots:** Actual UI screenshots for Results chapter.
- **System Architecture Diagram:** Visual diagram based on Section 12 description.
- **Use Case Diagram:** Visual diagram based on Section 13.
- **DFD Diagrams:** Level 0, Level 1 based on Section 14.
- **ER Diagram:** Visual diagram based on Section 15.
- **Deployment Evidence:** Live URL or local setup screenshots.

---

## 30. INFORMATION THAT I MUST PROVIDE

The following information cannot be determined from the codebase and must be provided manually for the Black Book:

| Item | Description |
|------|-------------|
| **Student Name** | Name of the project developer |
| **Roll Number / Registration Number** | Student identification number |
| **College/Institution Name** | Full name of the college |
| **Department** | Department name (e.g., Computer Science and Engineering) |
| **University** | University name |
| **Project Guide** | Name and designation of the guide |
| **Academic Year / Semester** | Year and semester for which project is submitted |
| **Black Book Format** | Specific formatting guidelines, page limits, chapter organization required by the college |
| **Certificate Wording** | Exact certificate text and signatory requirements |
| **Declaration Text** | Plagiarism/self-declaration wording if required |
| **Screenshots** | Actual UI screenshots of each module for Results chapter |
| **Diagrams** | Professionally drawn architecture, use case, DFD, and ER diagrams |
| **Live Demo URL** | Deployed application URL (if available) |
| **Testing Evidence** | Actual test execution results (currently marked "Not Tested") |
| **References/Bibliography** | Textbooks, documentation, online resources cited |
| **Glossary** | Technical terms and abbreviations if required |

---

## APPENDIX: QUICK REFERENCE

### Application URLs (Local Development)
- **Root:** `http://localhost:5000/`
- **API Base:** `http://localhost:5000/api/`
- **Google Client ID Config:** `http://localhost:5000/api/config/google-client-id`

### Default Configuration Values
| Setting | Default | Env Variable |
|---------|---------|--------------|
| MongoDB URI | `mongodb://localhost:27017/student_companion` | `MONGO_URI` |
| JWT Secret | `dev-secret-change-in-production` | `JWT_SECRET` |
| Access Token Expiry | 72 hours | `JWT_EXPIRY_HOURS` |
| Refresh Token Expiry | 30 days | `JWT_REFRESH_EXPIRY_DAYS` |
| Remember Me Expiry | 90 days | `JWT_REMEMBER_ME_EXPIRY_DAYS` |
| Max Login Attempts | 5 | `MAX_LOGIN_ATTEMPTS` |
| Account Lock Minutes | 15 | `ACCOUNT_LOCK_MINUTES` |
| Max Upload Size | 16 MB | `MAX_CONTENT_LENGTH` |
| Upload Folder | `uploads/` | `UPLOAD_FOLDER` |
| Debug Mode | True | `FLASK_DEBUG` |

### Log Files
- Location: `logs/app_YYYYMMDD.log`
- Rotation: Daily
- Console: Colored output at INFO level
- File: DEBUG level with filename and line number

---

*Document generated from actual codebase inspection. No secrets included. No modifications made to application.*
