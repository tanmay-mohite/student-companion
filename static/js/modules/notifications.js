// Notifications & Reminders Module - Enhanced v2.0

const NotificationsModule = {
    notifications: [],
    reminders: [],
    settings: {},
    unreadCount: 0,
    filter: { type: '', unread: false },

    async renderPage() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-bell"></i> Notifications & Reminders</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-secondary btn-sm" onclick="NotificationsModule.showSettings()">
                        <i class="bi bi-gear"></i> Settings
                    </button>
                </div>
            </div>
            <div id="notif-dashboard">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
            </div>`;

        await Promise.all([this.loadAll(), this.loadSettings()]);
    },

    async loadSettings() {
        try {
            const data = await API.get('/notifications/settings');
            this.settings = data.settings || {};
        } catch (e) { /* ignore */ }
    },

    async loadAll() {
        try {
            const [notifData, reminderData] = await Promise.all([
                API.get('/notifications'),
                API.get('/notifications/reminders'),
            ]);
            this.notifications = notifData.notifications || [];
            this.unreadCount = notifData.unread_count || 0;
            this.reminders = reminderData.reminders || [];
            this.renderDashboard();
            App.loadNotifBell();
        } catch (e) {
            document.getElementById('notif-dashboard').innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load.
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="NotificationsModule.loadAll()">Retry</button>
                </div>`;
        }
    },

    renderDashboard() {
        const container = document.getElementById('notif-dashboard');

        let html = `
            <div class="row g-3">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <h5 class="mb-0">Notifications</h5>
                                ${this.unreadCount > 0 ? `<span class="badge bg-danger">${this.unreadCount}</span>` : ''}
                            </div>
                            <div class="d-flex gap-2">
                                <select class="form-select form-select-sm" style="width:auto" onchange="NotificationsModule.setFilter('type', this.value)">
                                    <option value="">All Types</option>
                                    <option value="task">Tasks</option>
                                    <option value="exam">Exams</option>
                                    <option value="attendance">Attendance</option>
                                    <option value="budget">Budget</option>
                                    <option value="timetable">Timetable</option>
                                    <option value="system">System</option>
                                </select>
                                ${this.unreadCount > 0 ? `
                                    <button class="btn btn-sm btn-outline-primary" onclick="NotificationsModule.markAllRead()">
                                        <i class="bi bi-check2-all"></i> Mark All Read
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="card-body" id="notif-page-list"></div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-alarm"></i> Reminders</h5>
                            <button class="btn btn-sm btn-primary" onclick="NotificationsModule.showReminderModal()">
                                <i class="bi bi-plus"></i> Add
                            </button>
                        </div>
                        <div class="card-body" id="reminders-list"></div>
                    </div>
                </div>
            </div>`;

        container.innerHTML = html;
        this.renderNotifications();
        this.renderReminders();
    },

    renderNotifications() {
        const container = document.getElementById('notif-page-list');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-4">
                    <i class="bi bi-bell-slash"></i>
                    <p>No notifications yet.</p>
                </div>`;
            return;
        }

        const typeIcons = {
            task: { icon: 'bi-list-check', color: 'primary' },
            exam: { icon: 'bi-journal-bookmark', color: 'warning' },
            attendance: { icon: 'bi-calendar-check', color: 'success' },
            budget: { icon: 'bi-exclamation-triangle', color: 'danger' },
            timetable: { icon: 'bi-clock', color: 'info' },
            system: { icon: 'bi-gear', color: 'secondary' },
            reminder: { icon: 'bi-alarm', color: 'primary' },
        };

        container.innerHTML = this.notifications.map(n => {
            const typeInfo = typeIcons[n.type] || typeIcons.system;
            return `
                <div class="notif-item ${n.read ? '' : 'notif-unread'}">
                    <div class="notif-icon bg-${typeInfo.color} bg-opacity-10 text-${typeInfo.color}">
                        <i class="bi ${typeInfo.icon}"></i>
                    </div>
                    <div class="notif-content flex-grow-1">
                        <div class="d-flex justify-content-between">
                            <strong class="${n.read ? '' : 'fw-bold'}">${Utils.esc(n.title)}</strong>
                            <div class="d-flex gap-1">
                                ${!n.read ? `<button class="btn btn-sm btn-link p-0" onclick="NotificationsModule.markRead('${n.id}')" title="Mark read"><i class="bi bi-check2"></i></button>` : ''}
                                <button class="btn btn-sm btn-link text-danger p-0" onclick="NotificationsModule.deleteNotification('${n.id}')" title="Delete"><i class="bi bi-x"></i></button>
                            </div>
                        </div>
                        <div class="text-muted small">${Utils.esc(n.message)}</div>
                        <div class="notif-time text-muted">${Utils.timeAgo(n.created_at)}</div>
                    </div>
                </div>`;
        }).join('');
    },

    renderReminders() {
        const container = document.getElementById('reminders-list');
        if (!container) return;

        if (this.reminders.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-3">
                    <i class="bi bi-alarm"></i>
                    <p class="small">No reminders yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = this.reminders.map(r => {
            const priorityClass = r.priority === 'high' ? 'danger' : r.priority === 'medium' ? 'warning' : 'info';
            return `
                <div class="reminder-item ${r.completed ? 'reminder-done' : ''}">
                    <div class="form-check flex-grow-1">
                        <input class="form-check-input" type="checkbox" ${r.completed ? 'checked' : ''} 
                               onchange="NotificationsModule.toggleReminder('${r.id}')" id="rem-${r.id}">
                        <label class="form-check-label" for="rem-${r.id}">
                            <strong>${Utils.esc(r.title)}</strong>
                            <span class="badge bg-${priorityClass} ms-1">${r.priority || 'medium'}</span>
                            ${r.description ? `<div class="text-muted small">${Utils.esc(r.description)}</div>` : ''}
                            ${r.date ? `<div class="text-muted small"><i class="bi bi-calendar"></i> ${Utils.timeAgo(r.date)}</div>` : ''}
                        </label>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="NotificationsModule.deleteReminder('${r.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>`;
        }).join('');
    },

    setFilter(key, value) {
        this.filter[key] = value;
        this.loadFiltered();
    },

    async loadFiltered() {
        try {
            let url = '/notifications?';
            if (this.filter.type) url += `type=${this.filter.type}&`;
            const data = await API.get(url);
            this.notifications = data.notifications || [];
            this.renderNotifications();
        } catch (e) {
            Utils.showToast('Failed to filter', 'error');
        }
    },

    async markRead(notifId) {
        try {
            await API.put(`/notifications/${notifId}/read`);
            this.loadAll();
        } catch (e) { /* ignore */ }
    },

    async markAllRead() {
        try {
            await API.put('/notifications/mark-all-read');
            this.loadAll();
            Utils.showToast('All marked as read', 'success');
        } catch (e) {
            Utils.showToast('Failed', 'error');
        }
    },

    async deleteNotification(notifId) {
        try {
            await API.delete(`/notifications/${notifId}`);
            this.loadAll();
        } catch (e) {
            Utils.showToast('Failed to delete', 'error');
        }
    },

    async toggleReminder(reminderId) {
        try {
            const reminder = this.reminders.find(r => r.id === reminderId);
            if (reminder) {
                await API.put(`/notifications/reminders/${reminderId}`, { completed: !reminder.completed });
                this.loadAll();
            }
        } catch (e) {
            Utils.showToast('Failed to update', 'error');
        }
    },

    showReminderModal() {
        const modalId = 'reminder-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-alarm"></i> Add Reminder</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="reminder-form">
                            <div class="mb-3">
                                <label class="form-label">Title *</label>
                                <input type="text" class="form-control" name="title" required maxlength="200" placeholder="What to remember?">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea class="form-control" name="description" rows="2" maxlength="1000" placeholder="Details..."></textarea>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="form-label">Date</label>
                                    <input type="date" class="form-control" name="date" value="${Utils.today()}">
                                </div>
                                <div class="col-6">
                                    <label class="form-label">Priority</label>
                                    <select class="form-select" name="priority">
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-alarm"></i> Add Reminder
                            </button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('reminder-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.post('/notifications/reminders', data);
                modal.hide();
                this.loadAll();
                Utils.showToast('Reminder added', 'success');
            } catch (err) {
                Utils.showToast(err.message || 'Failed', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async deleteReminder(reminderId) {
        const confirmed = await Utils.confirm('Delete', 'Delete this reminder?');
        if (!confirmed) return;
        try {
            await API.delete(`/notifications/reminders/${reminderId}`);
            this.loadAll();
            Utils.showToast('Reminder deleted', 'success');
        } catch (e) {
            Utils.showToast('Failed', 'error');
        }
    },

    showSettings() {
        const modalId = 'notif-settings-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const s = this.settings;
        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-gear"></i> Notification Settings</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted small">Choose which notifications you want to receive.</p>
                        <form id="notif-settings-form">
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="tasks" ${s.tasks !== false ? 'checked' : ''} id="set-tasks">
                                <label class="form-check-label" for="set-tasks"><i class="bi bi-list-check"></i> Task Reminders</label>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="exams" ${s.exams !== false ? 'checked' : ''} id="set-exams">
                                <label class="form-check-label" for="set-exams"><i class="bi bi-journal-bookmark"></i> Exam Alerts</label>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="attendance" ${s.attendance !== false ? 'checked' : ''} id="set-attendance">
                                <label class="form-check-label" for="set-attendance"><i class="bi bi-calendar-check"></i> Attendance Alerts</label>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="budget" ${s.budget !== false ? 'checked' : ''} id="set-budget">
                                <label class="form-check-label" for="set-budget"><i class="bi bi-wallet2"></i> Budget Warnings</label>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="timetable" ${s.timetable !== false ? 'checked' : ''} id="set-timetable">
                                <label class="form-check-label" for="set-timetable"><i class="bi bi-clock"></i> Timetable Changes</label>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" name="system" ${s.system !== false ? 'checked' : ''} id="set-system">
                                <label class="form-check-label" for="set-system"><i class="bi bi-gear"></i> System Notifications</label>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Save Settings</button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('notif-settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            // Convert to boolean
            const settings = {};
            for (const key of ['tasks', 'exams', 'attendance', 'budget', 'timetable', 'system']) {
                settings[key] = data[key] === 'on' || data[key] === true;
            }
            try {
                await API.put('/notifications/settings', settings);
                modal.hide();
                this.loadSettings();
                Utils.showToast('Settings saved', 'success');
            } catch (err) {
                Utils.showToast(err.message || 'Failed', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },
};

App.registerModule('notifications', () => NotificationsModule.renderPage());
