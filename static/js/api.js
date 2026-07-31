// API Service Layer with automatic token refresh

const API = {
    BASE: '/api',
    _isRefreshing: false,
    _refreshPromise: null,

    getToken() {
        return localStorage.getItem('token');
    },

    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    },

    setTokens(accessToken, refreshToken) {
        localStorage.setItem('token', accessToken);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    },

    clearTokens() {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
    },

    async _refreshAccessToken() {
        // If already refreshing, wait for the existing promise
        if (this._isRefreshing && this._refreshPromise) {
            return this._refreshPromise;
        }

        this._isRefreshing = true;
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            this._isRefreshing = false;
            return Promise.reject(new Error('No refresh token'));
        }

        this._refreshPromise = new Promise(async (resolve, reject) => {
            try {
                const res = await fetch(`${this.BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });

                if (!res.ok) {
                    throw new Error('Refresh failed');
                }

                const json = await res.json();
                this.setTokens(json.token, json.refresh_token);
                resolve(json.token);
            } catch (err) {
                // Refresh failed - force logout
                this.clearTokens();
                if (window.App) {
                    window.App.logout();
                }
                reject(err);
            } finally {
                this._isRefreshing = false;
                this._refreshPromise = null;
            }
        });

        return this._refreshPromise;
    },

    async request(method, path, data = null) {
        const url = `${this.BASE}${path}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        const token = this.getToken();
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            options.body = JSON.stringify(data);
        }

        let res = await fetch(url, options);

        // If 401 and we have a refresh token, try to refresh
        if (res.status === 401 && this.getRefreshToken() && path !== '/auth/refresh') {
            try {
                const newToken = await this._refreshAccessToken();
                // Retry the original request with new token
                options.headers['Authorization'] = `Bearer ${newToken}`;
                res = await fetch(url, options);
            } catch (e) {
                // Refresh failed, already handled logout
                throw new Error('Session expired');
            }
        }

        const json = await res.json();

        if (!res.ok) {
            if (res.status === 401 && window.App) {
                window.App.logout();
            }
            throw new Error(json.error || 'Request failed');
        }
        return json;
    },

    get(path) { return this.request('GET', path); },
    post(path, data) { return this.request('POST', path, data); },
    put(path, data) { return this.request('PUT', path, data); },
    delete(path, data) { return this.request('DELETE', path, data); },
};
