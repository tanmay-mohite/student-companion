// Exam Preparation Module - Enhanced v2.0

const ExamsModule = {
    subjects: [],
    stats: null,

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-journal-bookmark"></i> Exam Preparation</h3>
                <button class="btn btn-primary" onclick="ExamsModule.showSubjectModal()">
                    <i class="bi bi-plus-lg"></i> Add Exam
                </button>
            </div>
            <div id="exam-stats"></div>
            <div id="exams-list" class="mt-3">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
            </div>`;

        await Promise.all([this.loadSubjects(), this.loadStats()]);
    },

    async loadStats() {
        try {
            this.stats = await API.get('/exams/stats');
            this.renderStats();
        } catch (e) {
            console.error('Failed to load exam stats:', e);
        }
    },

    renderStats() {
        const container = document.getElementById('exam-stats');
        if (!this.stats || !container) return;

        const s = this.stats;

        container.innerHTML = `
            <div class="exam-overview-banner">
                <div class="row text-center g-3">
                    <div class="col-6 col-md-3">
                        <div class="exam-stat-item">
                            <i class="bi bi-book"></i>
                            <div class="stat-value">${s.total_subjects}</div>
                            <div class="stat-label">Subjects</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="exam-stat-item">
                            <i class="bi bi-list-check"></i>
                            <div class="stat-value">${s.completed_topics}/${s.total_topics}</div>
                            <div class="stat-label">Topics Done</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="exam-stat-item">
                            <i class="bi bi-graph-up"></i>
                            <div class="stat-value">${s.overall_progress}%</div>
                            <div class="stat-label">Progress</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="exam-stat-item">
                            <i class="bi bi-clock-history"></i>
                            <div class="stat-value">
                                ${s.nearest_days === null ? '--' : s.nearest_days <= 0 ? 'Today!' : s.nearest_days + 'd'}
                            </div>
                            <div class="stat-label">${s.nearest_exam ? Utils.esc(s.nearest_exam) : 'No exams'}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    async loadSubjects() {
        try {
            const data = await API.get('/exams/subjects');
            this.subjects = data.subjects || [];
            this.renderSubjects();
        } catch (e) {
            document.getElementById('exams-list').innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load exams.
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="ExamsModule.loadSubjects()">Retry</button>
                </div>`;
        }
    },

    renderSubjects() {
        const container = document.getElementById('exams-list');
        if (!container) return;

        if (this.subjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-journal-bookmark"></i>
                    <h5>No Exams Added</h5>
                    <p>Start tracking your exam preparation by adding your first exam subject.</p>
                    <button class="btn btn-primary" onclick="ExamsModule.showSubjectModal()">
                        <i class="bi bi-plus-lg"></i> Add Your First Exam
                    </button>
                </div>`;
            return;
        }

        // Sort by days_left (nearest first, null last)
        const sorted = [...this.subjects].sort((a, b) => {
            if (a.days_left === null && b.days_left === null) return 0;
            if (a.days_left === null) return 1;
            if (b.days_left === null) return -1;
            return a.days_left - b.days_left;
        });

        container.innerHTML = sorted.map(s => {
            const diff = this.getCountdown(s.exam_date);
            const urgencyClass = s.days_left === null ? 'secondary' :
                s.days_left < 0 ? 'secondary' :
                    s.days_left <= 3 ? 'danger' :
                        s.days_left <= 7 ? 'warning' :
                            s.days_left <= 30 ? 'info' : 'success';

            const priorityBadge = s.priority === 'high' ? '<span class="badge bg-danger ms-2">High Priority</span>' :
                s.priority === 'medium' ? '<span class="badge bg-warning text-dark ms-2">Medium</span>' : '';

            return `
                <div class="card exam-card exam-urgency-${urgencyClass}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                            <div class="flex-grow-1">
                                <h5 class="mb-1">
                                    ${Utils.esc(s.name)}
                                    ${priorityBadge}
                                </h5>
                                <div class="exam-meta">
                                    ${s.exam_date ? `<span class="exam-date"><i class="bi bi-calendar-event"></i> ${Utils.timeAgo(s.exam_date)}</span>` : '<span class="text-muted">No date set</span>'}
                                    <span class="badge bg-${urgencyClass} ms-2">${diff.text}</span>
                                </div>
                            </div>
                            <div class="exam-actions">
                                <button class="btn btn-sm btn-outline-primary" onclick="ExamsModule.showEditModal('${s.id}')" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="ExamsModule.deleteSubject('${s.id}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div class="mt-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="text-muted small">Syllabus Progress</span>
                                <span class="badge bg-${s.progress >= 70 ? 'success' : s.progress >= 40 ? 'warning text-dark' : 'danger'}">${s.progress}% (${s.topics_completed}/${s.topics_total})</span>
                            </div>
                            <div class="progress progress-thin">
                                <div class="progress-bar bg-${s.progress >= 70 ? 'success' : s.progress >= 40 ? 'warning' : 'danger'}" 
                                     style="width:${s.progress}%"></div>
                            </div>
                        </div>

                        ${s.topics && s.topics.length > 0 ? `
                            <div class="exam-topics mt-3">
                                <h6 class="small text-muted mb-2">Topics Checklist</h6>
                                ${s.topics.map((t, i) => `
                                    <div class="topic-item ${t.completed ? 'topic-done' : ''}">
                                        <div class="form-check flex-grow-1">
                                            <input class="form-check-input" type="checkbox" 
                                                   ${t.completed ? 'checked' : ''} 
                                                   onchange="ExamsModule.toggleTopic('${s.id}', ${i})" 
                                                   id="topic-${s.id}-${i}">
                                            <label class="form-check-label" for="topic-${s.id}-${i}">
                                                ${Utils.esc(t.name)}
                                            </label>
                                        </div>
                                        <span class="badge difficulty-${t.difficulty || 'medium'}">${t.difficulty || 'medium'}</span>
                                        <button class="btn btn-sm btn-link text-danger p-0 ms-2" 
                                                onclick="ExamsModule.deleteTopic('${s.id}', ${i})" title="Remove">
                                            <i class="bi bi-x"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <div class="mt-2 d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="ExamsModule.addTopic('${s.id}')">
                                <i class="bi bi-plus"></i> Add Topic
                            </button>
                            ${s.notes ? `<button class="btn btn-sm btn-outline-secondary" onclick="ExamsModule.showNotes('${s.id}')"><i class="bi bi-sticky"></i> Notes</button>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

    getCountdown(dateStr) {
        if (!dateStr) return { days: null, text: 'No date set' };
        const now = new Date();
        const exam = new Date(dateStr);
        const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
        if (diff < 0) return { days: diff, text: 'Exam passed' };
        if (diff === 0) return { days: 0, text: 'Today!' };
        if (diff === 1) return { days: 1, text: 'Tomorrow!' };
        return { days: diff, text: `${diff} days left` };
    },

    async toggleTopic(subjectId, topicIndex) {
        try {
            const result = await API.put(`/exams/subjects/${subjectId}/topics/${topicIndex}`);
            // Update local data
            const subject = this.subjects.find(s => s.id === subjectId);
            if (subject && result.topics) {
                subject.topics = result.topics;
                subject.topics_completed = result.completed;
                subject.progress = result.progress;
                this.renderSubjects();
                this.loadStats();
            }
        } catch (e) {
            Utils.showToast('Failed to update topic', 'error');
        }
    },

    async addTopic(subjectId) {
        const modalId = 'add-topic-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-sm"><div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Add Topic</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <form id="topic-form">
                            <div class="mb-3">
                                <label class="form-label">Topic Name</label>
                                <input type="text" class="form-control" name="name" required maxlength="100">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Difficulty</label>
                                <select class="form-select" name="difficulty">
                                    <option value="easy">Easy</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Add Topic</button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('topic-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await API.post(`/exams/subjects/${subjectId}/topics`, {
                    name: formData.get('name'),
                    difficulty: formData.get('difficulty'),
                });
                modal.hide();
                this.loadSubjects();
                this.loadStats();
                Utils.showToast('Topic added', 'success');
            } catch (err) {
                Utils.showToast(err.message || 'Failed to add topic', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async deleteTopic(subjectId, topicIndex) {
        const confirmed = await Utils.confirm('Delete', 'Remove this topic?');
        if (!confirmed) return;
        try {
            await API.delete(`/exams/subjects/${subjectId}/topics/${topicIndex}`);
            this.loadSubjects();
            this.loadStats();
            Utils.showToast('Topic removed', 'success');
        } catch (e) {
            Utils.showToast('Failed to delete topic', 'error');
        }
    },

    showNotes(subjectId) {
        const subject = this.subjects.find(s => s.id === subjectId);
        if (!subject || !subject.notes) return;

        const modalId = 'notes-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-sticky"></i> ${Utils.esc(subject.name)} - Notes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="notes-text">${Utils.esc(subject.notes)}</p>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    showSubjectModal() {
        const modalId = 'exam-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-plus-circle"></i> Add Exam Subject</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="exam-form">
                            <div class="mb-3">
                                <label class="form-label">Subject Name *</label>
                                <input type="text" class="form-control" name="name" required maxlength="100" placeholder="e.g., Mathematics">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Exam Date *</label>
                                <input type="date" class="form-control" name="exam_date" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Priority</label>
                                <select class="form-select" name="priority">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Topics (comma-separated)</label>
                                <textarea class="form-control" name="topics_str" rows="3" placeholder="Chapter 1, Chapter 2, Chapter 3"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Notes (optional)</label>
                                <textarea class="form-control" name="notes" rows="2" maxlength="500" placeholder="Important formulas, key points..."></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-plus-lg"></i> Add Subject
                            </button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('exam-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const topicsStr = formData.get('topics_str');
            const topics = topicsStr ? topicsStr.split(',').map(t => ({
                name: t.trim(),
                completed: false,
                difficulty: 'medium'
            })).filter(t => t.name) : [];

            try {
                await API.post('/exams/subjects', {
                    name: formData.get('name'),
                    exam_date: formData.get('exam_date'),
                    priority: formData.get('priority'),
                    topics: topics,
                    notes: formData.get('notes'),
                });
                modal.hide();
                this.loadSubjects();
                this.loadStats();
                Utils.showToast('Exam subject added', 'success');
            } catch (err) {
                Utils.showToast(err.message || 'Failed to add subject', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    showEditModal(subjectId) {
        const subject = this.subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const modalId = 'exam-edit-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-pencil"></i> Edit ${Utils.esc(subject.name)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="exam-edit-form">
                            <div class="mb-3">
                                <label class="form-label">Subject Name</label>
                                <input type="text" class="form-control" name="name" value="${Utils.esc(subject.name)}" required maxlength="100">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Exam Date</label>
                                <input type="date" class="form-control" name="exam_date" value="${subject.exam_date || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Priority</label>
                                <select class="form-select" name="priority">
                                    <option value="low" ${subject.priority === 'low' ? 'selected' : ''}>Low</option>
                                    <option value="medium" ${subject.priority === 'medium' || !subject.priority ? 'selected' : ''}>Medium</option>
                                    <option value="high" ${subject.priority === 'high' ? 'selected' : ''}>High</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Notes</label>
                                <textarea class="form-control" name="notes" rows="3" maxlength="500">${Utils.esc(subject.notes || '')}</textarea>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Save Changes</button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('exam-edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await API.put(`/exams/subjects/${subjectId}`, {
                    name: formData.get('name'),
                    exam_date: formData.get('exam_date'),
                    priority: formData.get('priority'),
                    notes: formData.get('notes'),
                });
                modal.hide();
                this.loadSubjects();
                this.loadStats();
                Utils.showToast('Subject updated', 'success');
            } catch (err) {
                Utils.showToast(err.message || 'Failed to update', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async deleteSubject(subjectId) {
        const confirmed = await Utils.confirm('Delete', 'Delete this exam subject and all its topics?');
        if (!confirmed) return;
        try {
            await API.delete(`/exams/subjects/${subjectId}`);
            this.loadSubjects();
            this.loadStats();
            Utils.showToast('Exam deleted', 'success');
        } catch (e) {
            Utils.showToast('Failed to delete', 'error');
        }
    },
};

App.registerModule('exams', () => ExamsModule.render());
