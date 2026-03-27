/**
 * EduMitra — API Client
 * Handles all HTTP requests to the FastAPI backend with JWT auth.
 */

const API_BASE = window.location.origin;

class API {
    static getToken() {
        return localStorage.getItem('edumitra_token');
    }

    static getUser() {
        const data = localStorage.getItem('edumitra_user');
        return data ? JSON.parse(data) : null;
    }

    static setAuth(data) {
        localStorage.setItem('edumitra_token', data.token);
        const user = { ...data };
        delete user.token;
        localStorage.setItem('edumitra_user', JSON.stringify(user));
    }

    static clearAuth() {
        localStorage.removeItem('edumitra_token');
        localStorage.removeItem('edumitra_user');
    }

    static isLoggedIn() {
        return !!this.getToken();
    }

    static getRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }

    static async request(method, endpoint, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, options);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Request failed');
            }
            return data;
        } catch (err) {
            throw err;
        }
    }

    static get(endpoint) { return this.request('GET', endpoint); }
    static post(endpoint, body) { return this.request('POST', endpoint, body); }
    static put(endpoint, body) { return this.request('PUT', endpoint, body); }
    static delete(endpoint) { return this.request('DELETE', endpoint); }

    // ── Auth ──────────────────────────────────────────
    static async adminSignup(adminId, name, email, password) {
        const data = await this.post('/api/auth/admin/signup', { admin_id: adminId, name, email, password });
        this.setAuth({ ...data, role: 'admin' });
        return data;
    }

    static async adminLogin(adminId, password) {
        const data = await this.post('/api/auth/admin/login', { admin_id: adminId, password });
        this.setAuth({ ...data, role: 'admin' });
        return data;
    }

    static async userLogin(usn, password) {
        const data = await this.post('/api/auth/user/login', { usn, password });
        this.setAuth({ ...data, role: 'student' });
        return data;
    }

    // ── Students ──────────────────────────────────────
    static getStudents(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') query.append(k, v);
        });
        return this.get(`/api/students?${query.toString()}`);
    }

    static getStudent(id) { return this.get(`/api/students/${id}`); }
    static createStudent(data) { return this.post('/api/students', data); }
    static updateStudent(id, data) { return this.put(`/api/students/${id}`, data); }
    static deleteStudent(id) { return this.delete(`/api/students/${id}`); }

    // ── Records ───────────────────────────────────────
    static addRecord(studentId, data) { return this.post(`/api/students/${studentId}/records`, data); }
    static updateRecord(recordId, data) { return this.put(`/api/records/${recordId}`, data); }
    static deleteRecord(recordId) { return this.delete(`/api/records/${recordId}`); }

    // ── Stats & Prediction ────────────────────────────
    static getStudentStats(id) { return this.get(`/api/students/${id}/stats`); }
    static getPrediction(id) { return this.get(`/api/students/${id}/predict`); }
    static getDashboardSummary() { return this.get('/api/dashboard/summary'); }

    // ── Chatbot ───────────────────────────────────────
    static sendChatMessage(studentId, message) {
        return this.post(`/api/chatbot/${studentId}`, { message });
    }

    // ── Logout ────────────────────────────────────────
    static logout() {
        this.clearAuth();
        window.location.href = '/login';
    }
}

window.API = API;
