/**
 * EduMitra — Admin Dashboard Logic
 * Handles student listing, search, filter, sort, and CRUD operations.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!API.isLoggedIn() || API.getRole() !== 'admin') {
        window.location.href = '/login';
        return;
    }

    Chart.register(ChartDataLabels);

    const user = API.getUser();
    document.getElementById('adminName').textContent = user.name || 'Admin';

    let allStudents = [];
    let currentFilters = {};
    let pieChartInstance = null;
    let barChartInstance = null;

    loadDashboard();

    // ── Load Dashboard Data ────────────────────
    async function loadDashboard() {
        try {
            const [summary, studentsData, adminsData] = await Promise.all([
                API.getDashboardSummary(),
                API.getStudents(),
                API.getAdmins()
            ]);
            updateSummaryCards(summary);
            allStudents = studentsData.students;
            renderTable(allStudents);
            renderCharts(summary, allStudents);
            checkAutomatedAlerts(allStudents);
            renderAdminsTable(adminsData);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
    }

    function updateSummaryCards(summary) {
        animateCounter('totalStudents', summary.total);
        animateCounter('goodStudents', summary.good);
        animateCounter('avgStudents', summary.average);
        animateCounter('badStudents', summary.poor);

        // High Risk Segmentation Counts
        if (summary.attendance) animateCounter('riskAttCount', summary.attendance.poor);
        if (summary.assignments) animateCounter('riskAssignCount', summary.assignments.poor);
        if (summary.marks) animateCounter('riskMarksCount', summary.marks.poor);
    }

    function animateCounter(elementId, target) {
        const el = document.getElementById(elementId);
        if (!el) return;
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 30));
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            el.textContent = current;
        }, 30);
    }

    // ── Automated Alerts ───────────────────────
    function checkAutomatedAlerts(students) {
        const highRisk = students.filter(s => s.classification === 'Poor' || s.avg_exam < 40 || s.avg_attendance < 50);
        const container = document.getElementById('alertBannerContainer');
        if (highRisk.length > 0) {
            container.innerHTML = `
                <div class="px-6 py-4 rounded-xl flex items-center justify-between" style="background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3)">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">🚨</span>
                        <div>
                            <h4 class="font-bold" style="color:var(--danger)">Automated Alert: High-Risk Students Detected</h4>
                            <p class="text-sm" style="color:var(--text-secondary)">${highRisk.length} student(s) urgently need attention due to extremely low scores or attendance.</p>
                        </div>
                    </div>
                    <button class="btn-danger flex items-center gap-2" style="white-space:nowrap;" onclick="notifyAdmins()" id="notifyAdminsBtn">
                        ✉️ Notify Admins via Email
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    }

    // ── Send Alert Notification ────────────────────
    window.notifyAdmins = async function() {
        const btn = document.getElementById('notifyAdminsBtn');
        if (btn) {
            btn.innerHTML = '⏳ Sending...';
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'wait';
        }
        try {
            const res = await API.notifyAdmins();
            showToast(res.message, 'success');
        } catch (err) {
            showToast('Failed to send notifications: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '✉️ Notify Admins via Email';
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        }
    };

    // ── Charts ─────────────────────────────────
    function renderCharts(summary, students) {
        const pieCtx = document.getElementById('overallPieChart')?.getContext('2d');
        const barCtx = document.getElementById('averageBarChart')?.getContext('2d');
        if (!pieCtx || !barCtx) return;

        if (pieChartInstance) pieChartInstance.destroy();
        if (barChartInstance) barChartInstance.destroy();

        // 1. Pie Chart (Distribution with Percentages)
        const total = summary.total || 1;
        pieChartInstance = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Good (≥75%)', 'Average (50-74%)', 'Poor (<50%)'],
                datasets: [{
                    data: [summary.good, summary.average, summary.poor],
                    backgroundColor: ['#43E97B', '#F1C40F', '#FF4757'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#fff' } },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 14 },
                        formatter: (value) => {
                            if (value === 0) return '';
                            const percentage = Math.round((value / total) * 100);
                            return `${percentage}%`;
                        }
                    }
                }
            }
        });

        // 2. Bar Chart (Average Exam vs Attendance across Depts)
        const depts = {};
        students.forEach(s => {
            const d = s.department || 'Other';
            if (!depts[d]) depts[d] = { count: 0, exam: 0, att: 0 };
            depts[d].count++;
            depts[d].exam += s.avg_exam;
            depts[d].att += s.avg_attendance;
        });
        
        const labels = Object.keys(depts);
        const avgExam = labels.map(l => depts[l].count ? (depts[l].exam / depts[l].count).toFixed(1) : 0);
        const avgAtt = labels.map(l => depts[l].count ? (depts[l].att / depts[l].count).toFixed(1) : 0);

        barChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['No Data'],
                datasets: [
                    { label: 'Avg Exam', data: labels.length ? avgExam : [0], backgroundColor: '#6C63FF', borderRadius: 4 },
                    { label: 'Avg Attendance', data: labels.length ? avgAtt : [0], backgroundColor: '#43E97B', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } },
                    x: { grid: { display: false }, ticks: { color: '#aaa' } }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    datalabels: { display: false } // disable on bar for cleanliness
                }
            }
        });
    }

    // ── Render Table ───────────────────────────
    function renderTable(students) {
        const tbody = document.getElementById('studentsTableBody');
        const countEl = document.getElementById('displayCount');
        if (countEl) countEl.textContent = `Showing ${students.length} students`;

        if (!students.length) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="text-center" style="padding:40px;color:var(--text-muted);">
                    <div style="font-size:2rem;margin-bottom:8px">📋</div>
                    No students found matching your criteria.
                </td></tr>`;
            return;
        }

        tbody.innerHTML = students.map(s => `
            <tr onclick="viewStudent('${s.id}')" style="cursor:pointer">
                <td>
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="width:36px;height:36px;border-radius:10px;background:var(--gradient-1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem">
                            ${s.name.charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight:600">${s.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted)">${s.email || ''}</div>
                        </div>
                    </div>
                </td>
                <td><span style="font-family:monospace;color:var(--primary-light)">${s.usn}</span></td>
                <td>${s.department || '-'}</td>
                <td>${s.semester || '-'}</td>
                <td><span style="font-weight:600;${getScoreColor(s.avg_exam)}">${s.avg_exam}%</span></td>
                <td><span style="font-weight:600;${getScoreColor(s.avg_attendance)}">${s.avg_attendance}%</span></td>
                <td><span class="badge badge-${s.classification.toLowerCase()}">${s.classification}</span></td>
                <td>
                    <div style="display:flex;gap:4px">
                        <button class="btn-icon" style="background:rgba(108,99,255,0.15);color:var(--primary)" onclick="event.stopPropagation();editStudent('${s.id}')" title="Edit">✏️</button>
                        <button class="btn-icon" style="background:rgba(255,71,87,0.15);color:var(--danger)" onclick="event.stopPropagation();confirmDelete('${s.id}','${s.name}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function getScoreColor(score) {
        if (score >= 75) return 'color:var(--success)';
        if (score >= 50) return 'color:var(--warning)';
        return 'color:var(--danger)';
    }

    // ── Render Admins Table ─────────────────────
    function renderAdminsTable(admins) {
        const tbody = document.getElementById('adminsTableBody');
        if (!tbody) return;

        if (!admins || !admins.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">No administrators found.</td></tr>';
            return;
        }

        tbody.innerHTML = admins.map(a => `
            <tr>
                <td class="font-semibold">${a.name}</td>
                <td><span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-secondary);border:1px solid rgba(255,255,255,0.1)">${a.admin_id}</span></td>
                <td style="color:var(--text-muted)">${a.email}</td>
            </tr>
        `).join('');
    }

    // ── Search ─────────────────────────────────
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => applyFilters(), 300);
    });

    // ── Filter & Sort ──────────────────────────
    window.applyFilters = async function() {
        const params = {
            search: searchInput.value.trim(),
            classification: document.getElementById('filterClassification')?.value || '',
            department: document.getElementById('filterDepartment')?.value || '',
            min_attendance: document.getElementById('filterMinAttendance')?.value || '',
            max_attendance: document.getElementById('filterMaxAttendance')?.value || '',
            min_marks: document.getElementById('filterMinMarks')?.value || '',
            max_marks: document.getElementById('filterMaxMarks')?.value || '',
            sort_by: document.getElementById('sortBy')?.value || '',
            sort_order: document.getElementById('sortOrder')?.value || 'asc',
        };

        try {
            const data = await API.getStudents(params);
            allStudents = data.students;
            renderTable(allStudents);
        } catch (err) {
            showToast('Filter failed: ' + err.message, 'error');
        }
    };

    window.filterByRiskType = async function(type) {
        showToast(`Filtering by ${type} risk...`, 'info');
        await applyFilters(); // reset others
        const params = { risk_type: type };
        try {
            const data = await API.getStudents(params);
            allStudents = data.students;
            renderTable(allStudents);
        } catch (err) {
            showToast('Filter failed: ' + err.message, 'error');
        }
    };

    window.resetFilters = function() {
        searchInput.value = '';
        document.getElementById('filterClassification').value = '';
        document.getElementById('filterDepartment').value = '';
        document.getElementById('filterMinAttendance').value = '';
        document.getElementById('filterMaxAttendance').value = '';
        document.getElementById('filterMinMarks').value = '';
        document.getElementById('filterMaxMarks').value = '';
        document.getElementById('sortBy').value = '';
        document.getElementById('sortOrder').value = 'asc';
        applyFilters();
    };

    // ── Navigation ─────────────────────────────
    window.viewStudent = function(id) {
        window.location.href = `/student-profile?id=${id}`;
    };

    // ── Edit Student Modal ─────────────────────
    window.editStudent = async function(id) {
        try {
            const data = await API.getStudent(id);
            const s = data.student;
            const records = data.records;

            let recordsHtml = records.map((r, i) => `
                <div class="p-4 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:8px" id="record-${r.id}">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold text-sm" style="color:var(--primary-light)">${r.subject}</span>
                        <button class="btn-danger btn-sm" onclick="deleteRecord('${r.id}','${id}')">Delete</button>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="form-label text-xs">Exam Score</label>
                            <input type="number" class="form-input text-sm" value="${r.exam_score}" min="0" max="100" id="exam-${r.id}">
                        </div>
                        <div>
                            <label class="form-label text-xs">Assignment</label>
                            <input type="number" class="form-input text-sm" value="${r.assignment_score}" min="0" max="100" id="assign-${r.id}">
                        </div>
                        <div>
                            <label class="form-label text-xs">Attendance</label>
                            <input type="number" class="form-input text-sm" value="${r.attendance}" min="0" max="100" id="att-${r.id}">
                        </div>
                    </div>
                    <button class="btn-primary btn-sm mt-2 w-full" style="padding:8px" onclick="saveRecord('${r.id}', '${id}')">Save Record Update</button>
                </div>
            `).join('');

            document.getElementById('modalTitle').textContent = `Edit: ${s.name}`;
            document.getElementById('modalBody').innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label">Name</label>
                            <input type="text" class="form-input" value="${s.name}" id="editName">
                        </div>
                        <div>
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" value="${s.email || ''}" id="editEmail">
                        </div>
                        <div>
                            <label class="form-label">Semester</label>
                            <input type="number" class="form-input" value="${s.semester}" min="1" max="8" id="editSemester">
                        </div>
                        <div>
                            <label class="form-label">Department</label>
                            <input type="text" class="form-input" value="${s.department || ''}" id="editDepartment">
                        </div>
                    </div>
                    <button class="btn-primary w-full" onclick="saveStudent('${s.id}')">Save Student Info</button>

                    <hr style="border-color:rgba(255,255,255,0.06);margin:16px 0">
                    <h3 class="text-lg font-bold" style="color:var(--text-primary)">Academic Records</h3>
                    <div id="recordsList">${recordsHtml || '<p style="color:var(--text-muted)">No records found.</p>'}</div>

                    <hr style="border-color:rgba(255,255,255,0.06);margin:16px 0">
                    <h4 class="font-semibold" style="color:var(--accent)">+ Add New Record</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="col-span-2">
                            <label class="form-label">Subject</label>
                            <input type="text" class="form-input" id="newSubject" placeholder="e.g., Data Structures">
                        </div>
                        <div>
                            <label class="form-label">Exam Score</label>
                            <input type="number" class="form-input" id="newExam" min="0" max="100" placeholder="0-100">
                        </div>
                        <div>
                            <label class="form-label">Assignment</label>
                            <input type="number" class="form-input" id="newAssign" min="0" max="100" placeholder="0-100">
                        </div>
                        <div>
                            <label class="form-label">Attendance %</label>
                            <input type="number" class="form-input" id="newAtt" min="0" max="100" placeholder="0-100">
                        </div>
                        <div>
                            <label class="form-label">Semester</label>
                            <input type="number" class="form-input" id="newSem" value="${s.semester}" min="1" max="8">
                        </div>
                    </div>
                    <button class="btn-primary w-full" onclick="addRecord('${s.id}')">Add Record</button>
                </div>
            `;
            openModal();
        } catch (err) {
            showToast('Failed to load student: ' + err.message, 'error');
        }
    };

    window.saveStudent = async function(id) {
        try {
            await API.updateStudent(id, {
                name: document.getElementById('editName').value,
                email: document.getElementById('editEmail').value,
                semester: parseInt(document.getElementById('editSemester').value),
                department: document.getElementById('editDepartment').value,
            });
            closeModal();
            showToast('Student information updated successfully', 'success');
            loadDashboard();
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        }
    };

    window.saveRecord = async function(recordId, studentId) {
        try {
            await API.updateRecord(recordId, {
                exam_score: parseFloat(document.getElementById(`exam-${recordId}`).value),
                assignment_score: parseFloat(document.getElementById(`assign-${recordId}`).value),
                attendance: parseFloat(document.getElementById(`att-${recordId}`).value),
            });
            // Immediately reload dashboard and edit student UI to reflect new risks
            await loadDashboard();
            await editStudent(studentId); 
            
            showToast('Record updated successfully', 'success');
            const el = document.getElementById(`record-${recordId}`);
            if (el) { el.style.borderColor = 'var(--success)'; setTimeout(() => { el.style.borderColor = 'rgba(255,255,255,0.06)'; }, 1500); }
        } catch (err) {
            showToast('Failed to update record: ' + err.message, 'error');
        }
    };

    window.deleteRecord = async function(recordId, studentId) {
        if (!confirm('Delete this academic record?')) return;
        try {
            await API.deleteRecord(recordId);
            showToast('Record deleted successfully', 'success');
            document.getElementById(`record-${recordId}`)?.remove();
        } catch (err) {
            showToast('Failed to delete: ' + err.message, 'error');
        }
    };

    window.addRecord = async function(studentId) {
        const subject = document.getElementById('newSubject').value.trim();
        const exam = parseFloat(document.getElementById('newExam').value);
        const assign = parseFloat(document.getElementById('newAssign').value);
        const att = parseFloat(document.getElementById('newAtt').value);
        const sem = parseInt(document.getElementById('newSem').value);

        if (!subject || isNaN(exam) || isNaN(assign) || isNaN(att)) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await API.addRecord(studentId, {
                subject, exam_score: exam, assignment_score: assign, attendance: att, semester: sem
            });
            showToast('New academic record added successfully', 'success');
            await loadDashboard();
            await editStudent(studentId); // Refresh modal and risk tags
        } catch (err) {
            showToast('Failed to add record: ' + err.message, 'error');
        }
    };

    // ── Delete Student ─────────────────────────
    window.confirmDelete = function(id, name) {
        document.getElementById('modalTitle').textContent = 'Confirm Deletion';
        document.getElementById('modalBody').innerHTML = `
            <div class="text-center py-4">
                <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
                <p style="color:var(--text-secondary);margin-bottom:8px">
                    Are you sure you want to delete <strong style="color:var(--text-primary)">${name}</strong>?
                </p>
                <p style="color:var(--danger);font-size:0.85rem">This action cannot be undone. All academic records will be removed.</p>
                <div class="flex gap-3 justify-center mt-6">
                    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn-danger" style="padding:12px 32px;border-radius:50px;font-size:1rem" onclick="deleteStudentConfirm('${id}')">Delete</button>
                </div>
            </div>
        `;
        openModal();
    };

    window.deleteStudentConfirm = async function(id) {
        try {
            await API.deleteStudent(id);
            showToast('Student deleted successfully', 'success');
            closeModal();
            loadDashboard();
        } catch (err) {
            showToast('Failed to delete: ' + err.message, 'error');
        }
    };

    // ── Modal Controls ─────────────────────────
    window.openModal = function() {
        document.getElementById('editModal').classList.add('active');
    };

    window.closeModal = function() {
        document.getElementById('editModal').classList.remove('active');
    };

    // Close modal on overlay click
    document.getElementById('editModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'editModal') closeModal();
    });

    // ── Logout ─────────────────────────────────
    window.adminLogout = function() {
        API.logout();
    };

    // ── Create Student ─────────────────────────
    window.openCreateModal = function() {
        document.getElementById('createModal').classList.add('active');
    };

    window.closeCreateModal = function() {
        document.getElementById('createModal').classList.remove('active');
        document.getElementById('createName').value = '';
        document.getElementById('createEmail').value = '';
        document.getElementById('createUSN').value = '';
        document.getElementById('createSemester').value = '1';
        document.getElementById('createDepartment').value = '';
        document.getElementById('createPassword').value = '';
    };

    window.submitCreateStudent = async function() {
        const usn = document.getElementById('createUSN').value.trim();
        const name = document.getElementById('createName').value.trim();
        const email = document.getElementById('createEmail').value.trim();
        const semester = parseInt(document.getElementById('createSemester').value);
        const department = document.getElementById('createDepartment').value.trim();
        const password = document.getElementById('createPassword').value.trim();

        if (!usn || !name || !email || !semester || !department || !password) {
            showToast("Please fill in all details", "warning");
            return;
        }

        try {
            await API.createStudent({ usn, name, email, semester, department, password });
            showToast('Student created successfully', 'success');
            closeCreateModal();
            loadDashboard(); // immediately refreshes the dashboard
        } catch (err) {
            showToast('Failed to create student: ' + err.message, 'error');
        }
    };

    // Close on overlay click
    document.getElementById('createModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'createModal') closeCreateModal();
    });

    // ── Toggle Filters Panel ───────────────────
    window.toggleFilters = function() {
        const panel = document.getElementById('filtersPanel');
        panel.classList.toggle('hidden');
    };

    // ── Toast System ───────────────────────────
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        toast.innerHTML = `
            <span>${icons[type] || '🔔'}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('active'), 10);
        
        // Remove after 4s
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    };

    // ── Features Modal ─────────────────────────
    window.openFeaturesModal = function() {
        document.getElementById('featuresModal').classList.add('active');
    };

    window.closeFeaturesModal = function() {
        document.getElementById('featuresModal').classList.remove('active');
    };

    // Close on overlay click
    document.getElementById('featuresModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'featuresModal') closeFeaturesModal();
    });
});
