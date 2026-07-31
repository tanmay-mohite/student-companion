// Utility functions

const Utils = {
    // Escape HTML special characters to prevent XSS
    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    },
    // Show Bootstrap toast
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const id = 'toast-' + Date.now();
        const bgClass = type === 'error' ? 'bg-danger' : type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning' : 'bg-info';
        const html = `
            <div id="${id}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
        const toastEl = document.getElementById(id);
        const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    // Show confirmation dialog (returns Promise)
    confirm(title, message) {
        return new Promise((resolve) => {
            const modalId = 'confirm-modal-' + Date.now();
            const html = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog modal-sm">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">${title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                            <div class="modal-body">${message}</div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button class="btn btn-danger" id="${modalId}-confirm">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
            const modalEl = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalEl);
            document.getElementById(`${modalId}-confirm`).addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            modalEl.addEventListener('hidden.bs.modal', () => {
                modalEl.remove();
                resolve(false);
            });
            modal.show();
        });
    },

    // Format date
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    // Get today's date as YYYY-MM-DD
    today() {
        return new Date().toISOString().split('T')[0];
    },

    // Get day name
    dayName(index) {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
    },

    // Debounce
    debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // Priority color
    priorityColor(priority) {
        return { high: 'danger', medium: 'warning', low: 'success' }[priority] || 'secondary';
    },

    // Status badge HTML
    statusBadge(status) {
        const map = { todo: 'secondary', in_progress: 'primary', completed: 'success' };
        const label = { todo: 'To-Do', in_progress: 'In Progress', completed: 'Completed' };
        return `<span class="badge bg-${map[status]} status-badge">${label[status]}</span>`;
    },

    // Category icon
    categoryIcon(category) {
        const icons = {
            Food: 'bi-cup-hot', Transport: 'bi-bus-front', Books: 'bi-book',
            Entertainment: 'bi-controller', Shopping: 'bi-cart', Rent: 'bi-house',
            Other: 'bi-three-dots'
        };
        return icons[category] || 'bi-tag';
    }
};
