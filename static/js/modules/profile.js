// Profile & Settings Module - Enhanced v2.0

const ProfileModule = {
    profile: null,
    stats: null,

    async render() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="section-header"><h3><i class="bi bi-person-circle"></i> Profile & Settings</h3></div>
            <div id="profile-dashboard">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
            </div>`;

        await Promise.all([this.loadProfile(), this.loadStats()]);
    },

    async loadProfile() {
        try {
            const data = await API.get('/profile');
            this.profile = data.profile || {};
        } catch (e) {
            this.profile = App.currentUser || {};
        }
    },

    async loadStats() {
        try {
            this.stats = await API.get('/profile/stats');
        } catch (e) {
            this.stats = null;
        }
        this.renderDashboard();
    },

    renderDashboard() {
        const container = document.getElementById('profile-dashboard');
        const user = this.profile;
        const s = this.stats;

        let html = `
            <div class="row g-3">
                <!-- Profile Card -->
                <div class="col-lg-4">
                    <div class="card profile-card text-center">
                        <div class="card-body">
                            <div class="profile-avatar mb-3 position-relative d-inline-block">
                                <div class="avatar-circle" onclick="document.getElementById('avatar-input').click()" title="Click to change avatar">
                                    ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : Utils.esc(user.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="ProfileModule.handleAvatar(event)">
                                <span class="avatar-edit-badge"><i class="bi bi-camera"></i></span>
                            </div>
                            <h5 class="mb-1">${Utils.esc(user.name || '')}</h5>
                            <p class="text-muted small mb-2">${Utils.esc(user.email || '')}</p>
                            <div class="mb-2">
                                ${user.email_verified
                                    ? '<span class="badge bg-success me-1"><i class="bi bi-check-circle"></i> Verified</span>'
                                    : '<span class="badge bg-warning text-dark me-1"><i class="bi bi-exclamation-circle"></i> Unverified</span>'}
                                ${user.two_factor_enabled
                                    ? '<span class="badge bg-success"><i class="bi bi-shield-lock"></i> 2FA</span>'
                                    : '<span class="badge bg-secondary"><i class="bi bi-shield-x"></i> No 2FA</span>'}
                            </div>
                            <div class="text-muted small">
                                ${user.roll_no ? `<span>${Utils.esc(user.roll_no)}</span>` : ''}
                                ${user.branch ? `<span> | ${Utils.esc(user.branch)}</span>` : ''}
                                ${user.semester ? `<span> | Sem ${Utils.esc(user.semester)}</span>` : ''}
                            </div>
                            ${s ? `<div class="text-muted small mt-1"><i class="bi bi-calendar3"></i> Member for ${s.account_age_days} days</div>` : ''}
                        </div>
                    </div>

                    ${s ? `
                    <div class="card mt-3">
                        <div class="card-header"><h6 class="mb-0"><i class="bi bi-bar-chart"></i> Activity</h6></div>
                        <div class="card-body p-0">
                            <div class="profile-stat-row">
                                <span><i class="bi bi-list-check text-primary"></i> Tasks</span>
                                <span class="fw-bold">${s.tasks.completed}/${s.tasks.total}</span>
                            </div>
                            <div class="profile-stat-row">
                                <span><i class="bi bi-calendar-check text-success"></i> Attendance</span>
                                <span class="fw-bold">${s.attendance.percentage}%</span>
                            </div>
                            <div class="profile-stat-row">
                                <span><i class="bi bi-journal-bookmark text-warning"></i> Exams</span>
                                <span class="fw-bold">${s.exam_subjects}</span>
                            </div>
                            <div class="profile-stat-row">
                                <span><i class="bi bi-table text-info"></i> Timetable</span>
                                <span class="fw-bold">${s.timetable_entries} classes</span>
                            </div>
                            <div class="profile-stat-row">
                                <span><i class="bi bi-calculator text-primary"></i> GPA</span>
                                <span class="fw-bold">${s.gpa_semesters} semesters</span>
                            </div>
                            <div class="profile-stat-row">
                                <span><i class="bi bi-wallet2 text-danger"></i> Expenses</span>
                                <span class="fw-bold">${s.expenses_this_month} this month</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div class="col-lg-8">
                    <!-- Edit Profile -->
                    <div class="card mb-3">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-pencil"></i> Edit Profile</h5></div>
                        <div class="card-body">
                            <form id="profile-form">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Name</label>
                                        <input type="text" class="form-control" name="name" value="${Utils.esc(user.name || '')}" maxlength="100">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Roll No</label>
                                        <input type="text" class="form-control" name="roll_no" value="${Utils.esc(user.roll_no || '')}" maxlength="100">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Branch</label>
                                        <input type="text" class="form-control" name="branch" value="${Utils.esc(user.branch || '')}" maxlength="100">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Semester</label>
                                        <input type="text" class="form-control" name="semester" value="${Utils.esc(user.semester || '')}" maxlength="10">
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary mt-3"><i class="bi bi-check-lg"></i> Save Changes</button>
                            </form>
                        </div>
                    </div>

                    <!-- Security Settings -->
                    <div class="card mb-3">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-shield-lock"></i> Security</h5></div>
                        <div class="card-body">
                            <div class="accordion" id="securityAccordion">
                                <!-- Change Password -->
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsePassword">Change Password</button>
                                    </h2>
                                    <div id="collapsePassword" class="accordion-collapse collapse" data-bs-parent="#securityAccordion">
                                        <div class="accordion-body">
                                            <form id="change-password-form">
                                                <div class="mb-3">
                                                    <label class="form-label">Current Password</label>
                                                    <input type="password" class="form-control" name="current_password" required>
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label">New Password</label>
                                                    <input type="password" class="form-control" name="new_password" minlength="6" required>
                                                </div>
                                                <button type="submit" class="btn btn-warning"><i class="bi bi-key"></i> Change Password</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <!-- Two-Factor Auth -->
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse2FA">Two-Factor Authentication</button>
                                    </h2>
                                    <div id="collapse2FA" class="accordion-collapse collapse" data-bs-parent="#securityAccordion">
                                        <div class="accordion-body" id="2fa-settings">
                                            <p>Status: ${user.two_factor_enabled
                                                ? '<span class="badge bg-success">Enabled</span>'
                                                : '<span class="badge bg-secondary">Disabled</span>'}</p>
                                            <div id="2fa-actions">
                                                ${user.two_factor_enabled
                                                    ? `<form id="disable-2fa-form">
                                                        <p class="text-muted small">Enter your password to disable 2FA</p>
                                                        <div class="mb-3"><input type="password" class="form-control" name="password" placeholder="Your password" required></div>
                                                        <button type="submit" class="btn btn-outline-danger">Disable 2FA</button>
                                                       </form>`
                                                    : `<button class="btn btn-outline-success" onclick="ProfileModule.setup2FA()"><i class="bi bi-shield-lock"></i> Enable 2FA</button>`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Email Verification -->
                                ${!user.email_verified ? `
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseEmail">Verify Email</button>
                                    </h2>
                                    <div id="collapseEmail" class="accordion-collapse collapse" data-bs-parent="#securityAccordion">
                                        <div class="accordion-body">
                                            <form id="verify-email-form">
                                                <p class="text-muted small">Enter the OTP sent to your email</p>
                                                <div class="mb-3"><input type="text" class="form-control" name="otp" placeholder="6-digit OTP" maxlength="6" required></div>
                                                <div class="d-flex gap-2">
                                                    <button type="submit" class="btn btn-success">Verify</button>
                                                    <button type="button" class="btn btn-outline-secondary" onclick="ProfileModule.sendVerificationOTP()">Resend OTP</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Login History -->
                    <div class="card mb-3">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-clock-history"></i> Login History</h5></div>
                        <div class="card-body" id="login-history">
                            <div class="text-center py-2"><div class="spinner-border spinner-border-sm"></div></div>
                        </div>
                    </div>

                    <!-- Settings -->
                    <div class="card mb-3">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-gear"></i> Preferences</h5></div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">Theme</label>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="theme-switch" ${document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'checked' : ''} onchange="App.toggleTheme()">
                                    <label class="form-check-label" for="theme-switch">Dark Mode</label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Notification Preferences</label>
                                <div id="notif-prefs">
                                    ${['tasks', 'attendance', 'exams', 'budget', 'timetable'].map(k => `
                                        <div class="form-check form-switch">
                                            <input class="form-check-input notif-pref-check" type="checkbox" id="pref-${k}" ${(user.notification_settings || {})[k] !== false ? 'checked' : ''} data-key="${k}">
                                            <label class="form-check-label" for="pref-${k}">${k.charAt(0).toUpperCase() + k.slice(1)} Alerts</label>
                                        </div>
                                    `).join('')}
                                </div>
                                <button class="btn btn-sm btn-outline-primary mt-2" onclick="ProfileModule.saveNotifPrefs()"><i class="bi bi-check-lg"></i> Save Preferences</button>
                            </div>
                        </div>
                    </div>

                    <!-- Data Management -->
                    <div class="card mb-3">
                        <div class="card-header"><h5 class="mb-0"><i class="bi bi-database"></i> Data Management</h5></div>
                        <div class="card-body">
                            <div class="d-flex gap-2 flex-wrap">
                                <button class="btn btn-outline-info" onclick="ProfileModule.exportData()"><i class="bi bi-download"></i> Export All Data</button>
                                <button class="btn btn-outline-warning" onclick="document.getElementById('import-file').click()"><i class="bi bi-upload"></i> Import Data</button>
                                <input type="file" id="import-file" accept=".json" style="display:none" onchange="ProfileModule.importData(event)">
                            </div>
                        </div>
                    </div>

                    <!-- Danger Zone -->
                    <div class="card border-danger">
                        <div class="card-header bg-danger bg-opacity-10"><h5 class="mb-0 text-danger"><i class="bi bi-exclamation-triangle"></i> Danger Zone</h5></div>
                        <div class="card-body">
                            <p class="text-muted small">Permanently delete your account and all associated data. This action cannot be undone.</p>
                            <button class="btn btn-outline-danger" onclick="ProfileModule.showDeleteAccount()"><i class="bi bi-trash"></i> Delete My Account</button>
                        </div>
                    </div>
                </div>
            </div>`;

        container.innerHTML = html;
        this.bindEvents();
        this.loadLoginHistory();
    },

    bindEvents() {
        // Profile form
        document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.put('/profile', data);
                App.currentUser = { ...App.currentUser, ...data };
                App.updateNavUser();
                Utils.showToast('Profile updated', 'success');
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });

        // Change password
        document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.post('/auth/change-password', data);
                Utils.showToast('Password changed', 'success');
                e.target.reset();
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });

        // Disable 2FA
        document.getElementById('disable-2fa-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.post('/auth/2fa/disable', data);
                App.currentUser.two_factor_enabled = false;
                Utils.showToast('2FA disabled', 'success');
                this.render();
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });

        // Verify email
        document.getElementById('verify-email-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.post('/auth/verify-email', data);
                App.currentUser.email_verified = true;
                Utils.showToast('Email verified!', 'success');
                this.render();
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });
    },

    async loadLoginHistory() {
        const container = document.getElementById('login-history');
        if (!container) return;
        try {
            const data = await API.get('/auth/login-history');
            const history = data.history || [];
            if (history.length === 0) {
                container.innerHTML = '<p class="text-muted small mb-0">No login history available.</p>';
                return;
            }
            container.innerHTML = `<div class="table-responsive"><table class="table table-sm table-hover mb-0">
                <thead><tr><th>Date</th><th>IP Address</th><th>Device</th></tr></thead>
                <tbody>${history.slice(0, 10).map(h => `
                    <tr>
                        <td class="small">${Utils.formatDate(h.created_at)}</td>
                        <td class="small">${Utils.esc(h.ip_address || 'N/A')}</td>
                        <td class="small text-truncate" style="max-width:200px" title="${Utils.esc(h.user_agent || '')}">${this._parseUA(h.user_agent || '')}</td>
                    </tr>
                `).join('')}</tbody>
            </table></div>`;
        } catch (e) {
            container.innerHTML = '<p class="text-muted small mb-0">Failed to load history.</p>';
        }
    },

    _parseUA(ua) {
        if (!ua) return 'Unknown';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return Utils.esc(ua.substring(0, 30));
    },

    async sendVerificationOTP() {
        try {
            await API.post('/auth/send-verification');
            Utils.showToast('OTP sent to your email', 'success');
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    async setup2FA() {
        try {
            const data = await API.get('/auth/2fa/setup');
            if (data.enabled) {
                Utils.showToast('2FA is already enabled', 'info');
                return;
            }
            this.show2FASetupModal(data.secret, data.qr_uri);
        } catch (e) { Utils.showToast(e.message, 'error'); }
    },

    show2FASetupModal(secret, qrUri) {
        const modalId = '2fa-setup-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title"><i class="bi bi-shield-lock"></i> Enable 2FA</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <ol class="mb-3">
                            <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                            <li>Scan the QR code or enter the secret key manually</li>
                            <li>Enter the 6-digit code to confirm</li>
                        </ol>
                        <div class="text-center mb-3">
                            <div class="bg-white p-3 rounded d-inline-block">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}" alt="QR Code" style="width:200px;height:200px">
                            </div>
                            <div class="mt-2"><small class="text-muted">Secret: <code>${Utils.esc(secret)}</code></small></div>
                        </div>
                        <form id="2fa-verify-setup-form">
                            <div class="mb-3">
                                <label class="form-label">Verification Code</label>
                                <input type="text" class="form-control text-center fs-4" name="code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required style="letter-spacing:8px">
                            </div>
                            <button type="submit" class="btn btn-success w-100">Enable 2FA</button>
                        </form>
                    </div>
                </div></div>
            </div>`;

        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('2fa-verify-setup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = new FormData(e.target).get('code');
            try {
                await API.post('/auth/2fa/verify-setup', { code });
                App.currentUser.two_factor_enabled = true;
                modal.hide();
                Utils.showToast('2FA enabled!', 'success');
                this.render();
            } catch (err) { Utils.showToast(err.message, 'error'); }
        });

        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },

    async handleAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            Utils.showToast('Image must be under 2MB', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = async function (e) {
            const img = new Image();
            img.onload = async function () {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height, 200);
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                try {
                    await API.post('/profile/avatar', { avatar: base64 });
                    App.currentUser.avatar = base64;
                    App.updateNavUser();
                    ProfileModule.render();
                    Utils.showToast('Avatar updated', 'success');
                } catch (err) { Utils.showToast(err.message, 'error'); }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async saveNotifPrefs() {
        const prefs = {};
        document.querySelectorAll('.notif-pref-check').forEach(cb => {
            prefs[cb.dataset.key] = cb.checked;
        });
        try {
            await API.put('/notifications/settings', prefs);
            App.currentUser.notification_settings = prefs;
            Utils.showToast('Preferences saved', 'success');
        } catch (e) { Utils.showToast('Failed', 'error'); }
    },

    async exportData() {
        try {
            const data = await API.get('/profile/export');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `student-companion-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Utils.showToast('Data exported', 'success');
        } catch (e) { Utils.showToast('Export failed', 'error'); }
    },

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const confirmed = await Utils.confirm('Import Data', 'This will add imported records to your current data. Continue?');
        if (!confirmed) { event.target.value = ''; return; }

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await API.post('/profile/import', { import_data: data.export_data || data });
            Utils.showToast(`Imported ${result.imported || 0} records`, 'success');
        } catch (e) {
            Utils.showToast('Import failed: ' + e.message, 'error');
        }
        event.target.value = '';
    },

    showDeleteAccount() {
        const modalId = 'delete-account-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const html = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog"><div class="modal-content border-danger">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title"><i class="bi bi-exclamation-triangle"></i> Delete Account</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger">
                            <strong>Warning:</strong> This will permanently delete your account and ALL data including tasks, attendance, exams, timetable, GPA, expenses, and reminders. This cannot be undone.
                        </div>
                        <form id="delete-account-form">
                            <div class="mb-3">
                                <label class="form-label">Enter your password to confirm</label>
                                <input type="password" class="form-control" name="password" required placeholder="Your password">
                            </div>
                            <button type="submit" class="btn btn-danger w-100"><i class="bi bi-trash"></i> Permanently Delete Account</button>
                        </form>
                    </div>
                </div></div>
            </div>`;

        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('delete-account-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = new FormData(e.target).get('password');
            try {
                await API.delete('/profile/account', { password });
                modal.hide();
                Utils.showToast('Account deleted. Goodbye!', 'info');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.reload();
                }, 1500);
            } catch (err) {
                Utils.showToast(err.message || 'Failed', 'error');
            }
        });
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => document.getElementById(modalId).remove());
    },
};

App.registerModule('profile', () => ProfileModule.render());
