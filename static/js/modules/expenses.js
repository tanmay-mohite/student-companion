// Expense Tracker Module - Enhanced v2.0

const ExpensesModule = {
    expenses: [],
    stats: null,
    analytics: null,
    categories: [],
    pieChart: null,
    trendChart: null,
    filter: { category: '', page: 1 },

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header">
                <h3><i class="bi bi-wallet2"></i> Expense Tracker</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-info btn-sm" onclick="ExpensesModule.showAnalytics()">
                        <i class="bi bi-graph-up"></i> Analytics
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="ExpensesModule.showExpenseModal()">
                        <i class="bi bi-plus-lg"></i> Add Expense
                    </button>
                </div>
            </div>
            <div id="expense-dashboard">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
            </div>`;

        await Promise.all([this.loadAll(), this.loadCategories()]);
    },

    async loadCategories() {
        try {
            const data = await API.get('/expenses/categories');
            this.categories = data.categories || [];
        } catch (e) {
            this.categories = [];
        }
    },

    async loadAll() {
        try {
            const [expData, statsData] = await Promise.all([
                API.get('/expenses'),
                API.get('/expenses/stats'),
            ]);
            this.expenses = expData.expenses || [];
            this.stats = statsData;
            this.renderDashboard();
        } catch (e) {
            document.getElementById('expense-dashboard').innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load expenses.
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="ExpensesModule.loadAll()">Retry</button>
                </div>`;
        }
    },

    renderDashboard() {
        const container = document.getElementById('expense-dashboard');
        const s = this.stats;
        if (!s) return;

        const budgetPercent = s.budget > 0 ? Math.min(100, Math.round((s.total_spent / s.budget) * 100)) : 0;
        const overBudget = s.budget > 0 && s.total_spent > s.budget;

        let html = `
            <div class="expense-overview-banner ${overBudget ? 'over-budget' : ''}">
                <div class="row g-3 text-center">
                    <div class="col-6 col-md-3">
                        <div class="exp-stat-item">
                            <i class="bi bi-cash-stack"></i>
                            <div class="stat-val">Rs.${s.total_spent.toFixed(0)}</div>
                            <div class="stat-lbl">Spent This Month</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="exp-stat-item">
                            <i class="bi bi-piggy-bank"></i>
                            <div class="stat-val">Rs.${s.budget.toFixed(0)}</div>
                            <div class="stat-lbl">Monthly Budget</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="exp-stat-item">
                            <i class="bi bi-${overBudget ? 'exclamation-triangle' : 'wallet2'}"></i>
                            <div class="stat-val">Rs.${s.remaining.toFixed(0)}</div>
                            <div class="stat-lbl">${overBudget ? 'Over Budget' : 'Remaining'}</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="exp-stat-item">
                            <i class="bi bi-percent"></i>
                            <div class="stat-val">${budgetPercent}%</div>
                            <div class="stat-lbl">Budget Used</div>
                        </div>
                    </div>
                </div>
                ${s.budget > 0 ? `
                    <div class="mt-3">
                        <div class="progress progress-thin">
                            <div class="progress-bar bg-${overBudget ? 'danger' : budgetPercent > 80 ? 'warning' : 'success'}" 
                                 style="width:${budgetPercent}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="row g-3 mt-2">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-list-ul"></i> Recent Expenses</h5>
                            <div class="d-flex gap-2">
                                <select class="form-select form-select-sm" style="width:auto" onchange="ExpensesModule.filterByCategory(this.value)">
                                    <option value="">All Categories</option>
                                    ${this.categories.map(c => `<option value="${c.name}" ${this.filter.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="card-body" id="expenses-list"></div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card mb-3">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-pie-chart"></i> By Category</h5></div>
                        <div class="card-body">
                            <canvas id="expense-pie-chart" height="200"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-gear"></i> Budget Settings</h5></div>
                        <div class="card-body" id="budget-section"></div>
                    </div>
                </div>
            </div>`;

        container.innerHTML = html;
        this.renderExpenses();
        this.renderBudget();
        this.renderPieChart();
    },

    renderExpenses() {
        const container = document.getElementById('expenses-list');
        if (!container) return;

        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-4">
                    <i class="bi bi-wallet2"></i>
                    <p>No expenses recorded yet.</p>
                    <button class="btn btn-primary btn-sm" onclick="ExpensesModule.showExpenseModal()">
                        <i class="bi bi-plus-lg"></i> Add Your First Expense
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = this.expenses.map(e => {
            const cat = this.categories.find(c => c.name === e.category) || { icon: 'bi-three-dots', color: '#95A5A6' };
            return `
                <div class="expense-item">
                    <div class="d-flex align-items-center flex-grow-1">
                        <div class="expense-icon" style="background:${cat.color}20; color:${cat.color}">
                            <i class="bi ${cat.icon}"></i>
                        </div>
                        <div class="ms-3 flex-grow-1">
                            <div class="fw-semibold">${Utils.esc(e.description || e.category)}</div>
                            <div class="text-muted small">
                                <span class="badge bg-light text-dark me-1">${Utils.esc(e.category)}</span>
                                ${Utils.timeAgo(e.date)}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold text-danger">Rs.${e.amount.toFixed(0)}</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="ExpensesModule.deleteExpense('${e.id}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    },

    renderBudget() {
        const container = document.getElementById('budget-section');
        if (!container) return;

        container.innerHTML = `
            <div class="input-group mb-2">
                <span class="input-group-text">Rs.</span>
                <input type="number" class="form-control" id="budget-input" value="${this.stats?.budget || 0}" placeholder="Monthly budget" min="0">
                <button class="btn btn-primary" onclick="ExpensesModule.saveBudget()">Save</button>
            </div>
            <small class="text-muted">Set your monthly spending limit to get alerts.</small>`;
    },

    renderPieChart() {
        const canvas = document.getElementById('expense-pie-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.pieChart) this.pieChart.destroy();

        const breakdown = this.stats?.category_breakdown || {};
        const labels = Object.keys(breakdown);
        const values = Object.values(breakdown);

        if (labels.length === 0) {
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = 'block';

        const colors = labels.map(l => {
            const cat = this.categories.find(c => c.name === l);
            return cat ? cat.color : '#95A5A6';
        });

        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

        this.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: isDark ? 'var(--bs-body-bg)' : '#fff',
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } },
                },
                cutout: '60%',
            },
        });
    },

    async filterByCategory(category) {
        this.filter.category = category;
        try {
            const url = category ? `/expenses?category=${encodeURIComponent(category)}` : '/expenses';
            const data = await API.get(url);
            this.expenses = data.expenses || [];
            this.renderExpenses();
        } catch (e) {
            Utils.showToast('Failed to filter', 'error');
        }
    },

    async saveBudget() {
        const budget = parseFloat(document.getElementById('budget-input').value) || 0;
        if (budget < 0) {
            Utils.showToast('Budget must be non-negative', 'warning');
            return;
        }
        try {
            await API.put('/expenses/budget', { monthly_budget: budget });
            this.loadAll();
            Utils.showToast('Budget saved', 'success');
            document.dispatchEvent(new CustomEvent('dashboard:refresh'));
        } catch (e) {
            Utils.showToast('Failed to save budget', 'error');
        }
    },

    async showAnalytics() {
        try {
            const data = await API.get('/expenses/analytics');
            this.renderAnalyticsModal(data);
        } catch (e) {
            Utils.showToast('Failed to load analytics', 'error');
        }
    },

    renderAnalyticsModal(data) {
        const modalId = 'analytics-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const momIcon = data.mom_change > 0 ? 'bi-arrow-up text-danger' : data.mom_change < 0 ? 'bi-arrow-down text-success' : 'bi-dash text-muted';
        const momText = data.mom_change > 0 ? `+${data.mom_change}%` : data.mom_change < 0 ? `${data.mom_change}%` : 'No change';

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-graph-up"></i> Expense Analytics</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <div class="analytics-card">
                                    <div class="text-muted small">This Month</div>
                                    <div class="fs-4 fw-bold">Rs.${data.total_this_month.toFixed(0)}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="analytics-card">
                                    <div class="text-muted small">vs Last Month</div>
                                    <div class="fs-4 fw-bold"><i class="bi ${momIcon}"></i> ${momText}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="analytics-card">
                                    <div class="text-muted small">Avg Daily</div>
                                    <div class="fs-4 fw-bold">Rs.${data.avg_daily.toFixed(0)}</div>
                                </div>
                            </div>
                        </div>

                        <h6 class="mb-2">Top Categories</h6>
                        <div class="mb-3">
                            ${data.top_categories.map((c, i) => {
            const cat = this.categories.find(cat => cat.name === c.name) || { color: '#95A5A6' };
            const percent = data.total_this_month > 0 ? (c.amount / data.total_this_month * 100).toFixed(1) : 0;
            return `
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="me-2" style="width:20px; height:20px; border-radius:4px; background:${cat.color}; display:inline-block"></span>
                                        <span class="flex-grow-1">${Utils.esc(c.name)}</span>
                                        <span class="fw-bold me-2">Rs.${c.amount.toFixed(0)}</span>
                                        <span class="text-muted small">${percent}%</span>
                                    </div>`;
        }).join('')}
                        </div>

                        <h6 class="mb-2">Daily Spending Trend</h6>
                        <canvas id="expense-trend-chart" height="100"></canvas>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        // Render trend chart
        const trendCanvas = document.getElementById('expense-trend-chart');
        if (trendCanvas && Object.keys(data.daily_spending).length > 0) {
            const labels = Object.keys(data.daily_spending).map(d => d.slice(8)); // Get day number
            const values = Object.values(data.daily_spending);
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

            new Chart(trendCanvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Spending',
                        data: values,
                        backgroundColor: isDark ? 'rgba(13,110,253,0.4)' : 'rgba(13,110,253,0.3)',
                        borderColor: 'var(--bs-primary)',
                        borderWidth: 1,
                    }],
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true },
                    },
                },
            });
        }

        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    showExpenseModal() {
        const modalId = 'expense-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-plus-circle"></i> Add Expense</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="expense-form">
                            <div class="mb-3">
                                <label class="form-label">Amount *</label>
                                <div class="input-group">
                                    <span class="input-group-text">Rs.</span>
                                    <input type="number" class="form-control" name="amount" required step="0.01" min="0.01" placeholder="0.00">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Category *</label>
                                <select class="form-select" name="category" required>
                                    ${this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Payment Method</label>
                                <select class="form-select" name="payment_method">
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="online">Online</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Date</label>
                                <input type="date" class="form-control" name="date" value="${Utils.today()}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <input type="text" class="form-control" name="description" maxlength="200" placeholder="What was this expense for?">
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-plus-lg"></i> Add Expense
                            </button>
                        </form>
                    </div>
                </div></div>
            </div>`;
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.amount = parseFloat(data.amount);
            try {
                await API.post('/expenses', data);
                modal.hide();
                this.loadAll();
                Utils.showToast('Expense added', 'success');
                document.dispatchEvent(new CustomEvent('dashboard:refresh'));
            } catch (err) {
                Utils.showToast(err.message || 'Failed to add expense', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async deleteExpense(expenseId) {
        const confirmed = await Utils.confirm('Delete', 'Delete this expense?');
        if (!confirmed) return;
        try {
            await API.delete(`/expenses/${expenseId}`);
            this.loadAll();
            Utils.showToast('Expense deleted', 'success');
            document.dispatchEvent(new CustomEvent('dashboard:refresh'));
        } catch (e) {
            Utils.showToast('Failed to delete', 'error');
        }
    },
};

App.registerModule('expenses', () => ExpensesModule.render());
