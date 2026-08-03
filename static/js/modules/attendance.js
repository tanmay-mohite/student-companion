// Attendance Module

const AttendanceModule = {
    subjects: [],
    stats: null,
    predictions: [],
    calendarData: {},
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth() + 1,

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-calendar-check"></i> Attendance Tracker</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary btn-sm" onclick="AttendanceModule.showSubjectModal()"><i class="bi bi-plus-lg"></i> Subject</button>
                    <button class="btn btn-outline-success btn-sm" onclick="AttendanceModule.showBulkModal()"><i class="bi bi-check-all"></i> Bulk Mark</button>
                    <button class="btn btn-outline-info btn-sm" onclick="AttendanceModule.exportPDF()"><i class="bi bi-file-pdf"></i> PDF</button>
                </div>
            </div>

            <!-- Overall Stats Banner -->
            <div id="att-overall-banner" class="mb-3"></div>

            <!-- Main Content -->
            <div id="att-loading" class="text-center py-4"><div class="spinner-border text-primary"></div></div>
            <div id="att-content" class="d-none">
                <div class="row g-3 mb-4">
                    <!-- Mark Attendance -->
                    <div class="col-lg-7">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title"><i class="bi bi-pencil-square text-primary me-2"></i>Mark Attendance</h5>
                                <div id="mark-attendance-form"></div>
                            </div>
                        </div>
                    </div>
                    <!-- Subject-wise Stats -->
                    <div class="col-lg-5">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title"><i class="bi bi-bar-chart text-info me-2"></i>Subject Stats</h5>
                                <div id="attendance-stats"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Smart Predictions -->
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-lightbulb text-warning me-2"></i>Smart Predictions</h5>
                        <div id="attendance-predictions" class="row g-2"></div>
                    </div>
                </div>

                <!-- Calendar Heatmap -->
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="card-title mb-0"><i class="bi bi-calendar3 text-success me-2"></i>Calendar Heatmap</h5>
                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-sm btn-outline-secondary" onclick="AttendanceModule.prevMonth()"><i class="bi bi-chevron-left"></i></button>
                                <span id="cal-month-label" class="fw-bold"></span>
                                <button class="btn btn-sm btn-outline-secondary" onclick="AttendanceModule.nextMonth()"><i class="bi bi-chevron-right"></i></button>
                            </div>
                        </div>
                        <div class="cal-legend d-flex gap-2 mb-2 flex-wrap">
                            <span class="cal-legend-item"><span class="calendar-day empty" style="width:16px;height:16px;min-width:16px;font-size:0"></span> No data</span>
                            <span class="cal-legend-item"><span class="calendar-day low" style="width:16px;height:16px;min-width:16px;font-size:0"></span> &lt;50%</span>
                            <span class="cal-legend-item"><span class="calendar-day medium" style="width:16px;height:16px;min-width:16px;font-size:0"></span> 50-74%</span>
                            <span class="cal-legend-item"><span class="calendar-day good" style="width:16px;height:16px;min-width:16px;font-size:0"></span> 75-89%</span>
                            <span class="cal-legend-item"><span class="calendar-day excellent" style="width:16px;height:16px;min-width:16px;font-size:0"></span> 90%+</span>
                        </div>
                        <div id="calendar-heatmap"></div>
                    </div>
                </div>
            </div>`;

        await this.loadAll();
    },

    async loadAll() {
        try {
            const [subs, stats, preds] = await Promise.all([
                API.get('/attendance/subjects'),
                API.get('/attendance/stats'),
                API.get('/attendance/predictions'),
            ]);
            this.subjects = subs.subjects || [];
            this.stats = stats;
            this.predictions = preds.predictions || [];

            document.getElementById('att-loading').classList.add('d-none');
            document.getElementById('att-content').classList.remove('d-none');

            this.renderOverallBanner();
            this.renderMarkForm();
            this.renderStats();
            this.renderPredictions();
            this.loadCalendar();
        } catch (e) {
            document.getElementById('att-loading').innerHTML = `
                <div class="text-danger"><i class="bi bi-exclamation-triangle"></i> Failed to load attendance data</div>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="AttendanceModule.loadAll()">Retry</button>`;
        }
    },

    // --- Overall Stats Banner ---
    renderOverallBanner() {
        const s = this.stats;
        if (!s) return;
        const container = document.getElementById('att-overall-banner');
        const color = s.overall_status === 'green' ? 'success' : s.overall_status === 'yellow' ? 'warning' : 'danger';
        const safeName = Utils.esc(App.currentUser?.name || 'Student');

        container.innerHTML = `
            <div class="att-banner att-banner-${color}">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                        <h4 class="mb-0">${safeName}, your attendance is</h4>
                        <small class="opacity-75">${s.subject_count || 0} subjects &middot; ${s.total_classes || 0} total classes recorded</small>
                    </div>
                    <div class="text-center">
                        <div class="display-4 fw-bold">${s.overall_percentage}%</div>
                        <small>${s.total_present || 0} present / ${s.total_absent || 0} absent / ${s.total_leave || 0} leave</small>
                    </div>
                    <div class="text-center">
                        <div class="fs-5 fw-bold">${s.target || 75}%</div>
                        <small class="opacity-75">Target</small>
                    </div>
                </div>
            </div>`;
    },

    // --- Mark Attendance Form ---
    renderMarkForm() {
        const container = document.getElementById('mark-attendance-form');
        if (this.subjects.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-journal-plus display-4 text-muted"></i>
                    <p class="text-muted mt-2">No subjects yet</p>
                    <button class="btn btn-primary btn-sm" onclick="AttendanceModule.showSubjectModal()"><i class="bi bi-plus-lg"></i> Add Subject</button>
                </div>`;
            return;
        }
        container.innerHTML = `
            <div class="mb-3">
                <label class="form-label small text-muted">Date</label>
                <input type="date" class="form-control form-control-sm" id="att-date" value="${Utils.today()}" style="max-width:200px">
            </div>
            <div id="att-subject-list">
                ${this.subjects.map(s => {
            const safeName = Utils.esc(s.name);
            return `
                    <div class="att-mark-row">
                        <span class="fw-semibold small flex-grow-1">${safeName}</span>
                        <div class="btn-group btn-group-sm" data-subject="${Utils.esc(s.id)}">
                            <input type="radio" class="btn-check" name="att-${Utils.esc(s.id)}" id="att-pres-${Utils.esc(s.id)}" value="present" checked>
                            <label class="btn btn-outline-success" for="att-pres-${Utils.esc(s.id)}">P</label>
                            <input type="radio" class="btn-check" name="att-${Utils.esc(s.id)}" id="att-abs-${Utils.esc(s.id)}" value="absent">
                            <label class="btn btn-outline-danger" for="att-abs-${Utils.esc(s.id)}">A</label>
                            <input type="radio" class="btn-check" name="att-${Utils.esc(s.id)}" id="att-leave-${Utils.esc(s.id)}" value="leave">
                            <label class="btn btn-outline-warning" for="att-leave-${Utils.esc(s.id)}">L</label>
                        </div>
                        <button class="btn btn-sm btn-link text-danger" onclick="AttendanceModule.deleteSubject('${Utils.esc(s.id)}', '${safeName}')" title="Delete"><i class="bi bi-trash"></i></button>
                    </div>`;
        }).join('')}
            </div>
            <button class="btn btn-primary btn-sm mt-3" onclick="AttendanceModule.markAttendance()"><i class="bi bi-check-lg me-1"></i>Mark Attendance</button>`;
    },

    async markAttendance() {
        const date = document.getElementById('att-date').value;
        if (!date) { Utils.showToast('Select a date', 'warning'); return; }
        const records = this.subjects.map(s => {
            const radio = document.querySelector(`input[name="att-${s.id}"]:checked`);
            return { subject_id: s.id, status: radio ? radio.value : 'present' };
        });
        try {
            await API.post('/attendance/bulk', { date, records });
            Utils.showToast('Attendance marked', 'success');
            document.dispatchEvent(new CustomEvent('dashboard:refresh'));
            this.loadAll();
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    // --- Subject Stats ---
    renderStats() {
        const container = document.getElementById('attendance-stats');
        const subjects = this.stats?.subjects || [];
        if (subjects.length === 0) {
            container.innerHTML = '<p class="text-muted small text-center py-3">No attendance data yet. Mark attendance to see stats.</p>';
            return;
        }
        container.innerHTML = subjects.map(s => {
            const safeName = Utils.esc(s.subject_name);
            const barColor = s.status === 'green' ? 'success' : s.status === 'yellow' ? 'warning' : 'danger';
            let advice = '';
            if (s.classes_needed > 0) {
                advice = `<span class="text-danger" style="font-size:0.7rem">Need ${s.classes_needed} more classes</span>`;
            } else if (s.classes_can_skip > 0) {
                advice = `<span class="text-success" style="font-size:0.7rem">Can skip ${s.classes_can_skip}</span>`;
            }
            return `
                <div class="att-stat-row">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small fw-semibold">${safeName}</span>
                        <span class="fw-bold text-${barColor}">${s.percentage}%</span>
                    </div>
                    <div class="progress progress-thin mb-1">
                        <div class="progress-bar bg-${barColor}" style="width:${s.percentage}%;transition:width 0.8s ease"></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${s.present}/${s.total} present</small>
                        ${advice}
                    </div>
                </div>`;
        }).join('');
    },

    // --- Predictions ---
    renderPredictions() {
        const container = document.getElementById('attendance-predictions');
        if (this.predictions.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted small">Add subjects and mark attendance to see predictions.</p></div>';
            return;
        }
        container.innerHTML = this.predictions.map(p => {
            const safeName = Utils.esc(p.subject_name);
            const safeAdvice = Utils.esc(p.advice);
            const iconMap = { danger: 'bi-exclamation-triangle-fill', warning: 'bi-exclamation-circle-fill', success: 'bi-check-circle-fill', info: 'bi-info-circle-fill' };
            const icon = iconMap[p.urgency] || 'bi-info-circle-fill';
            return `
                <div class="col-md-6 col-lg-4">
                    <div class="att-pred-card att-pred-${p.urgency}">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <i class="bi ${icon}"></i>
                            <span class="fw-semibold small">${safeName}</span>
                            <span class="ms-auto fw-bold">${p.percentage}%</span>
                        </div>
                        <p class="mb-0 small opacity-75">${safeAdvice}</p>
                    </div>
                </div>`;
        }).join('');
    },

    // --- Calendar ---
    async loadCalendar() {
        try {
            const data = await API.get(`/attendance/calendar?year=${this.calYear}&month=${this.calMonth}`);
            this.calendarData = data.calendar || {};
            this.renderCalendar();
        } catch (e) { /* ignore */ }
    },

    renderCalendar() {
        document.getElementById('cal-month-label').textContent =
            new Date(this.calYear, this.calMonth - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

        const container = document.getElementById('calendar-heatmap');
        const firstDay = new Date(this.calYear, this.calMonth - 1, 1).getDay();
        const daysInMonth = new Date(this.calYear, this.calMonth, 0).getDate();

        let html = '<div class="d-flex gap-1 mb-2">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
            html += `<div class="cal-header">${d}</div>`;
        });
        html += '</div><div class="calendar-heatmap-grid">';

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.calYear}-${String(this.calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const pct = this.calendarData[dateStr];
            let cls = 'empty';
            if (pct !== undefined) {
                if (pct >= 90) cls = 'excellent';
                else if (pct >= 75) cls = 'good';
                else if (pct >= 50) cls = 'medium';
                else cls = 'low';
            }
            html += `<div class="calendar-day ${cls}" title="${dateStr}: ${pct !== undefined ? pct + '%' : 'No data'}">${d}</div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    prevMonth() {
        if (this.calMonth === 1) { this.calMonth = 12; this.calYear--; }
        else this.calMonth--;
        this.loadCalendar();
    },

    nextMonth() {
        if (this.calMonth === 12) { this.calMonth = 1; this.calYear++; }
        else this.calMonth++;
        this.loadCalendar();
    },

    // --- Modals ---
    showSubjectModal() {
        const modalId = 'subject-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-sm"><div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Add Subject</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <form id="subject-form">
                            <div class="mb-3"><label class="form-label">Subject Name</label><input type="text" class="form-control" name="name" required maxlength="100"></div>
                            <div class="mb-3"><label class="form-label">Credit Hours</label><input type="number" class="form-control" name="credit_hours" value="3" min="0" max="10"></div>
                            <button type="submit" class="btn btn-primary w-100">Add Subject</button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('subject-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.post('/attendance/subjects', data);
                modal.hide();
                this.loadAll();
                Utils.showToast('Subject added', 'success');
                document.dispatchEvent(new CustomEvent('dashboard:refresh'));
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    showBulkModal() {
        if (this.subjects.length === 0) { Utils.showToast('Add subjects first', 'warning'); return; }
        const modalId = 'bulk-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-sm"><div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Bulk Mark Attendance</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <form id="bulk-form">
                            <div class="mb-3"><label class="form-label">Date</label><input type="date" class="form-control" name="date" value="${Utils.today()}" required></div>
                            <div class="mb-3"><label class="form-label">Status for all subjects</label>
                                <select class="form-select" name="status">
                                    <option value="present">Present</option><option value="absent">Absent</option><option value="leave">Leave</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Mark All</button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('bulk-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const records = this.subjects.map(s => ({ subject_id: s.id, status: data.status }));
            try {
                await API.post('/attendance/bulk', { date: data.date, records });
                modal.hide();
                this.loadAll();
                Utils.showToast('Bulk attendance marked', 'success');
                document.dispatchEvent(new CustomEvent('dashboard:refresh'));
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async deleteSubject(subjectId, subjectName) {
        const confirmed = await Utils.confirm('Delete Subject', `Delete "${subjectName}" and all its attendance records?`);
        if (!confirmed) return;
        try {
            await API.delete(`/attendance/subjects/${subjectId}`);
            Utils.showToast(`"${subjectName}" deleted`, 'success');
            this.loadAll();
        } catch (e) {
            Utils.showToast(e.message || 'Failed to delete subject', 'error');
        }
    },

    async exportPDF() {
        try {
            const stats = this.stats || await API.get('/attendance/stats');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('Attendance Report', 14, 20);
            doc.setFontSize(12);
            doc.text(`Date: ${Utils.today()}`, 14, 30);
            doc.text(`Student: ${App.currentUser?.name || 'N/A'}`, 14, 38);
            doc.text(`Overall: ${stats.overall_percentage}%`, 14, 46);

            let y = 60;
            (stats.subjects || []).forEach(s => {
                doc.setFontSize(11);
                doc.text(`${s.subject_name}: ${s.percentage}% (${s.present}/${s.total})`, 14, y);
                y += 8;
                if (y > 270) { doc.addPage(); y = 20; }
            });
            doc.save('attendance-report.pdf');
            Utils.showToast('PDF downloaded', 'success');
        } catch (e) {
            Utils.showToast('Failed to generate PDF', 'error');
        }
    },
};

App.registerModule('attendance', () => AttendanceModule.render());
