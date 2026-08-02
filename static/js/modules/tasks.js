// Tasks Module

const TasksModule = {
    tasks: [],
    stats: null,
    view: 'list', // 'list' or 'kanban'
    filter: { status: '', priority: '', subject: '', search: '', tag: '', sort_by: 'deadline', sort_order: 'asc' },
    selected: new Set(),

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-list-check"></i> Tasks & Assignments</h3>
                <div class="d-flex gap-2">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary ${this.view === 'list' ? 'active' : ''}" onclick="TasksModule.setView('list')"><i class="bi bi-list-ul"></i></button>
                        <button class="btn btn-outline-secondary ${this.view === 'kanban' ? 'active' : ''}" onclick="TasksModule.setView('kanban')"><i class="bi bi-kanban"></i></button>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="TasksModule.showTaskModal()"><i class="bi bi-plus-lg"></i> Add Task</button>
                </div>
            </div>

            <!-- Stats Bar -->
            <div id="tasks-stats" class="mb-3"></div>

            <!-- Filters -->
            <div class="card mb-3"><div class="card-body py-2">
                <div class="row g-2 align-items-center">
                    <div class="col-md-2"><select class="form-select form-select-sm" id="filter-status" onchange="TasksModule.applyFilter()"><option value="">All Status</option><option value="todo">To-Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
                    <div class="col-md-2"><select class="form-select form-select-sm" id="filter-priority" onchange="TasksModule.applyFilter()"><option value="">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                    <div class="col-md-2"><select class="form-select form-select-sm" id="filter-sort" onchange="TasksModule.applyFilter()"><option value="deadline">Sort: Deadline</option><option value="priority">Sort: Priority</option><option value="created_at">Sort: Created</option><option value="title">Sort: Title</option></select></div>
                    <div class="col-md-2"><input type="text" class="form-control form-control-sm" placeholder="Search tasks..." id="filter-search" oninput="TasksModule.applyFilterDebounced()"></div>
                    <div class="col-md-2"><input type="text" class="form-control form-control-sm" placeholder="Filter by tag..." id="filter-tag" oninput="TasksModule.applyFilterDebounced()"></div>
                    <div class="col-md-2">
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-secondary flex-grow-1" onclick="TasksModule.toggleBulkSelect()" id="bulk-select-btn"><i class="bi bi-check2-square"></i> Select</button>
                            <button class="btn btn-sm btn-outline-danger d-none" onclick="TasksModule.bulkAction('delete')" id="bulk-delete-btn"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div></div>

            <!-- Content Area -->
            <div id="tasks-content"></div>`;

        await this.loadTasks();
    },

    setView(view) {
        this.view = view;
        this.render();
    },

    async loadTasks() {
        try {
            const params = new URLSearchParams();
            if (this.filter.status) params.set('status', this.filter.status);
            if (this.filter.priority) params.set('priority', this.filter.priority);
            if (this.filter.search) params.set('search', this.filter.search);
            if (this.filter.tag) params.set('tag', this.filter.tag);
            params.set('sort_by', this.filter.sort_by);
            params.set('sort_order', this.filter.sort_order);

            const [taskData, statsData] = await Promise.all([
                API.get('/tasks?' + params.toString()),
                API.get('/tasks/stats'),
            ]);

            this.tasks = taskData.tasks || [];
            this.stats = statsData;
            this.selected.clear();
            this.renderStats();
            this.renderContent();
        } catch (e) {
            Utils.showToast('Failed to load tasks', 'error');
        }
    },

    // --- Stats ---
    renderStats() {
        const s = this.stats;
        if (!s) return;
        document.getElementById('tasks-stats').innerHTML = `
            <div class="row g-2">
                <div class="col-6 col-md-2">
                    <div class="task-stat-pill bg-primary-subtle text-primary">
                        <div class="fs-5 fw-bold">${s.total}</div><small>Total</small>
                    </div>
                </div>
                <div class="col-6 col-md-2">
                    <div class="task-stat-pill bg-info-subtle text-info">
                        <div class="fs-5 fw-bold">${s.in_progress || 0}</div><small>In Progress</small>
                    </div>
                </div>
                <div class="col-6 col-md-2">
                    <div class="task-stat-pill bg-success-subtle text-success">
                        <div class="fs-5 fw-bold">${s.completed}</div><small>Done</small>
                    </div>
                </div>
                <div class="col-6 col-md-2">
                    <div class="task-stat-pill bg-danger-subtle text-danger">
                        <div class="fs-5 fw-bold">${s.overdue}</div><small>Overdue</small>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="task-stat-pill">
                        <div class="d-flex align-items-center gap-2">
                            <div class="progress flex-grow-1 progress-thin" style="height:8px">
                                <div class="progress-bar bg-success" style="width:${s.percentage}%"></div>
                            </div>
                            <span class="fw-bold text-success">${s.percentage}%</span>
                        </div>
                        <small class="text-muted">Completion rate</small>
                    </div>
                </div>
            </div>`;
    },

    // --- Content Rendering ---
    renderContent() {
        const container = document.getElementById('tasks-content');
        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-inbox display-1"></i>
                    <p class="mt-2">No tasks found</p>
                    <button class="btn btn-primary btn-sm" onclick="TasksModule.showTaskModal()"><i class="bi bi-plus-lg"></i> Create your first task</button>
                </div>`;
            return;
        }

        if (this.view === 'kanban') {
            this.renderKanban(container);
        } else {
            this.renderList(container);
        }
    },

    // --- List View ---
    renderList(container) {
        container.innerHTML = this.tasks.map(t => this._taskCard(t)).join('');
    },

    _taskCard(t) {
        const safeTitle = Utils.esc(t.title);
        const safeDesc = Utils.esc(t.description);
        const safeSubject = Utils.esc(t.subject) || 'No subject';
        const tags = (t.tags || []).map(tag => `<span class="badge bg-secondary-subtle text-secondary me-1" style="font-size:0.65rem">${Utils.esc(tag)}</span>`).join('');

        // Subtask progress
        let subtaskHtml = '';
        if (t.subtasks_total > 0) {
            const pct = Math.round((t.subtasks_done / t.subtasks_total) * 100);
            subtaskHtml = `
                <div class="d-flex align-items-center gap-2 mt-1">
                    <div class="progress flex-grow-1" style="height:4px;max-width:120px">
                        <div class="progress-bar bg-info" style="width:${pct}%"></div>
                    </div>
                    <small class="text-muted">${t.subtasks_done}/${t.subtasks_total}</small>
                </div>`;
        }

        const selectHtml = this._bulkSelectEnabled
            ? `<div class="form-check me-2"><input class="form-check-input" type="checkbox" data-task-id="${t.id}" onchange="TasksModule.toggleSelect('${t.id}')" ${this.selected.has(t.id) ? 'checked' : ''}></div>`
            : '';

        return `
            <div class="card task-card mb-2 priority-${t.priority} ${t.is_overdue ? 'overdue' : ''}" style="animation: fadeInUp 0.3s ease both">
                <div class="card-body py-3">
                    <div class="d-flex align-items-start gap-2">
                        ${selectHtml}
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                <h6 class="mb-0 ${t.status === 'completed' ? 'text-decoration-line-through text-muted' : ''}">${safeTitle}</h6>
                                ${t.is_overdue ? '<span class="badge bg-danger" style="font-size:0.65rem">Overdue</span>' : ''}
                            </div>
                            <div class="text-muted small">${safeSubject} &middot; Due: ${Utils.timeAgo(t.deadline)}</div>
                            ${safeDesc ? `<p class="small mt-1 mb-0 text-muted">${safeDesc}</p>` : ''}
                            ${tags ? `<div class="mt-1">${tags}</div>` : ''}
                            ${subtaskHtml}
                        </div>
                        <div class="d-flex align-items-center gap-1 flex-shrink-0">
                            <span class="badge bg-${Utils.priorityColor(t.priority)}" style="font-size:0.7rem">${t.priority}</span>
                            <span onclick="TasksModule.cycleStatus('${t.id}')" class="pointer">${Utils.statusBadge(t.status)}</span>
                            <button class="btn btn-sm btn-outline-secondary btn-sm-task" onclick="TasksModule.showTaskModal('${t.id}')"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger btn-sm-task" onclick="TasksModule.deleteTask('${t.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // --- Kanban View ---
    renderKanban(container) {
        const columns = [
            { key: 'todo', label: 'To-Do', color: 'secondary', icon: 'bi-circle' },
            { key: 'in_progress', label: 'In Progress', color: 'primary', icon: 'bi-play-circle' },
            { key: 'completed', label: 'Completed', color: 'success', icon: 'bi-check-circle' },
        ];

        container.innerHTML = `<div class="kanban-board">` +
            columns.map(col => {
                const colTasks = this.tasks.filter(t => t.status === col.key);
                return `
                    <div class="kanban-column">
                        <div class="kanban-header bg-${col.color}-subtle text-${col.color}">
                            <i class="bi ${col.icon}"></i> ${col.label}
                            <span class="badge bg-${col.color}">${colTasks.length}</span>
                        </div>
                        <div class="kanban-cards">
                            ${colTasks.length === 0
                        ? '<p class="text-muted small text-center py-3">No tasks</p>'
                        : colTasks.map(t => this._kanbanCard(t)).join('')}
                        </div>
                    </div>`;
            }).join('') + `</div>`;
    },

    _kanbanCard(t) {
        const safeTitle = Utils.esc(t.title);
        const safeSubject = Utils.esc(t.subject);
        const tags = (t.tags || []).map(tag => `<span class="badge bg-secondary-subtle text-secondary" style="font-size:0.6rem">${Utils.esc(tag)}</span>`).join(' ');

        let subtaskHtml = '';
        if (t.subtasks_total > 0) {
            subtaskHtml = `<div class="kanban-subtask"><i class="bi bi-check2-square"></i> ${t.subtasks_done}/${t.subtasks_total}</div>`;
        }

        return `
            <div class="kanban-card priority-${t.priority} ${t.is_overdue ? 'overdue' : ''}" onclick="TasksModule.showTaskModal('${t.id}')">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="fw-semibold small">${safeTitle}</span>
                    <span class="badge bg-${Utils.priorityColor(t.priority)}" style="font-size:0.6rem">${t.priority}</span>
                </div>
                ${safeSubject ? `<div class="text-muted" style="font-size:0.7rem">${safeSubject}</div>` : ''}
                ${tags ? `<div class="mt-1">${tags}</div>` : ''}
                ${subtaskHtml}
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted" style="font-size:0.65rem">${Utils.timeAgo(t.deadline)}</small>
                    ${t.is_overdue ? '<span class="badge bg-danger" style="font-size:0.6rem">Overdue</span>' : ''}
                </div>
            </div>`;
    },

    // --- Filters ---
    applyFilter() {
        this.filter.status = document.getElementById('filter-status').value;
        this.filter.priority = document.getElementById('filter-priority').value;
        this.filter.sort_by = document.getElementById('filter-sort').value;
        this.filter.search = document.getElementById('filter-search').value;
        this.filter.tag = document.getElementById('filter-tag')?.value || '';
        this.loadTasks();
    },

    applyFilterDebounced: Utils.debounce(function () {
        TasksModule.applyFilter();
    }, 300),

    // --- Bulk Operations ---
    _bulkSelectEnabled: false,

    toggleBulkSelect() {
        this._bulkSelectEnabled = !this._bulkSelectEnabled;
        this.selected.clear();
        const btn = document.getElementById('bulk-select-btn');
        const delBtn = document.getElementById('bulk-delete-btn');
        if (this._bulkSelectEnabled) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-outline-secondary');
            btn.innerHTML = '<i class="bi bi-x-square"></i> Cancel';
            delBtn.classList.remove('d-none');
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-secondary');
            btn.innerHTML = '<i class="bi bi-check2-square"></i> Select';
            delBtn.classList.add('d-none');
        }
        this.renderContent();
    },

    toggleSelect(taskId) {
        if (this.selected.has(taskId)) {
            this.selected.delete(taskId);
        } else {
            this.selected.add(taskId);
        }
        // Show/hide bulk action buttons
        const delBtn = document.getElementById('bulk-delete-btn');
        if (this.selected.size > 0) {
            delBtn.classList.remove('d-none');
        }
    },

    async bulkAction(action) {
        if (this.selected.size === 0) {
            Utils.showToast('Select tasks first', 'warning');
            return;
        }
        const ids = Array.from(this.selected);
        if (action === 'complete') {
            const confirmed = await Utils.confirm('Complete Tasks', `Mark ${ids.length} tasks as completed?`);
            if (!confirmed) return;
            try {
                await API.post('/tasks/bulk/complete', { task_ids: ids });
                Utils.showToast(`${ids.length} tasks completed`, 'success');
                this.toggleBulkSelect();
                this.loadTasks();
            } catch (e) { Utils.showToast(e.message, 'error'); }
        } else if (action === 'delete') {
            const confirmed = await Utils.confirm('Delete Tasks', `Delete ${ids.length} selected tasks? This cannot be undone.`);
            if (!confirmed) return;
            try {
                await API.post('/tasks/bulk/delete', { task_ids: ids });
                Utils.showToast(`${ids.length} tasks deleted`, 'success');
                this.toggleBulkSelect();
                this.loadTasks();
            } catch (e) { Utils.showToast(e.message, 'error'); }
        }
    },

    // --- Status Cycling ---
    async cycleStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        const cycle = { todo: 'in_progress', in_progress: 'completed', completed: 'todo' };
        try {
            await API.put(`/tasks/${taskId}`, { status: cycle[task.status] });
            this.loadTasks();
        } catch (e) { Utils.showToast('Failed to update', 'error'); }
    },

    // --- Task Modal (Create/Edit) ---
    showTaskModal(taskId = null) {
        const task = taskId ? this.tasks.find(t => t.id === taskId) : null;
        const isEdit = !!task;
        const modalId = 'task-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const safeTitle = Utils.esc(task?.title || '');
        const safeDesc = Utils.esc(task?.description || '');
        const safeSubject = Utils.esc(task?.subject || '');
        const tagsStr = (task?.tags || []).join(', ');

        // Subtask list for editing
        let subtaskEditHtml = '';
        if (isEdit && task.subtasks && task.subtasks.length > 0) {
            subtaskEditHtml = `
                <div class="mb-3">
                    <label class="form-label">Subtasks</label>
                    <div id="subtask-list-edit">
                        ${task.subtasks.map((s, i) => `
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <input class="form-check-input" type="checkbox" ${s.done ? 'checked' : ''} onchange="TasksModule.toggleSubtask('${taskId}', ${i})">
                                <span class="${s.done ? 'text-decoration-line-through text-muted' : ''} small flex-grow-1">${Utils.esc(s.title)}</span>
                                <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="TasksModule.removeSubtask('${taskId}', ${i})"><i class="bi bi-x"></i></button>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${isEdit ? 'Edit Task' : 'Add Task'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="task-form">
                                <div class="mb-3"><label class="form-label">Title *</label><input type="text" class="form-control" name="title" value="${safeTitle}" required maxlength="200"></div>
                                <div class="mb-3"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="2" maxlength="2000">${safeDesc}</textarea></div>
                                <div class="mb-3"><label class="form-label">Subject</label><input type="text" class="form-control" name="subject" value="${safeSubject}" maxlength="100"></div>
                                <div class="mb-3"><label class="form-label">Tags</label><input type="text" class="form-control" name="tags" value="${Utils.esc(tagsStr)}" placeholder="e.g. important, exam, project"><small class="text-muted">Comma-separated</small></div>
                                <div class="row mb-3">
                                    <div class="col-6"><label class="form-label">Deadline</label><input type="date" class="form-control" name="deadline" value="${task?.deadline || ''}"></div>
                                    <div class="col-6"><label class="form-label">Priority</label><select class="form-select" name="priority"><option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option><option value="medium" ${task?.priority === 'medium' || !task ? 'selected' : ''}>Medium</option><option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option></select></div>
                                </div>
                                ${isEdit ? `
                                <div class="mb-3"><label class="form-label">Status</label><select class="form-select" name="status"><option value="todo" ${task?.status === 'todo' ? 'selected' : ''}>To-Do</option><option value="in_progress" ${task?.status === 'in_progress' ? 'selected' : ''}>In Progress</option><option value="completed" ${task?.status === 'completed' ? 'selected' : ''}>Completed</option></select></div>
                                ${subtaskEditHtml}
                                <div class="mb-3">
                                    <div class="input-group input-group-sm">
                                        <input type="text" class="form-control" id="new-subtask-input" placeholder="Add subtask...">
                                        <button type="button" class="btn btn-outline-primary" onclick="TasksModule.addSubtask('${taskId}')"><i class="bi bi-plus"></i></button>
                                    </div>
                                </div>` : ''}
                                <button type="submit" class="btn btn-primary w-100">${isEdit ? 'Update' : 'Create'} Task</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;

        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            // Convert tags string to array
            if (data.tags) {
                data.tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
            }
            try {
                if (isEdit) {
                    await API.put(`/tasks/${taskId}`, data);
                } else {
                    await API.post('/tasks', data);
                }
                modal.hide();
                this.loadTasks();
                Utils.showToast(isEdit ? 'Task updated' : 'Task created', 'success');
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });

        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
            document.getElementById(modalId).remove();
        });
    },

    // --- Subtask Operations ---
    async addSubtask(taskId) {
        const input = document.getElementById('new-subtask-input');
        const title = input.value.trim();
        if (!title) return;
        try {
            await API.post(`/tasks/${taskId}/subtasks`, { title });
            input.value = '';
            this.showTaskModal(taskId); // Re-render modal
            this.loadTasks();
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    async toggleSubtask(taskId, index) {
        try {
            await API.put(`/tasks/${taskId}/subtasks/${index}`);
            this.showTaskModal(taskId);
            this.loadTasks();
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    async removeSubtask(taskId, index) {
        try {
            await API.delete(`/tasks/${taskId}/subtasks/${index}`);
            this.showTaskModal(taskId);
            this.loadTasks();
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    // --- Delete ---
    async deleteTask(taskId) {
        const confirmed = await Utils.confirm('Delete Task', 'Are you sure you want to delete this task?');
        if (!confirmed) return;
        try {
            await API.delete(`/tasks/${taskId}`);
            this.loadTasks();
            Utils.showToast('Task deleted', 'success');
        } catch (e) { Utils.showToast('Failed to delete', 'error'); }
    },
};

App.registerModule('tasks', () => TasksModule.render());
