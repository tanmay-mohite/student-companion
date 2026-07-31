// Dashboard Module

const DashboardModule = {
    chart: null,
    budgetChart: null,

    async render() {
        const content = document.getElementById('content');
        const user = App.currentUser || {};
        const greeting = this._getGreeting();
        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const safeName = Utils.esc(user.name ? user.name.split(' ')[0] : 'Student');

        content.innerHTML = `
            <div class="dashboard-wrapper">
                <!-- Welcome Banner -->
                <div class="dashboard-banner mb-4">
                    <div class="banner-content">
                        <div>
                            <h3 class="banner-greeting">${greeting}, ${safeName}!</h3>
                            <p class="banner-date"><i class="bi bi-calendar3"></i> ${todayStr}</p>
                        </div>
                        <div class="banner-streak">
                            <div class="streak-badge" id="banner-streak">
                                <i class="bi bi-fire"></i>
                                <span class="streak-val">0</span>
                                <small>day streak</small>
                            </div>
                        </div>
                    </div>
                    <!-- Alerts ticker -->
                    <div id="dashboard-alerts" class="alerts-bar"></div>
                </div>

                <!-- Loading -->
                <div id="dashboard-loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                <div id="dashboard-content" class="d-none">
                    <!-- Stat Cards Row -->
                    <div class="row g-3 mb-4" id="stat-cards"></div>

                    <!-- Main Grid -->
                    <div class="row g-3">
                        <!-- Left Column -->
                        <div class="col-lg-8">
                            <!-- Weekly Activity Chart -->
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="card-title mb-0"><i class="bi bi-bar-chart-fill text-primary me-2"></i>Weekly Activity</h5>
                                        <span class="badge bg-primary-subtle text-primary" id="weekly-total">0 tasks</span>
                                    </div>
                                    <canvas id="weekly-chart" height="180"></canvas>
                                </div>
                            </div>

                            <!-- Today's Schedule -->
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="card-title mb-0"><i class="bi bi-clock-history text-info me-2"></i>Today's Schedule</h5>
                                        <span class="badge bg-info-subtle text-info" id="today-day-badge"></span>
                                    </div>
                                    <div id="today-schedule-content">
                                        <div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Recent Activity -->
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title mb-3"><i class="bi bi-activity text-success me-2"></i>Recent Activity</h5>
                                    <div id="recent-activity-content">
                                        <div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div class="col-lg-4">
                            <!-- Productivity Score -->
                            <div class="card mb-3 text-center">
                                <div class="card-body">
                                    <h6 class="text-muted mb-2">Productivity Score</h6>
                                    <div class="prod-score-ring" id="prod-ring">
                                        <svg viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bs-border-color)" stroke-width="10"/>
                                            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGrad)" stroke-width="10"
                                                stroke-dasharray="326.7" stroke-dashoffset="326.7" stroke-linecap="round"
                                                transform="rotate(-90 60 60)" id="score-circle"/>
                                            <defs><linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" style="stop-color:var(--bs-primary)"/><stop offset="100%" style="stop-color:var(--bs-indigo, #6610f2)"/>
                                            </linearGradient></defs>
                                            <text x="60" y="55" text-anchor="middle" class="score-text" id="score-value">0%</text>
                                            <text x="60" y="72" text-anchor="middle" class="score-label">score</text>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <!-- Budget Status -->
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h6 class="text-muted mb-2"><i class="bi bi-wallet2 me-1"></i>Budget This Month</h6>
                                    <div id="budget-widget"></div>
                                </div>
                            </div>

                            <!-- Upcoming Deadlines -->
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="text-muted mb-0"><i class="bi bi-alarm me-1"></i>Upcoming Deadlines</h6>
                                        <span class="badge bg-danger-subtle text-danger d-none" id="deadlines-count">0</span>
                                    </div>
                                    <div id="upcoming-deadlines"></div>
                                </div>
                            </div>

                            <!-- Streak Card -->
                            <div class="card streak-card bg-gradient-primary text-white">
                                <div class="card-body text-center">
                                    <i class="bi bi-fire display-6"></i>
                                    <div class="streak-number" id="streak-count">0</div>
                                    <div>day streak</div>
                                    <div class="mt-1 small opacity-75">Best: <span id="longest-streak">0</span> days</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        try {
            // Load all dashboard data in parallel
            const [overview, schedule] = await Promise.all([
                API.get('/dashboard/overview'),
                API.get('/dashboard/today-schedule').catch(() => ({ classes: [], tasks_due_today: [], day: '', date: '' })),
            ]);

            document.getElementById('dashboard-loading').classList.add('d-none');
            document.getElementById('dashboard-content').classList.remove('d-none');

            this.renderStats(overview);
            this.renderAlerts(overview.alerts || []);
            this.renderProductivity(overview.productivity_score || 0);
            this.renderBudget(overview);
            this.renderWeeklyChart(overview.weekly_activity || {});
            this.renderDeadlines(overview.upcoming_deadlines || []);
            this.renderStreak(overview);
            this.renderTodaySchedule(schedule);

            // Load recent activity async
            this.loadRecentActivity();
        } catch (e) {
            document.getElementById('dashboard-loading').innerHTML = `
                <div class="text-danger"><i class="bi bi-exclamation-triangle"></i> Failed to load dashboard</div>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="DashboardModule.render()">Retry</button>`;
        }
    },

    // --- Stat Cards ---
    renderStats(data) {
        const stats = [
            {
                label: 'Attendance', value: data.attendance_percentage, suffix: '%',
                icon: 'bi-calendar-check',
                color: data.attendance_percentage >= 75 ? 'success' : (data.attendance_percentage >= 60 ? 'warning' : 'danger'),
                bg: 'bg-success-subtle',
                detail: `${data.subject_count || 0} subjects`,
            },
            {
                label: 'Tasks', value: data.tasks_completed, suffix: `/${data.tasks_total || 0}`,
                icon: 'bi-list-check', color: 'primary', bg: 'bg-primary-subtle',
                detail: data.tasks_overdue > 0 ? `${data.tasks_overdue} overdue` : 'On track',
                detailColor: data.tasks_overdue > 0 ? 'text-danger' : 'text-muted',
            },
            {
                label: 'CGPA', value: data.cgpa || '—', suffix: '',
                icon: 'bi-mortarboard', color: 'info', bg: 'bg-info-subtle',
                detail: 'Grade point avg',
            },
            {
                label: 'Study Hrs', value: data.study_hours, suffix: '',
                icon: 'bi-clock', color: 'warning', bg: 'bg-warning-subtle',
                detail: 'This week',
            },
            {
                label: 'Spent', value: '₹' + (data.monthly_expenses || 0).toLocaleString(),
                suffix: '', icon: 'bi-wallet2', color: 'danger', bg: 'bg-danger-subtle',
                detail: data.budget > 0 ? `₹${data.budget_remaining.toLocaleString()} left` : 'No budget set',
            },
        ];

        document.getElementById('stat-cards').innerHTML = stats.map((s, i) => `
            <div class="col-xl col-md-4 col-sm-6">
                <div class="card stat-card border-0 shadow-sm h-100" style="animation: fadeInUp 0.4s ease ${i * 0.08}s both">
                    <div class="card-body d-flex align-items-start gap-3">
                        <div class="stat-icon ${s.bg} text-${s.color}"><i class="bi ${s.icon}"></i></div>
                        <div class="flex-grow-1">
                            <div class="text-muted small">${s.label}</div>
                            <div class="fs-4 fw-bold">${s.value}${s.suffix}</div>
                            <div class="${s.detailColor || 'text-muted'}" style="font-size:0.75rem">${s.detail}</div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // --- Alerts Bar ---
    renderAlerts(alerts) {
        const container = document.getElementById('dashboard-alerts');
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="alert-item alert-ok"><i class="bi bi-check-circle"></i> All looking good! No alerts.</div>';
            return;
        }
        container.innerHTML = alerts.map(a => `
            <div class="alert-item alert-${Utils.esc(a.severity)}">
                <i class="bi ${Utils.esc(a.icon)}"></i> ${Utils.esc(a.message)}
            </div>
        `).join('');
    },

    // --- Productivity Ring ---
    renderProductivity(score) {
        const circle = document.getElementById('score-circle');
        const text = document.getElementById('score-value');
        if (!circle || !text) return;
        const circumference = 326.7;
        const offset = circumference - (score / 100) * circumference;
        // Animate
        setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 1s ease';
            circle.style.strokeDashoffset = offset;
        }, 300);
        text.textContent = Math.round(score) + '%';
    },

    // --- Budget Widget ---
    renderBudget(data) {
        const container = document.getElementById('budget-widget');
        const budget = data.budget || 0;
        const spent = data.monthly_expenses || 0;
        const pct = data.budget_percentage || 0;

        if (budget === 0) {
            container.innerHTML = `
                <p class="text-muted small mb-1">No budget set</p>
                <a href="#expenses" class="btn btn-sm btn-outline-primary">Set Budget</a>`;
            return;
        }

        const color = pct > 100 ? 'danger' : pct > 80 ? 'warning' : 'success';
        const remaining = data.budget_remaining || 0;

        container.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span class="small">₹${spent.toLocaleString()} spent</span>
                <span class="small fw-bold">₹${budget.toLocaleString()}</span>
            </div>
            <div class="progress mb-2" style="height:8px;border-radius:4px">
                <div class="progress-bar bg-${color}" style="width:${Math.min(pct, 100)}%;border-radius:4px;transition:width 1s ease"></div>
            </div>
            <div class="d-flex justify-content-between">
                <small class="text-${color}">${pct > 100 ? 'Over budget!' : `${Math.round(pct)}% used`}</small>
                <small class="text-muted">₹${remaining.toLocaleString()} left</small>
            </div>`;
    },

    // --- Weekly Activity Chart ---
    renderWeeklyChart(activity) {
        const ctx = document.getElementById('weekly-chart').getContext('2d');
        if (this.chart) this.chart.destroy();

        const total = Object.values(activity).reduce((a, b) => a + b, 0);
        document.getElementById('weekly-total').textContent = `${total} tasks`;

        const labels = Object.keys(activity);
        const values = Object.values(activity);
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-primary').trim() || '#0d6efd';

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: values,
                    backgroundColor: labels.map(l => l === today ? primaryColor : (isDark ? 'rgba(13,110,253,0.3)' : 'rgba(13,110,253,0.2)')),
                    borderRadius: 8,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                        titleColor: isDark ? '#000' : '#fff',
                        bodyColor: isDark ? '#000' : '#fff',
                        cornerRadius: 8,
                        padding: 10,
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: isDark ? '#aaa' : '#666' }, grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' } },
                    x: { ticks: { color: isDark ? '#aaa' : '#666' }, grid: { display: false } },
                },
            },
        });
    },

    // --- Upcoming Deadlines ---
    renderDeadlines(deadlines) {
        const container = document.getElementById('upcoming-deadlines');
        const countBadge = document.getElementById('deadlines-count');

        if (deadlines.length === 0) {
            container.innerHTML = '<p class="text-muted small text-center py-2">No upcoming deadlines</p>';
            return;
        }

        countBadge.textContent = deadlines.length;
        countBadge.classList.remove('d-none');

        container.innerHTML = deadlines.map(t => {
            const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const urgency = daysLeft <= 1 ? 'danger' : daysLeft <= 3 ? 'warning' : 'info';
            const safeTitle = Utils.esc(t.title);
            const safeSubject = Utils.esc(t.subject);
            const safePriority = Utils.esc(t.priority);
            return `
                <div class="deadline-item">
                    <div class="d-flex align-items-start gap-2">
                        <div class="deadline-dot bg-${urgency}"></div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold small">${safeTitle}</div>
                            ${safeSubject ? `<div class="text-muted" style="font-size:0.72rem">${safeSubject}</div>` : ''}
                        </div>
                        <div class="text-end">
                            <span class="badge bg-${urgency}-subtle text-${urgency}" style="font-size:0.7rem">
                                ${daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                            </span>
                            <div class="badge bg-${Utils.priorityColor(t.priority)}-subtle text-${Utils.priorityColor(t.priority)} mt-1" style="font-size:0.65rem">${safePriority}</div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

    // --- Streak ---
    renderStreak(data) {
        document.getElementById('streak-count').textContent = data.current_streak || 0;
        document.getElementById('longest-streak').textContent = data.longest_streak || 0;
        document.querySelector('#banner-streak .streak-val').textContent = data.current_streak || 0;
    },

    // --- Today's Schedule ---
    renderTodaySchedule(data) {
        const container = document.getElementById('today-schedule-content');
        document.getElementById('today-day-badge').textContent = data.day || '';

        const classes = data.classes || [];
        const tasks = data.tasks_due_today || [];

        if (classes.length === 0 && tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-sun display-6 text-warning"></i>
                    <p class="text-muted mt-2 mb-0">No classes or tasks today!</p>
                    <small class="text-muted">Enjoy your free time</small>
                </div>`;
            return;
        }

        let html = '';

        // Classes timeline
        if (classes.length > 0) {
            html += '<div class="mb-3"><h6 class="small text-muted mb-2"><i class="bi bi-book me-1"></i>Classes</h6>';
            html += '<div class="schedule-timeline">';
            classes.forEach(c => {
                const statusClass = c.status === 'ongoing' ? 'schedule-ongoing' : c.status === 'completed' ? 'schedule-done' : '';
                const safeSubject = Utils.esc(c.subject);
                const safeRoom = Utils.esc(c.room);
                const safeTeacher = Utils.esc(c.teacher);
                html += `
                    <div class="schedule-item ${statusClass}">
                        <div class="schedule-time">${Utils.esc(c.start_time)}</div>
                        <div class="schedule-info">
                            <div class="fw-semibold small">${safeSubject}</div>
                            <div class="text-muted" style="font-size:0.72rem">${safeRoom} ${safeTeacher ? '• ' + safeTeacher : ''}</div>
                        </div>
                        <div class="schedule-end">${Utils.esc(c.end_time)}</div>
                    </div>`;
            });
            html += '</div></div>';
        }

        // Tasks due today
        if (tasks.length > 0) {
            html += '<div><h6 class="small text-muted mb-2"><i class="bi bi-check2-square me-1"></i>Due Today</h6>';
            tasks.forEach(t => {
                const safeTitle = Utils.esc(t.title);
                html += `
                    <div class="d-flex align-items-center gap-2 mb-2 p-2 rounded bg-body-tertiary">
                        <i class="bi bi-circle text-${Utils.priorityColor(t.priority)}"></i>
                        <span class="small flex-grow-1">${safeTitle}</span>
                        <span class="badge bg-${Utils.priorityColor(t.priority)}-subtle text-${Utils.priorityColor(t.priority)}" style="font-size:0.65rem">${Utils.esc(t.priority)}</span>
                    </div>`;
            });
            html += '</div>';
        }

        container.innerHTML = html;
    },

    // --- Recent Activity Feed ---
    async loadRecentActivity() {
        const container = document.getElementById('recent-activity-content');
        try {
            const data = await API.get('/dashboard/recent-activity');
            const activities = data.activities || [];

            if (activities.length === 0) {
                container.innerHTML = '<p class="text-muted small text-center py-2">No recent activity</p>';
                return;
            }

            container.innerHTML = '<div class="activity-feed">' +
                activities.slice(0, 8).map(a => `
                    <div class="activity-item">
                        <div class="activity-icon bg-${Utils.esc(a.color)}-subtle text-${Utils.esc(a.color)}">
                            <i class="bi ${Utils.esc(a.icon)}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="small">${Utils.esc(a.title)}</div>
                            ${a.subtitle ? `<div class="text-muted" style="font-size:0.72rem">${Utils.esc(a.subtitle)}</div>` : ''}
                        </div>
                        <div class="text-muted" style="font-size:0.7rem;white-space:nowrap">${Utils.formatDate(a.timestamp)}</div>
                    </div>
                `).join('') + '</div>';
        } catch (e) {
            container.innerHTML = '<p class="text-muted small">Could not load activity feed</p>';
        }
    },

    // --- Helpers ---
    _getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    },
};

App.registerModule('dashboard', () => DashboardModule.render());
