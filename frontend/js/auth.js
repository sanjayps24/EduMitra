/**
 * EduMitra — Auth Handler
 * Manages login/signup forms and role-based redirects.
 */

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect
    if (API.isLoggedIn()) {
        const role = API.getRole();
        if (role === 'admin') window.location.href = '/admin-dashboard';
        else window.location.href = '/user-dashboard';
        return;
    }

    // ── Tab Switching ─────────────────────────
    const tabs = document.querySelectorAll('[data-auth-tab]');
    const forms = document.querySelectorAll('[data-auth-form]');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.authTab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            forms.forEach(f => {
                f.classList.remove('active');
                if (f.dataset.authForm === target) f.classList.add('active');
            });
        });
    });

    // ── Role Toggle ───────────────────────────
    const roleToggle = document.querySelectorAll('[data-role-toggle]');
    const roleSections = document.querySelectorAll('[data-role-section]');

    roleToggle.forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.roleToggle;
            roleToggle.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            roleSections.forEach(s => {
                s.classList.remove('active');
                if (s.dataset.roleSection === role) s.classList.add('active');
            });
        });
    });

    // ── User Login ────────────────────────────
    const userLoginForm = document.getElementById('userLoginForm');
    if (userLoginForm) {
        userLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = userLoginForm.querySelector('button[type="submit"]');
            const errorEl = document.getElementById('userLoginError');
            const usn = document.getElementById('userUsn').value.trim();
            const password = document.getElementById('userPassword').value;

            if (!usn || !password) {
                showError(errorEl, 'Please fill in all fields');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Logging in...';
            errorEl.textContent = '';

            try {
                await API.userLogin(usn, password);
                window.location.href = '/user-dashboard';
            } catch (err) {
                showError(errorEl, err.message || 'Invalid credentials');
                btn.disabled = false;
                btn.innerHTML = 'Login →';
            }
        });
    }

    // ── Admin Login ───────────────────────────
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = adminLoginForm.querySelector('button[type="submit"]');
            const errorEl = document.getElementById('adminLoginError');
            const adminId = document.getElementById('adminId').value.trim();
            const password = document.getElementById('adminPassword').value;

            if (!adminId || !password) {
                showError(errorEl, 'Please fill in all fields');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Logging in...';
            errorEl.textContent = '';

            try {
                await API.adminLogin(adminId, password);
                window.location.href = '/admin-dashboard';
            } catch (err) {
                showError(errorEl, err.message || 'Invalid credentials');
                btn.disabled = false;
                btn.innerHTML = 'Login →';
            }
        });
    }

    // ── Admin Signup ──────────────────────────
    const adminSignupForm = document.getElementById('adminSignupForm');
    if (adminSignupForm) {
        adminSignupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = adminSignupForm.querySelector('button[type="submit"]');
            const errorEl = document.getElementById('adminSignupError');
            const adminId = document.getElementById('signupAdminId').value.trim();
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('signupConfirm').value;

            if (!adminId || !name || !email || !password) {
                showError(errorEl, 'Please fill in all fields');
                return;
            }
            if (password !== confirm) {
                showError(errorEl, 'Passwords do not match');
                return;
            }
            if (password.length < 6) {
                showError(errorEl, 'Password must be at least 6 characters');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Creating account...';
            errorEl.textContent = '';

            try {
                await API.adminSignup(adminId, name, email, password);
                window.location.href = '/admin-dashboard';
            } catch (err) {
                showError(errorEl, err.message || 'Signup failed');
                btn.disabled = false;
                btn.innerHTML = 'Create Account →';
            }
        });
    }

    function showError(el, msg) {
        if (el) {
            el.textContent = msg;
            el.style.display = 'block';
            setTimeout(() => { el.style.display = 'none'; }, 5000);
        }
    }
});
