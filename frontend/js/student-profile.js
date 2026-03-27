/**
 * EduMitra — Student Profile Page
 * Shows individual student stats, charts, and risk prediction.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!API.isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

    const params = new URLSearchParams(window.location.search);
    const studentId = params.get('id');
    if (!studentId) {
        window.location.href = '/admin-dashboard';
        return;
    }

    loadStudentProfile(studentId);

    async function loadStudentProfile(id) {
        try {
            const data = await API.getStudent(id);
            renderProfile(data);
        } catch (err) {
            document.getElementById('profileContent').innerHTML = `
                <div class="text-center py-20">
                    <div style="font-size:3rem;margin-bottom:12px">😕</div>
                    <p style="color:var(--text-muted)">Student not found.</p>
                    <a href="/admin-dashboard" class="btn-primary mt-4" style="display:inline-flex;margin-top:16px">← Back to Dashboard</a>
                </div>
            `;
        }
    }

    function renderProfile(data) {
        const { student, records, stats, prediction } = data;

        // Student header
        document.getElementById('studentName').textContent = student.name;
        document.getElementById('studentUSN').textContent = student.usn;
        document.getElementById('studentDept').textContent = `${student.department} — Sem ${student.semester}`;
        document.getElementById('studentEmail').textContent = student.email || '';
        document.getElementById('studentInitial').textContent = student.name.charAt(0);

        // Classification badge
        const classBadge = document.getElementById('classificationBadge');
        classBadge.textContent = prediction.classification;
        classBadge.className = `badge badge-${prediction.classification.toLowerCase()}`;

        // Risk badge
        const riskBadge = document.getElementById('riskBadge');
        const riskLevel = prediction.overall_risk.risk_level;
        riskBadge.textContent = riskLevel;
        riskBadge.className = `badge badge-${riskLevel.toLowerCase().replace(' ', '-')}`;

        // Stats cards
        renderStatCircle('examCircle', stats.avg_exam, getStatColor(stats.avg_exam));
        renderStatCircle('assignCircle', stats.avg_assignment, getStatColor(stats.avg_assignment));
        renderStatCircle('attendCircle', stats.avg_attendance, getStatColor(stats.avg_attendance));

        document.getElementById('examPercent').textContent = `${stats.avg_exam}%`;
        document.getElementById('assignPercent').textContent = `${stats.avg_assignment}%`;
        document.getElementById('attendPercent').textContent = `${stats.avg_attendance}%`;

        // Risk details
        renderRiskDetails(prediction);

        // Charts
        if (stats.subjects.length > 0) {
            renderExamChart(stats);
            renderAttendancePie(stats);
            renderPerformanceRadar(stats);
            renderAssignmentChart(stats);
        }

        // Records table
        renderRecordsTable(records);
    }

    function renderStatCircle(canvasId, value, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const center = size / 2;
        const radius = center - 12;
        const lineWidth = 10;

        ctx.clearRect(0, 0, size, size);

        // Background arc
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Progress arc
        const angle = (value / 100) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    function getStatColor(value) {
        if (value >= 75) return '#2ED573';
        if (value >= 50) return '#FFA502';
        return '#FF4757';
    }

    function renderRiskDetails(prediction) {
        const container = document.getElementById('riskDetails');
        if (!container) return;

        const attRisk = prediction.attendance_risk;
        const examRisk = prediction.exam_risk;
        const overall = prediction.overall_risk;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
                    <div class="text-sm font-semibold mb-2" style="color:var(--text-muted)">Overall Risk</div>
                    <span class="badge badge-${overall.risk_level.toLowerCase().replace(' ', '-')}" style="font-size:0.9rem;padding:6px 16px">${overall.risk_level}</span>
                    <div class="mt-3 space-y-1">
                        ${Object.entries(overall.probabilities).map(([k, v]) =>
                            `<div class="flex justify-between text-xs" style="color:var(--text-secondary)">
                                <span>${k}</span>
                                <span class="font-semibold">${v}%</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="p-4 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
                    <div class="text-sm font-semibold mb-2" style="color:var(--text-muted)">Attendance Risk</div>
                    <span class="badge badge-${attRisk.toLowerCase().replace(' ', '-')}" style="font-size:0.9rem;padding:6px 16px">${attRisk}</span>
                    <p class="text-xs mt-3" style="color:var(--text-secondary)">Based on average attendance of ${prediction.scores.avg_attendance}%</p>
                </div>
                <div class="p-4 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
                    <div class="text-sm font-semibold mb-2" style="color:var(--text-muted)">Exam Risk</div>
                    <span class="badge badge-${examRisk.toLowerCase().replace(' ', '-')}" style="font-size:0.9rem;padding:6px 16px">${examRisk}</span>
                    <p class="text-xs mt-3" style="color:var(--text-secondary)">Based on average exam score of ${prediction.scores.avg_exam}%</p>
                </div>
            </div>
        `;
    }

    function renderExamChart(stats) {
        const ctx = document.getElementById('examChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.subjects,
                datasets: [{
                    label: 'Exam Score',
                    data: stats.exam_scores,
                    backgroundColor: stats.exam_scores.map(s =>
                        s >= 75 ? 'rgba(46,213,115,0.7)' : s >= 50 ? 'rgba(255,165,2,0.7)' : 'rgba(255,71,87,0.7)'
                    ),
                    borderColor: stats.exam_scores.map(s =>
                        s >= 75 ? '#2ED573' : s >= 50 ? '#FFA502' : '#FF4757'
                    ),
                    borderWidth: 2,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Exam Scores by Subject', color: '#FFFFFE', font: { size: 14, weight: '600' } }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE' } },
                    x: { grid: { display: false }, ticks: { color: '#A7A9BE', maxRotation: 45 } }
                }
            }
        });
    }

    function renderAttendancePie(stats) {
        const ctx = document.getElementById('attendancePie');
        if (!ctx) return;
        const above75 = stats.attendances.filter(a => a >= 75).length;
        const between50_75 = stats.attendances.filter(a => a >= 50 && a < 75).length;
        const below50 = stats.attendances.filter(a => a < 50).length;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['≥75% (Good)', '50-74% (Warning)', '<50% (Critical)'],
                datasets: [{
                    data: [above75, between50_75, below50],
                    backgroundColor: ['rgba(46,213,115,0.8)', 'rgba(255,165,2,0.8)', 'rgba(255,71,87,0.8)'],
                    borderColor: ['#2ED573', '#FFA502', '#FF4757'],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#A7A9BE', padding: 16, usePointStyle: true } },
                    title: { display: true, text: 'Attendance Distribution', color: '#FFFFFE', font: { size: 14, weight: '600' } },
                    datalabels: {
                        color: '#fff', font: { weight: 'bold' },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            return Math.round((value * 100 / sum)) + "%";
                        }
                    }
                }
            }
        });
    }

    function renderPerformanceRadar(stats) {
        const ctx = document.getElementById('performanceRadar');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: stats.subjects,
                datasets: [
                    {
                        label: 'Exam Scores',
                        data: stats.exam_scores,
                        borderColor: '#6C63FF',
                        backgroundColor: 'rgba(108,99,255,0.15)',
                        borderWidth: 2,
                        pointBackgroundColor: '#6C63FF'
                    },
                    {
                        label: 'Attendance',
                        data: stats.attendances,
                        borderColor: '#43E97B',
                        backgroundColor: 'rgba(67,233,123,0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#43E97B'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#A7A9BE', padding: 16, usePointStyle: true } },
                    title: { display: true, text: 'Overall Performance Radar', color: '#FFFFFE', font: { size: 14, weight: '600' } }
                },
                scales: {
                    r: {
                        beginAtZero: true, max: 100,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        angleLines: { color: 'rgba(255,255,255,0.06)' },
                        pointLabels: { color: '#A7A9BE', font: { size: 10 } },
                        ticks: { display: false }
                    }
                }
            }
        });
    }

    function renderAssignmentChart(stats) {
        const ctx = document.getElementById('assignmentChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.subjects,
                datasets: [{
                    label: 'Assignment Score',
                    data: stats.assignment_scores,
                    backgroundColor: 'rgba(108,99,255,0.6)',
                    borderColor: '#6C63FF',
                    borderWidth: 2,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Assignment Scores', color: '#FFFFFE', font: { size: 14, weight: '600' } }
                },
                scales: {
                    x: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE' } },
                    y: { grid: { display: false }, ticks: { color: '#A7A9BE' } }
                }
            }
        });
    }

    function renderRecordsTable(records) {
        const tbody = document.getElementById('recordsTableBody');
        if (!tbody) return;
        tbody.innerHTML = records.map(r => `
            <tr>
                <td style="font-weight:600">${r.subject}</td>
                <td><span style="${getScoreStyle(r.exam_score)}">${r.exam_score}%</span></td>
                <td><span style="${getScoreStyle(r.assignment_score)}">${r.assignment_score}%</span></td>
                <td><span style="${getScoreStyle(r.attendance)}">${r.attendance}%</span></td>
                <td>Sem ${r.semester}</td>
            </tr>
        `).join('');
    }

    function getScoreStyle(s) {
        if (s >= 75) return 'color:#2ED573;font-weight:600';
        if (s >= 50) return 'color:#FFA502;font-weight:600';
        return 'color:#FF4757;font-weight:600';
    }

    // ── Back Navigation ────────────────────────
    window.goBack = function() {
        const role = API.getRole();
        if (role === 'admin') window.location.href = '/admin-dashboard';
        else window.location.href = '/user-dashboard';
    };

    window.profileLogout = function() { API.logout(); };
});
