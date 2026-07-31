// Main App Controller

const App = {
    currentUser: null,
    currentPage: null,
    moduleRenderers: {},
    lastUnreadCount: 0,
    notificationIntervalId: null,

    async init() {
        this.setupSidebarToggle();
        this.setupLogout();
        this.setupMarkAllRead();

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const data = await API.get('/auth/me');
                this.currentUser = data.user;
                this.showApp();
                this.applyTheme(this.currentUser.theme || 'light');
                this.updateNavUser();
            } catch (e) {
                API.clearTokens();
                this.showAuth();
            }
        } else {
            this.showAuth();
        }

        window.addEventListener('hashchange', () => this.route());
        if (this.currentUser) {
            this.route();
            // Trigger app ready event
            document.dispatchEvent(new CustomEvent('app:ready'));
        }
    },

    // Register a module's render function
    registerModule(name, renderFn) {
        this.moduleRenderers[name] = renderFn;
    },

    // Routing
    route() {
        const hash = location.hash.slice(1) || 'dashboard';
        if (!this.currentUser && hash !== 'login') return;

        // Update active nav
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + hash);
        });

        // Special case for notifications page vs bell
        if (hash === 'notifications' && typeof NotificationsModule !== 'undefined') {
            this.currentPage = 'notifications';
            NotificationsModule.renderPage();
            return;
        }

        const renderer = this.moduleRenderers[hash];
        if (renderer) {
            this.currentPage = hash;
            renderer();
        } else if (hash === 'dashboard') {
            this.currentPage = 'dashboard';
            if (typeof DashboardModule !== 'undefined') DashboardModule.render();
        }
    },

    navigate(page) {
        location.hash = '#' + page;
    },

    // Auth
    showAuth() {
        document.getElementById('auth-container').classList.remove('d-none');
        document.getElementById('app-container').classList.add('d-none');
        this.renderAuthForm('login');
        document.getElementById('auth-toggle-link').onclick = (e) => {
            e.preventDefault();
            const current = document.getElementById('auth-form-container').dataset.mode;
            this.renderAuthForm(current === 'login' ? 'register' : 'login');
        };
    },

    showApp() {
        document.getElementById('auth-container').classList.add('d-none');
        document.getElementById('app-container').classList.remove('d-none');
    },

    renderAuthForm(mode) {
        const container = document.getElementById('auth-form-container');
        container.dataset.mode = mode;
        const isLogin = mode === 'login';
        document.getElementById('auth-toggle-link').textContent = isLogin ? 'Create an account' : 'Already have an account? Sign in';

        container.innerHTML = `
            <div class="card auth-card">
                <div class="card-body p-4">
                    <h4 class="text-center mb-4">${isLogin ? 'Welcome Back' : 'Create Account'}</h4>
                    <form id="auth-form">
                        ${!isLogin ? '<div class="mb-3"><label class="form-label">Full Name</label><input type="text" name="name" class="form-control" required></div>' : ''}
                        <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" required></div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input type="password" name="password" class="form-control" required minlength="6" id="auth-password">
                            ${!isLogin ? '<div id="password-strength" class="mt-1"></div>' : ''}
                        </div>
                        ${isLogin ? `
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="remember-me" name="remember_me">
                                <label class="form-check-label small" for="remember-me">Remember me</label>
                            </div>
                            <a href="#" id="forgot-password-link" class="text-decoration-none small">Forgot password?</a>
                        </div>` : ''}
                        ${!isLogin ? `
                        <div class="row mb-3">
                            <div class="col-6"><label class="form-label">Roll No</label><input type="text" name="roll_no" class="form-control"></div>
                            <div class="col-6"><label class="form-label">Branch</label><input type="text" name="branch" class="form-control"></div>
                        </div>
                        <div class="mb-3"><label class="form-label">Semester</label><input type="text" name="semester" class="form-control"></div>` : ''}
                        <button type="submit" class="btn btn-primary w-100">${isLogin ? 'Sign In' : 'Create Account'}</button>
                    </form>
                    <div class="text-center mt-3">
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <hr class="flex-grow-1"><span class="text-muted small">or</span><hr class="flex-grow-1">
                        </div>
                        <button class="btn btn-outline-danger w-100" id="google-login-btn">
                            <i class="bi bi-google me-2"></i>Continue with Google
                        </button>
                    </div>
                </div>
            </div>`;

        // Password strength indicator for registration
        if (!isLogin) {
            const passwordInput = document.getElementById('auth-password');
            passwordInput.addEventListener('input', Utils.debounce(async (e) => {
                const pwd = e.target.value;
                if (pwd.length < 1) {
                    document.getElementById('password-strength').innerHTML = '';
                    return;
                }
                try {
                    const result = await API.post('/auth/password-strength', { password: pwd });
                    const s = result.strength;
                    const colorMap = { weak: 'danger', fair: 'warning', good: 'info', strong: 'success' };
                    const pct = Math.round((s.score / s.max_score) * 100);
                    document.getElementById('password-strength').innerHTML = `
                        <div class="progress" style="height:4px"><div class="progress-bar bg-${colorMap[s.label]}" style="width:${pct}%"></div></div>
                        <small class="text-${colorMap[s.label]}">${s.label.charAt(0).toUpperCase() + s.label.slice(1)}</small>`;
                } catch (e) { /* ignore */ }
            }, 300));
        }

        // Forgot password link
        if (isLogin) {
            document.getElementById('forgot-password-link').addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPassword();
            });
        }

        // Google login
        document.getElementById('google-login-btn').addEventListener('click', () => {
            this.initGoogleSignIn();
        });

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            if (isLogin) {
                data.remember_me = document.getElementById('remember-me')?.checked || false;
            }
            try {
                const endpoint = isLogin ? '/auth/login' : '/auth/register';
                const result = await API.post(endpoint, data);

                // Check if 2FA is required
                if (result.requires_2fa) {
                    this.show2FAVerification(result.user_id, data.remember_me || false);
                    return;
                }

                API.setTokens(result.token, result.refresh_token);
                this.currentUser = result.user;
                this.showApp();
                this.applyTheme(result.user.theme || 'light');
                this.updateNavUser();
                this.navigate('dashboard');
                Utils.showToast(`Welcome, ${result.user.name}!`, 'success');

                // Check email verification status
                if (!result.user.email_verified) {
                    setTimeout(() => {
                        Utils.showToast('Please verify your email. Check notifications for OTP.', 'warning');
                    }, 2000);
                }
            } catch (err) {
                Utils.showToast(err.message, 'error');
            }
        });
    },

    // 2FA Verification
    show2FAVerification(userId, rememberMe) {
        const container = document.getElementById('auth-form-container');
        container.dataset.mode = '2fa';
        container.innerHTML = `
            <div class="card auth-card">
                <div class="card-body p-4">
                    <h4 class="text-center mb-3"><i class="bi bi-shield-lock"></i> Two-Factor Authentication</h4>
                    <p class="text-center text-muted small mb-4">Enter the 6-digit code from your authenticator app</p>
                    <form id="2fa-form">
                        <div class="mb-3">
                            <input type="text" class="form-control text-center fs-4" name="code"
                                placeholder="000000" maxlength="6" pattern="[0-9]{6}" required autofocus
                                style="letter-spacing: 8px;">
                        </div>
                        <input type="hidden" name="user_id" value="${userId}">
                        <input type="hidden" name="remember_me" value="${rememberMe}">
                        <button type="submit" class="btn btn-primary w-100">Verify</button>
                    </form>
                    <p class="text-center mt-3">
                        <a href="#" id="back-to-login" class="text-decoration-none small">Back to login</a>
                    </p>
                </div>
            </div>`;

        document.getElementById('back-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.renderAuthForm('login');
        });

        document.getElementById('2fa-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.remember_me = rememberMe;
            try {
                const result = await API.post('/auth/verify-2fa', data);
                API.setTokens(result.token, result.refresh_token);
                this.currentUser = result.user;
                this.showApp();
                this.applyTheme(result.user.theme || 'light');
                this.updateNavUser();
                this.navigate('dashboard');
                Utils.showToast(`Welcome back, ${result.user.name}!`, 'success');
            } catch (err) {
                Utils.showToast(err.message, 'error');
            }
        });
    },

    // Forgot Password Flow
    showForgotPassword() {
        const container = document.getElementById('auth-form-container');
        container.dataset.mode = 'forgot-password';
        container.innerHTML = `
            <div class="card auth-card">
                <div class="card-body p-4">
                    <h4 class="text-center mb-3">Reset Password</h4>
                    <div id="forgot-step-1">
                        <p class="text-muted small text-center mb-3">Enter your email to receive a reset OTP</p>
                        <form id="forgot-form">
                            <div class="mb-3"><input type="email" name="email" class="form-control" placeholder="your@email.com" required></div>
                            <button type="submit" class="btn btn-primary w-100">Send OTP</button>
                        </form>
                    </div>
                    <div id="forgot-step-2" class="d-none">
                        <p class="text-muted small text-center mb-3">Enter the OTP and your new password</p>
                        <form id="reset-form">
                            <input type="hidden" name="email" id="reset-email">
                            <div class="mb-3"><label class="form-label">OTP</label><input type="text" name="otp" class="form-control" maxlength="6" required></div>
                            <div class="mb-3"><label class="form-label">New Password</label><input type="password" name="new_password" class="form-control" minlength="6" required></div>
                            <button type="submit" class="btn btn-primary w-100">Reset Password</button>
                        </form>
                    </div>
                    <p class="text-center mt-3">
                        <a href="#" id="back-to-login-2" class="text-decoration-none small">Back to login</a>
                    </p>
                </div>
            </div>`;

        document.getElementById('back-to-login-2').addEventListener('click', (e) => {
            e.preventDefault();
            this.renderAuthForm('login');
        });

        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = new FormData(e.target).get('email');
            try {
                await API.post('/auth/forgot-password', { email });
                document.getElementById('forgot-step-1').classList.add('d-none');
                document.getElementById('forgot-step-2').classList.remove('d-none');
                document.getElementById('reset-email').value = email;
                Utils.showToast('OTP sent to your email', 'success');
            } catch (err) {
                Utils.showToast(err.message, 'error');
            }
        });

        document.getElementById('reset-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.post('/auth/reset-password', data);
                Utils.showToast('Password reset successfully! Please login.', 'success');
                this.renderAuthForm('login');
            } catch (err) {
                Utils.showToast(err.message, 'error');
            }
        });
    },

    // ============================================================
    // Google Sign-In
    // ============================================================

    initGoogleSignIn() {
        // Fetch Google Client ID from config endpoint
        fetch('/api/config/google-client-id')
            .then(r => r.json())
            .then(data => {
                const clientId = data.client_id;
                if (!clientId) {
                    Utils.showToast('Google OAuth is not configured. Please contact admin.', 'error');
                    return;
                }

                // Check if Google API is loaded
                if (typeof google === 'undefined') {
                    Utils.showToast('Google Sign-In is loading. Please try again.', 'warning');
                    return;
                }

                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => this.handleGoogleResponse(response),
                });

                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        // Fallback: open popup
                        google.accounts.id.renderButton(
                            document.createElement('div'),
                            { theme: 'outline', size: 'large' }
                        );
                    }
                });
            })
            .catch(err => {
                Utils.showToast('Failed to initialize Google Sign-In', 'error');
            });
    },

    async handleGoogleResponse(response) {
        try {
            const result = await API.post('/auth/google', {
                credential: response.credential,
                remember_me: false,
            });

            API.setTokens(result.token, result.refresh_token);
            this.currentUser = result.user;
            this.showApp();
            this.applyTheme(result.user.theme || 'light');
            this.updateNavUser();
            this.navigate('dashboard');
            Utils.showToast(`Welcome, ${result.user.name}!`, 'success');
        } catch (err) {
            Utils.showToast(err.message || 'Google Sign-In failed', 'error');
        }
    },

    logout() {
        API.clearTokens();
        this.currentUser = null;
        this.showAuth();
        Utils.showToast('Logged out', 'info');
        // Stop notification checker when logging out
        this.stopNotificationChecker();
    },

    setupLogout() {
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    },

    setupSidebarToggle() {
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('show');
        });
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                document.getElementById('sidebar').classList.remove('show');
            });
        });
    },

    setupMarkAllRead() {
        document.getElementById('mark-all-read-btn').addEventListener('click', async () => {
            try {
                await API.put('/notifications/mark-all-read');
                this.loadNotifBell();
            } catch (e) { /* ignore */ }
        });
    },

    // Theme
    applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        document.getElementById('main-navbar').className =
            `navbar navbar-expand-lg sticky-top shadow-sm ${theme === 'dark' ? 'navbar-dark bg-dark' : 'navbar-light bg-white'}`;
    },

    toggleTheme() {
        const newTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        if (this.currentUser) {
            this.currentUser.theme = newTheme;
            API.put('/profile', { theme: newTheme }).catch(() => { });
        }
        // Re-render the current page so charts and theme-computed colors update live
        if (this.currentUser && this.currentPage) this.route();
    },

    // Update nav user info
    updateNavUser() {
        if (!this.currentUser) return;
        document.getElementById('user-name-nav').textContent = this.currentUser.name;
        const avatar = document.getElementById('user-avatar-small');
        if (this.currentUser.avatar) {
            avatar.innerHTML = `<img src="${this.currentUser.avatar}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;
        } else {
            avatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
        }
    },

    // Stop checking for notifications
    stopNotificationChecker() {
        if (this.notificationIntervalId) {
            clearInterval(this.notificationIntervalId);
            this.notificationIntervalId = null;
        }
    },

    // Load notification bell
    async loadNotifBell() {
        try {
            const data = await API.get('/notifications');
            const count = data.unread_count || 0;
            const badge = document.getElementById('notif-count');
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
            const list = document.getElementById('notif-list');
            const notifs = data.notifications || [];
            if (notifs.length === 0) {
                list.innerHTML = '<p class="text-muted text-center small">No notifications</p>';
            } else {
                list.innerHTML = notifs.slice(0, 10).map(n => `
                    <div class="dropdown-item small py-2 ${n.read ? '' : 'fw-bold'}" style="cursor:pointer" onclick="App.markNotifRead('${n.id}')">
                        <div>${n.title}</div>
                        <div class="text-muted" style="font-size:0.75rem">${n.message}</div>
                    </div>
                `).join('');
            }
        } catch (e) { /* ignore */ }
    },

    async markNotifRead(id) {
        try {
            await API.put(`/notifications/${id}/read`);
            this.loadNotifBell();
        } catch (e) { /* ignore */ }
    },

    // Notification checker for real-time popups
    startNotificationChecker() {
        // Clear any existing interval
        if (this.notificationIntervalId) {
            clearInterval(this.notificationIntervalId);
        }

        // Check for new notifications every 30 seconds
        this.notificationIntervalId = setInterval(async () => {
            try {
                if (!this.currentUser) return;

                const data = await API.get('/notifications');
                const unreadCount = data.unread_count || 0;

                // Show popup if there are new unread notifications
                if (unreadCount > this.lastUnreadCount) {
                    const newNotifications = unreadCount - this.lastUnreadCount;
                    this.showNotificationPopup(newNotifications, data.notifications.slice(0, newNotifications));
                }

                this.lastUnreadCount = unreadCount;

                // Update the bell badge
                this.loadNotifBell();
            } catch (error) {
                console.error('Error checking notifications:', error);
            }
        }, 30000); // Check every 30 seconds

        // Also check immediately when starting
        this.checkNotificationsNow();
    },

    async checkNotificationsNow() {
        try {
            if (!this.currentUser) return;

            const data = await API.get('/notifications');
            const unreadCount = data.unread_count || 0;
            this.lastUnreadCount = unreadCount;

            // Update the bell badge
            this.loadNotifBell();
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    },

    showNotificationPopup(count, notifications) {
        // Create a toast notification for each new notification
        notifications.forEach(notification => {
            Utils.showToast(notification.title, 'info');
        });

        // Also show a summary if there are multiple
        if (count > 1) {
            Utils.showToast(`You have ${count} new notifications`, 'info');
        }
    },

    // Stop notification checker (useful when logging out)
    stopNotificationChecker() {
        if (this.notificationIntervalId) {
            clearInterval(this.notificationIntervalId);
            this.notificationIntervalId = null;
        }
    },
};

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Start notification checker when app initializes
document.addEventListener('app:ready', () => {
    if (App.currentUser) {
        App.startNotificationChecker();
    }
});
