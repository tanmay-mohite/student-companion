// GPA/CGPA Calculator Module - Enhanced v2.0

const GPAModule = {
    semesters: [],
    stats: null,
    cgpa: 0,
    totalCredits: 0,
    scale: '10',

    GRADE_OPTIONS_10: ['O', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    GRADE_OPTIONS_4: ['O', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-calculator"></i> GPA / CGPA Calculator</h3>
                <div class="d-flex gap-2">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary ${this.scale === '10' ? 'active' : ''}" onclick="GPAModule.setScale('10')">10-Point</button>
                        <button class="btn btn-outline-primary ${this.scale === '4' ? 'active' : ''}" onclick="GPAModule.setScale('4')">4-Point</button>
                    </div>
                    <button class="btn btn-outline-info btn-sm" onclick="GPAModule.showCalculator()">
                        <i class="bi bi-calculator"></i> Quick Calc
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="GPAModule.showSemesterModal()">
                        <i class="bi bi-plus-lg"></i> Add Semester
                    </button>
                </div>
            </div>
            <div id="gpa-dashboard">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
            </div>`;

        await Promise.all([this.loadSemesters(), this.loadStats()]);
    },

    setScale(scale) {
        this.scale = scale;
        this.render();
    },

    async loadStats() {
        try {
            this.stats = await API.get('/gpa/stats');
        } catch (e) {
            console.error('Failed to load GPA stats:', e);
        }
    },

    async loadSemesters() {
        try {
            const data = await API.get('/gpa/semesters');
            this.semesters = data.semesters || [];
            this.cgpa = data.cgpa || 0;
            this.totalCredits = data.total_credits || 0;
            this.renderDashboard();
        } catch (e) {
            document.getElementById('gpa-dashboard').innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load GPA data.
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="GPAModule.loadSemesters()">Retry</button>
                </div>`;
        }
    },

    renderDashboard() {
        const container = document.getElementById('gpa-dashboard');
        const s = this.stats;

        if (this.semesters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calculator"></i>
                    <h5>No Semesters Added</h5>
                    <p>Start tracking your academic performance by adding your first semester.</p>
                    <button class="btn btn-primary" onclick="GPAModule.showSemesterModal()">
                        <i class="bi bi-plus-lg"></i> Add Your First Semester
                    </button>
                </div>`;
            return;
        }

        const maxScale = this.scale === '10' ? 10 : 4;
        const cgpaPercent = (this.cgpa / maxScale) * 100;
        const trend = s?.trend || [];
        const improving = s?.improving;
        const improvingIcon = improving === true ? 'bi-graph-up text-success' : improving === false ? 'bi-graph-down text-danger' : 'bi-dash text-muted';
        const improvingText = improving === true ? 'Improving!' : improving === false ? 'Declining' : 'Stable';
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const ringStroke = isDark ? 'rgba(var(--bs-primary-rgb), 0.2)' : 'rgba(255,255,255,0.2)';
        const ringFill = isDark ? 'var(--bs-primary)' : '#fff';

        let html = `
            <div class="gpa-overview-banner">
                <div class="row align-items-center g-4">
                    <div class="col-md-4 text-center">
                        <div class="gpa-ring" style="--progress: ${cgpaPercent}%">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="${ringStroke}" stroke-width="8"/>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="${ringFill}" stroke-width="8" 
                                    stroke-dasharray="${2 * Math.PI * 45}" 
                                    stroke-dashoffset="${2 * Math.PI * 45 * (1 - cgpaPercent / 100)}"
                                    transform="rotate(-90 50 50)"/>
                            </svg>
                            <div class="gpa-ring-value">
                                <span class="gpa-value-lg">${this.cgpa}</span>
                                <span class="gpa-scale">/${maxScale}</span>
                            </div>
                        </div>
                        <div class="mt-2 ${isDark ? 'text-muted' : 'text-white-50'} small">CGPA across ${this.semesters.length} semesters</div>
                    </div>
                    <div class="col-md-8">
                        <div class="row g-3">
                            <div class="col-6 col-lg-3">
                                <div class="gpa-stat-card">
                                    <i class="bi bi-book text-info"></i>
                                    <div class="stat-val">${this.totalCredits}</div>
                                    <div class="stat-lbl">Credits</div>
                                </div>
                            </div>
                            <div class="col-6 col-lg-3">
                                <div class="gpa-stat-card">
                                    <i class="bi bi-trophy ${s?.best_semester?.gpa >= 8 ? 'text-warning' : 'text-success'}"></i>
                                    <div class="stat-val">${s?.best_semester?.gpa || '--'}</div>
                                    <div class="stat-lbl" title="${Utils.esc(s?.best_semester?.name || '')}">Best</div>
                                </div>
                            </div>
                            <div class="col-6 col-lg-3">
                                <div class="gpa-stat-card">
                                    <i class="bi bi-arrow-${improving === true ? 'up' : improving === false ? 'down' : 'right'} ${improvingIcon}"></i>
                                    <div class="stat-val small">${improvingText}</div>
                                    <div class="stat-lbl">Trend</div>
                                </div>
                            </div>
                            <div class="col-6 col-lg-3">
                                <div class="gpa-stat-card">
                                    <i class="bi bi-graph-up text-primary"></i>
                                    <div class="stat-val">${s?.average_gpa || '--'}</div>
                                    <div class="stat-lbl">Average</div>
                                </div>
                            </div>
                        </div>
                        ${trend.length > 1 ? `
                            <div class="mt-3">
                                <canvas id="gpa-trend-chart" height="60"></canvas>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <h5 class="mt-4 mb-3"><i class="bi bi-layers"></i> Semesters</h5>
            <div id="semesters-list"></div>`;

        container.innerHTML = html;
        this.renderSemesters();

        // Render trend chart
        if (trend.length > 1) {
            this.renderTrendChart(trend);
        }
    },

    renderTrendChart(trend) {
        const ctx = document.getElementById('gpa-trend-chart');
        if (!ctx) return;

        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const lineColor = isDark ? 'var(--bs-primary)' : '#fff';
        const fillColor = isDark ? 'rgba(13,110,253,0.1)' : 'rgba(255,255,255,0.1)';
        const tickColor = isDark ? 'rgba(var(--bs-body-color-rgb), 0.7)' : 'rgba(255,255,255,0.7)';
        const gridColor = isDark ? 'rgba(var(--bs-body-color-rgb), 0.1)' : 'rgba(255,255,255,0.1)';

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: trend.map(t => t.name),
                datasets: [{
                    label: 'GPA',
                    data: trend.map(t => t.gpa),
                    borderColor: lineColor,
                    backgroundColor: fillColor,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: lineColor,
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: {
                        min: 0,
                        max: this.scale === '10' ? 10 : 4,
                        ticks: { color: tickColor, font: { size: 10 } },
                        grid: { color: gridColor },
                    },
                    x: {
                        ticks: { color: tickColor, font: { size: 10 } },
                        grid: { display: false },
                    }
                }
            }
        });
    },

    renderSemesters() {
        const container = document.getElementById('semesters-list');
        if (!container) return;

        if (this.semesters.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-4">No semesters added yet.</div>';
            return;
        }

        container.innerHTML = this.semesters.map(sem => {
            const maxScale = sem.scale === '4' ? 4 : 10;
            const gpaPercent = (sem.gpa / maxScale) * 100;
            const gpaColor = sem.gpa >= 8 ? 'success' : sem.gpa >= 6 ? 'primary' : sem.gpa >= 4 ? 'warning' : 'danger';

            return `
                <div class="card gpa-semester-card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h5 class="mb-1">${Utils.esc(sem.name)}</h5>
                                <small class="text-muted">${sem.subject_count} subjects | ${sem.total_credits} credits</small>
                                ${sem.updated_at || sem.created_at ? `<small class="text-muted d-block">Updated ${Utils.timeAgo(sem.updated_at || sem.created_at)}</small>` : ''}
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-${gpaColor} fs-6">GPA: ${sem.gpa}/${maxScale}</span>
                                <button class="btn btn-sm btn-outline-secondary" onclick="GPAModule.showSemesterModal('${sem.id}')" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="GPAModule.deleteSemester('${sem.id}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div class="progress progress-thin mb-3">
                            <div class="progress-bar bg-${gpaColor}" style="width:${gpaPercent}%"></div>
                        </div>

                        ${sem.subjects && sem.subjects.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-sm table-hover gpa-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th class="text-center">Credits</th>
                                            <th class="text-center">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sem.subjects.map(s => {
                const gradeColor = this.getGradeColor(s.grade);
                return `<tr>
                                                <td>${Utils.esc(s.name)}</td>
                                                <td class="text-center">${s.credits}</td>
                                                <td class="text-center"><span class="badge bg-${gradeColor}">${s.grade}</span></td>
                                            </tr>`;
            }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<div class="text-muted small">No subjects added</div>'}
                    </div>
                </div>`;
        }).join('');
    },

    getGradeColor(grade) {
        if (['O', 'A+', 'A'].includes(grade)) return 'success';
        if (['B+', 'B'].includes(grade)) return 'primary';
        if (['C+', 'C'].includes(grade)) return 'info';
        if (grade === 'D') return 'warning';
        return 'danger';
    },

    showCalculator() {
        const modalId = 'gpa-calc-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const gradeOptions = this.scale === '10' ? this.GRADE_OPTIONS_10 : this.GRADE_OPTIONS_4;

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-calculator"></i> Quick GPA Calculator</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="calc-subjects">
                            <div class="row g-2 mb-2 calc-row">
                                <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Subject name"></div>
                                <div class="col-3"><input type="number" class="form-control form-control-sm" placeholder="Credits" min="0" step="0.5"></div>
                                <div class="col-3">
                                    <select class="form-select form-select-sm">
                                        ${gradeOptions.map(g => `<option value="${g}">${g}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.calc-row').remove()"><i class="bi bi-x"></i></button></div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-secondary mb-3" onclick="GPAModule.addCalcRow()">
                            <i class="bi bi-plus"></i> Add Subject
                        </button>
                        <button type="button" class="btn btn-primary w-100" onclick="GPAModule.runCalculation()">Calculate GPA</button>
                        <div id="calc-result" class="mt-3"></div>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    addCalcRow() {
        const gradeOptions = this.scale === '10' ? this.GRADE_OPTIONS_10 : this.GRADE_OPTIONS_4;
        const row = document.createElement('div');
        row.className = 'row g-2 mb-2 calc-row';
        row.innerHTML = `
            <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Subject name"></div>
            <div class="col-3"><input type="number" class="form-control form-control-sm" placeholder="Credits" min="0" step="0.5"></div>
            <div class="col-3">
                <select class="form-select form-select-sm">
                    ${gradeOptions.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
            </div>
            <div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.calc-row').remove()"><i class="bi bi-x"></i></button></div>`;
        document.getElementById('calc-subjects').appendChild(row);
    },

    async runCalculation() {
        const rows = document.querySelectorAll('#calc-subjects .calc-row');
        const subjects = [];
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input, select');
            const name = inputs[0].value.trim();
            const credits = parseFloat(inputs[1].value) || 0;
            const grade = inputs[2].value;
            if (name && credits > 0) subjects.push({ name, credits, grade });
        });

        if (subjects.length === 0) {
            Utils.showToast('Add at least one subject with credits', 'warning');
            return;
        }

        try {
            const result = await API.post('/gpa/calculator', { subjects, scale: this.scale });
            const container = document.getElementById('calc-result');
            const maxScale = this.scale === '10' ? 10 : 4;
            const gpaColor = result.gpa >= 8 ? 'success' : result.gpa >= 6 ? 'primary' : result.gpa >= 4 ? 'warning' : 'danger';

            container.innerHTML = `
                <div class="alert alert-${gpaColor} text-center">
                    <h4 class="mb-1">GPA: ${result.gpa}/${maxScale}</h4>
                    <small>Total Credits: ${result.total_credits}</small>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead><tr><th>Subject</th><th>Credits</th><th>Grade</th><th>Points</th></tr></thead>
                        <tbody>
                            ${result.breakdown.map(b => `
                                <tr>
                                    <td>${Utils.esc(b.name)}</td>
                                    <td>${b.credits}</td>
                                    <td><span class="badge bg-${this.getGradeColor(b.grade)}">${b.grade}</span></td>
                                    <td>${b.weighted}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (e) {
            Utils.showToast(e.message || 'Calculation failed', 'error');
        }
    },

    showSemesterModal(semesterId = null) {
        const sem = semesterId ? this.semesters.find(s => s.id === semesterId) : null;
        const isEdit = !!sem;
        const modalId = 'gpa-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const gradeOptions = this.scale === '10' ? this.GRADE_OPTIONS_10 : this.GRADE_OPTIONS_4;
        const subjects = sem?.subjects || [{ name: '', credits: '', grade: 'A+' }];

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-${isEdit ? 'pencil' : 'plus-circle'}"></i> ${isEdit ? 'Edit' : 'Add'} Semester</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="gpa-form">
                            <div class="mb-3">
                                <label class="form-label">Semester Name *</label>
                                <input type="text" class="form-control" name="semester_name" value="${Utils.esc(sem?.name || '')}" required maxlength="100" placeholder="e.g., Semester 1">
                            </div>
                            <h6>Subjects</h6>
                            <div id="gpa-subjects-container">
                                ${subjects.map((s, i) => `
                                    <div class="row g-2 mb-2 gpa-subject-row">
                                        <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Subject name" value="${Utils.esc(s.name)}"></div>
                                        <div class="col-3"><input type="number" class="form-control form-control-sm" placeholder="Credits" value="${s.credits}" min="0" step="0.5"></div>
                                        <div class="col-3">
                                            <select class="form-select form-select-sm">
                                                ${gradeOptions.map(g => `<option value="${g}" ${s.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.gpa-subject-row').remove()"><i class="bi bi-x"></i></button></div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-secondary mb-3" onclick="GPAModule.addSubjectRow()">
                                <i class="bi bi-plus"></i> Add Subject
                            </button>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-${isEdit ? 'check' : 'plus-lg'}"></i> ${isEdit ? 'Update' : 'Save'} Semester
                            </button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('gpa-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get('semester_name');
            const rows = document.querySelectorAll('#gpa-subjects-container .gpa-subject-row');
            const subjects = [];
            rows.forEach(row => {
                const inputs = row.querySelectorAll('input, select');
                const sName = inputs[0].value.trim();
                const credits = parseFloat(inputs[1].value) || 0;
                const grade = inputs[2].value;
                if (sName) subjects.push({ name: sName, credits, grade });
            });
            try {
                const payload = { name, subjects, scale: this.scale };
                if (isEdit) {
                    await API.put(`/gpa/semesters/${semesterId}`, payload);
                } else {
                    await API.post('/gpa/semesters', payload);
                }
                modal.hide();
                this.loadSemesters();
                this.loadStats();
                Utils.showToast(isEdit ? 'Semester updated' : 'Semester added', 'success');
                document.dispatchEvent(new CustomEvent('dashboard:refresh'));
            } catch (err) {
                Utils.showToast(err.message || 'Failed to save', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    addSubjectRow() {
        const gradeOptions = this.scale === '10' ? this.GRADE_OPTIONS_10 : this.GRADE_OPTIONS_4;
        const row = document.createElement('div');
        row.className = 'row g-2 mb-2 gpa-subject-row';
        row.innerHTML = `
            <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Subject name"></div>
            <div class="col-3"><input type="number" class="form-control form-control-sm" placeholder="Credits" min="0" step="0.5"></div>
            <div class="col-3">
                <select class="form-select form-select-sm">
                    ${gradeOptions.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
            </div>
            <div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.gpa-subject-row').remove()"><i class="bi bi-x"></i></button></div>`;
        document.getElementById('gpa-subjects-container').appendChild(row);
    },

    async deleteSemester(semesterId) {
        const confirmed = await Utils.confirm('Delete', 'Delete this semester and all its grades?');
        if (!confirmed) return;
        try {
            await API.delete(`/gpa/semesters/${semesterId}`);
            this.loadSemesters();
            this.loadStats();
            Utils.showToast('Semester deleted', 'success');
            document.dispatchEvent(new CustomEvent('dashboard:refresh'));
        } catch (e) {
            Utils.showToast('Failed to delete', 'error');
        }
    },
};

App.registerModule('gpa', () => GPAModule.render());
