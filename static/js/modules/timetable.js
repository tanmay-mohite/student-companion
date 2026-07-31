// Timetable Module - Enhanced v2.0

const TimetableModule = {
    entries: [],
    stats: null,
    viewMode: 'week', // 'week' or 'day'
    currentDay: new Date().getDay() || 7, // Convert 0 (Sunday) to 7
    attendanceSubjects: [], // attendance subjects, for linking timetable -> attendance
    todayAttendance: {},    // { attendanceSubjectId: status } for today

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-table"></i> Timetable</h3>
                <div class="d-flex gap-2">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary ${this.viewMode === 'week' ? 'active' : ''}" onclick="TimetableModule.setView('week')">Week</button>
                        <button class="btn btn-outline-primary ${this.viewMode === 'day' ? 'active' : ''}" onclick="TimetableModule.setView('day')">Today</button>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="TimetableModule.showEntryModal()">
                        <i class="bi bi-plus-lg"></i> Add Class
                    </button>
                </div>
            </div>
            <div id="timetable-info"></div>
            <div class="overflow-x-auto">
                <div id="timetable-grid">
                    <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>`;

        await Promise.all([this.loadEntries(), this.loadStats()]);
    },

    async loadStats() {
        try {
            this.stats = await API.get('/timetable/stats');
            this.renderInfo();
        } catch (e) {
            console.error('Failed to load timetable stats:', e);
        }
    },

    renderInfo() {
        const container = document.getElementById('timetable-info');
        if (!container || !this.stats) return;

        const s = this.stats;
        if (s.total_entries === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="tt-stats-bar">
                <div class="tt-stat-item">
                    <i class="bi bi-clock text-primary"></i>
                    <span><strong>${s.total_hours}</strong> hrs/week</span>
                </div>
                <div class="tt-stat-item">
                    <i class="bi bi-calendar-week text-success"></i>
                    <span><strong>${s.busiest_day || '--'}</strong> busiest</span>
                </div>
                <div class="tt-stat-item">
                    <i class="bi bi-book text-info"></i>
                    <span><strong>${s.subjects ? s.subjects.length : 0}</strong> subjects</span>
                </div>
                <div class="tt-stat-item">
                    <i class="bi bi-grid-3x3-gap text-warning"></i>
                    <span><strong>${s.total_entries}</strong> classes</span>
                </div>
            </div>`;
    },

    async loadEntries() {
        try {
            const data = await API.get('/timetable');
            this.entries = data.entries || [];
            if (this.viewMode === 'day') {
                await this.loadAttendanceData();
                this.renderDayView();
            } else {
                this.renderGrid();
            }
        } catch (e) {
            document.getElementById('timetable-grid').innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load timetable.
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="TimetableModule.loadEntries()">Retry</button>
                </div>`;
        }
    },

    // Load attendance subjects + today's marks so Today view can show P/A/L per class
    async loadAttendanceData() {
        const today = Utils.today();
        try {
            const [subs, recs] = await Promise.all([
                API.get('/attendance/subjects'),
                API.get(`/attendance/records?from_date=${today}&to_date=${today}`),
            ]);
            this.attendanceSubjects = subs.subjects || [];
            this.todayAttendance = {};
            (recs.records || []).forEach(r => { this.todayAttendance[r.subject_id] = r.status; });
        } catch (e) {
            this.attendanceSubjects = [];
            this.todayAttendance = {};
        }
    },

    setView(mode) {
        this.viewMode = mode;
        this.render();
    },

    renderDayView() {
        const container = document.getElementById('timetable-grid');
        const today = new Date().getDay() || 7;
        const todayEntries = this.entries.filter(e => e.day === today).sort((a, b) => a.start_time.localeCompare(b.start_time));

        const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][today - 1];

        if (todayEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-emoji-smile"></i>
                    <h5>No Classes Today!</h5>
                    <p>Enjoy your free day, ${dayName}.</p>
                </div>`;
            return;
        }

        // Get current time
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();

        let html = '<div class="tt-day-view">';
        html += `<h5 class="mb-3"><i class="bi bi-calendar-day"></i> ${dayName}'s Schedule</h5>`;

        todayEntries.forEach(entry => {
            const [sH, sM] = entry.start_time.split(':').map(Number);
            const [eH, eM] = entry.end_time.split(':').map(Number);
            const startMin = sH * 60 + sM;
            const endMin = eH * 60 + eM;
            const duration = endMin - startMin;

            let status = 'upcoming';
            let statusBadge = '<span class="badge bg-info">Upcoming</span>';
            if (currentMin >= startMin && currentMin < endMin) {
                status = 'ongoing';
                statusBadge = '<span class="badge bg-success">Now</span>';
            } else if (currentMin >= endMin) {
                status = 'completed';
                statusBadge = '<span class="badge bg-secondary">Done</span>';
            }

            const typeBadge = entry.type !== 'lecture' ? `<span class="badge bg-outline-${entry.type === 'lab' ? 'danger' : 'warning'} tt-type-badge">${entry.type}</span>` : '';

            // Link to attendance: find matching attendance subject (by name) and today's mark
            const attSub = this.attendanceSubjects.find(a => a.name.toLowerCase() === entry.subject.toLowerCase());
            const curStatus = attSub ? this.todayAttendance[attSub.id] : null;

            html += `
                <div class="tt-day-card ${status}" style="border-left: 4px solid ${entry.color}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${Utils.esc(entry.subject)} ${typeBadge}</h6>
                            <div class="text-muted small">
                                <i class="bi bi-clock"></i> ${this.formatTime(entry.start_time)} - ${this.formatTime(entry.end_time)}
                                ${entry.room ? `<span class="ms-2"><i class="bi bi-geo-alt"></i> ${Utils.esc(entry.room)}</span>` : ''}
                                ${entry.teacher ? `<span class="ms-2"><i class="bi bi-person"></i> ${Utils.esc(entry.teacher)}</span>` : ''}
                            </div>
                        </div>
                        <div class="text-end">
                            ${statusBadge}
                            <div class="mt-1">
                                <button class="btn btn-sm btn-link p-0 me-2" onclick="TimetableModule.showEntryModal('${entry.id}')" title="Edit">
                                    <i class="bi bi-pencil small"></i>
                                </button>
                                <button class="btn btn-sm btn-link text-danger p-0" onclick="TimetableModule.deleteEntry('${entry.id}')" title="Delete">
                                    <i class="bi bi-trash small"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="tt-att-row mt-2 pt-2 border-top d-flex align-items-center gap-2 flex-wrap">
                        <span class="small text-muted"><i class="bi bi-calendar-check"></i> Attendance:</span>
                        <div class="btn-group btn-group-sm">
                            <button class="btn ${curStatus === 'present' ? 'btn-success' : 'btn-outline-success'}" onclick="TimetableModule.markClassAttendance('${entry.id}', 'present')">P</button>
                            <button class="btn ${curStatus === 'absent' ? 'btn-danger' : 'btn-outline-danger'}" onclick="TimetableModule.markClassAttendance('${entry.id}', 'absent')">A</button>
                            <button class="btn ${curStatus === 'leave' ? 'btn-warning' : 'btn-outline-warning'}" onclick="TimetableModule.markClassAttendance('${entry.id}', 'leave')">L</button>
                        </div>
                        ${curStatus ? `<span class="small text-muted">Marked: <strong>${curStatus}</strong></span>` : ''}
                    </div>
                </div>`;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    renderGrid() {
        const container = document.getElementById('timetable-grid');

        if (this.entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-table"></i>
                    <h5>No Classes Added</h5>
                    <p>Start building your weekly timetable by adding your first class.</p>
                    <button class="btn btn-primary" onclick="TimetableModule.showEntryModal()">
                        <i class="bi bi-plus-lg"></i> Add Your First Class
                    </button>
                </div>`;
            return;
        }

        const timeSlots = [];
        for (let h = 8; h < 19; h++) {
            timeSlots.push(`${String(h).padStart(2, '0')}:00`);
            if (h < 18) {
                timeSlots.push(`${String(h).padStart(2, '0')}:30`);
            }
        }

        const days = [1, 2, 3, 4, 5, 6]; // Mon-Sat
        const today = new Date().getDay() || 7;

        let html = '<div class="timetable-grid">';
        // Header row
        html += '<div class="timetable-cell header">Time</div>';
        days.forEach(d => {
            const isToday = d === today;
            html += `<div class="timetable-cell header ${isToday ? 'today-header' : ''}">${this.getDayName(d)}${isToday ? ' <span class="badge bg-primary">Today</span>' : ''}</div>`;
        });

        // Time rows
        timeSlots.forEach(time => {
            const isHalf = time.endsWith(':30');
            html += `<div class="timetable-cell time-label${isHalf ? ' time-label-half' : ''}">${isHalf ? '' : this.formatTime(time)}</div>`;
            days.forEach(day => {
                const [slotH, slotM] = time.split(':').map(Number);
                const slotMin = slotH * 60 + slotM;

                // Match entries whose start time falls within this 30-min slot
                const entry = this.entries.find(e => {
                    if (e.day !== day) return false;
                    const [sH, sM] = e.start_time.split(':').map(Number);
                    const startMin = sH * 60 + sM;
                    return startMin >= slotMin && startMin < slotMin + 30;
                });

                if (entry) {
                    const [sH, sM] = entry.start_time.split(':').map(Number);
                    const [eH, eM] = entry.end_time.split(':').map(Number);
                    const startMin = sH * 60 + sM;
                    const endMin = eH * 60 + eM;
                    const span = Math.max(1, Math.ceil((endMin - slotMin) / 30));
                    const isCurrent = this.isCurrentClass(entry);
                    const typeClass = entry.type !== 'lecture' ? `tt-type-${entry.type}` : '';

                    html += `<div class="timetable-cell tt-class ${isCurrent ? 'current-class' : ''} ${typeClass}" 
                                style="background:${entry.color};grid-row:span ${span}" 
                                onclick="TimetableModule.showEntryModal('${entry.id}')" 
                                title="${Utils.esc(entry.subject)} - ${Utils.esc(entry.teacher || '')}">
                        <strong>${Utils.esc(entry.subject)}</strong>
                        <small>${Utils.esc(entry.room || '')}</small>
                        ${entry.type !== 'lecture' ? `<span class="tt-type-label">${entry.type}</span>` : ''}
                    </div>`;
                } else {
                    // Check if this slot is covered by another entry
                    const covering = this.entries.find(e => {
                        if (e.day !== day) return false;
                        const [sH, sM] = e.start_time.split(':').map(Number);
                        const [eH, eM] = e.end_time.split(':').map(Number);
                        const startMin = sH * 60 + sM;
                        const endMin = eH * 60 + eM;
                        return slotMin >= startMin && slotMin < endMin;
                    });
                    if (!covering) {
                        html += `<div class="timetable-cell tt-empty" onclick="TimetableModule.showEntryModal(null, ${day}, '${time}')"></div>`;
                    }
                }
            });
        });

        html += '</div>';
        container.innerHTML = html;
    },

    getDayName(day) {
        const names = {1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'};
        return names[day] || '';
    },

    formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    },

    isCurrentClass(entry) {
        const now = new Date();
        const currentDay = now.getDay() || 7;
        if (entry.day !== currentDay) return false;
        const [sH, sM] = entry.start_time.split(':').map(Number);
        const [eH, eM] = entry.end_time.split(':').map(Number);
        const start = sH * 60 + sM;
        const end = eH * 60 + eM;
        const current = now.getHours() * 60 + now.getMinutes();
        return current >= start && current < end;
    },

    showEntryModal(entryId = null, presetDay = null, presetTime = null) {
        const entry = entryId ? this.entries.find(e => e.id === entryId) : null;
        const isEdit = !!entry;
        const modalId = 'timetable-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const days = [1, 2, 3, 4, 5, 6, 7];
        const dayOptions = days.map(d => `<option value="${d}" ${(entry?.day === d || presetDay === d) ? 'selected' : ''}>${this.getDayName(d)}</option>`).join('');

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-${isEdit ? 'pencil' : 'plus-circle'}"></i> ${isEdit ? 'Edit' : 'Add'} Class</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="timetable-form">
                            <div class="mb-3">
                                <label class="form-label">Subject *</label>
                                <input type="text" class="form-control" name="subject" value="${Utils.esc(entry?.subject || '')}" required maxlength="100" placeholder="e.g., Mathematics">
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="form-label">Day *</label>
                                    <select class="form-select" name="day" required>${dayOptions}</select>
                                </div>
                                <div class="col-6">
                                    <label class="form-label">Type</label>
                                    <select class="form-select" name="type">
                                        <option value="lecture" ${entry?.type === 'lecture' ? 'selected' : ''}>Lecture</option>
                                        <option value="lab" ${entry?.type === 'lab' ? 'selected' : ''}>Lab</option>
                                        <option value="tutorial" ${entry?.type === 'tutorial' ? 'selected' : ''}>Tutorial</option>
                                        <option value="other" ${entry?.type === 'other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="form-label">Start Time *</label>
                                    <input type="time" class="form-control" name="start_time" value="${entry?.start_time || presetTime || '09:00'}" required>
                                </div>
                                <div class="col-6">
                                    <label class="form-label">End Time *</label>
                                    <input type="time" class="form-control" name="end_time" value="${entry?.end_time || '10:00'}" required>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="form-label">Room</label>
                                    <input type="text" class="form-control" name="room" value="${Utils.esc(entry?.room || '')}" maxlength="50" placeholder="e.g., Room 101">
                                </div>
                                <div class="col-6">
                                    <label class="form-label">Color</label>
                                    <input type="color" class="form-control form-control-color" name="color" value="${entry?.color || '#4A90D9'}">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Teacher</label>
                                <input type="text" class="form-control" name="teacher" value="${Utils.esc(entry?.teacher || '')}" maxlength="100" placeholder="e.g., Dr. Smith">
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-${isEdit ? 'check' : 'plus-lg'}"></i> ${isEdit ? 'Update' : 'Add'} Class
                            </button>
                            ${isEdit ? `<button type="button" class="btn btn-outline-danger w-100 mt-2" onclick="TimetableModule.deleteEntry('${entryId}')"><i class="bi bi-trash"></i> Delete</button>` : ''}
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('timetable-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.day = parseInt(data.day);
            try {
                if (isEdit) {
                    await API.put(`/timetable/${entryId}`, data);
                } else {
                    await API.post('/timetable', data);
                }
                modal.hide();
                this.loadEntries();
                this.loadStats();
                Utils.showToast(isEdit ? 'Class updated' : 'Class added', 'success');
            } catch (err) {
                Utils.showToast(err.message || 'Failed to save', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async deleteEntry(entryId) {
        const confirmed = await Utils.confirm('Delete', 'Remove this class from timetable?');
        if (!confirmed) return;
        try {
            await API.delete(`/timetable/${entryId}`);
            const modal = document.getElementById('timetable-modal');
            if (modal) bootstrap.Modal.getInstance(modal)?.hide();
            this.loadEntries();
            this.loadStats();
            Utils.showToast('Class removed', 'success');
        } catch (e) {
            Utils.showToast('Failed to delete', 'error');
        }
    },

    // Mark attendance for a scheduled class (links timetable subject -> attendance subject)
    async markClassAttendance(entryId, status) {
        const entry = this.entries.find(e => e.id === entryId);
        if (!entry) return;
        const name = entry.subject;
        try {
            // Find matching attendance subject by name, or create it on first mark
            let attSub = this.attendanceSubjects.find(a => a.name.toLowerCase() === name.toLowerCase());
            if (!attSub) {
                const res = await API.post('/attendance/subjects', { name });
                attSub = res.subject;
                this.attendanceSubjects.push(attSub);
            }
            await API.post('/attendance/records', {
                subject_id: attSub.id,
                date: Utils.today(),
                status,
            });
            this.todayAttendance[attSub.id] = status;
            Utils.showToast(`Marked ${status} for ${name}`, 'success');
            this.renderDayView();
        } catch (e) {
            Utils.showToast(e.message || 'Failed to mark attendance', 'error');
        }
    },
};

App.registerModule('timetable', () => TimetableModule.render());
