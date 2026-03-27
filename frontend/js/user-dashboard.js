/**
 * EduMitra — User Dashboard
 * Shows the logged-in student's academic data, charts, and predictions.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!API.isLoggedIn() || API.getRole() !== 'student') {
        window.location.href = '/login';
        return;
    }

    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

    const user = API.getUser();
    document.getElementById('userName').textContent = user.name || 'Student';
    document.getElementById('userUSN').textContent = user.usn || '';

    const studentId = user.student_id;
    if (!studentId) {
        window.location.href = '/login';
        return;
    }

    loadUserDashboard(studentId);

    // Initialize chatbot
    new ChatbotWidget(studentId);

    async function loadUserDashboard(id) {
        try {
            const data = await API.getStudent(id);
            renderDashboard(data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
    }

    function renderDashboard(data) {
        const { student, records, stats, prediction } = data;

        // Overview cards
        document.getElementById('overallExam').textContent = `${stats.avg_exam}%`;
        document.getElementById('overallAttendance').textContent = `${stats.avg_attendance}%`;
        document.getElementById('overallAssignment').textContent = `${stats.avg_assignment}%`;
        document.getElementById('totalSubjects').textContent = stats.total_subjects;

        // Color coding
        setCardColor('examCard', stats.avg_exam);
        setCardColor('attendCard', stats.avg_attendance);
        setCardColor('assignCard', stats.avg_assignment);

        // Classification & Risk
        const classBadge = document.getElementById('userClassification');
        classBadge.textContent = prediction.classification;
        classBadge.className = `badge badge-${prediction.classification.toLowerCase()}`;
        classBadge.style.fontSize = '1rem';
        classBadge.style.padding = '8px 20px';

        const riskBadge = document.getElementById('userRisk');
        const riskLevel = prediction.overall_risk.risk_level;
        riskBadge.textContent = riskLevel;
        riskBadge.className = `badge badge-${riskLevel.toLowerCase().replace(' ', '-')}`;
        riskBadge.style.fontSize = '1rem';
        riskBadge.style.padding = '8px 20px';

        // Risk explanation
        document.getElementById('riskExplanation').innerHTML = getRiskExplanation(prediction);

        // Circular progress
        renderCircle('userExamCircle', stats.avg_exam);
        renderCircle('userAttCircle', stats.avg_attendance);
        renderCircle('userAssignCircle', stats.avg_assignment);

        // Charts
        if (stats.subjects.length > 0) {
            renderExamBarChart(stats);
            renderScorePieChart(stats);
            renderTrendChart(stats);
            renderAttendanceBarChart(stats);
        }

        // Records table
        renderRecords(records);
    }

    function setCardColor(cardId, value) {
        const card = document.getElementById(cardId);
        if (!card) return;
        if (value >= 75) card.style.borderColor = 'rgba(46,213,115,0.3)';
        else if (value >= 50) card.style.borderColor = 'rgba(255,165,2,0.3)';
        else card.style.borderColor = 'rgba(255,71,87,0.3)';
    }

    function getRiskExplanation(prediction) {
        const p = prediction;
        let html = '<div class="space-y-3">';
        html += `<div class="flex items-center gap-3">
            <span style="color:var(--text-muted);font-size:0.85rem">Attendance Risk:</span>
            <span class="badge badge-${p.attendance_risk.toLowerCase().replace(' ', '-')}">${p.attendance_risk}</span>
        </div>`;
        html += `<div class="flex items-center gap-3">
            <span style="color:var(--text-muted);font-size:0.85rem">Exam Score Risk:</span>
            <span class="badge badge-${p.exam_risk.toLowerCase().replace(' ', '-')}">${p.exam_risk}</span>
        </div>`;

        const probs = p.overall_risk.probabilities;
        if (probs) {
            html += '<div class="mt-3">';
            Object.entries(probs).forEach(([k, v]) => {
                const color = k === 'Low Risk' ? '#2ED573' : k === 'Medium Risk' ? '#FFA502' : '#FF4757';
                html += `<div class="flex items-center gap-2 mb-2">
                    <span class="text-xs" style="width:90px;color:var(--text-muted)">${k}</span>
                    <div style="flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
                        <div style="width:${Math.min(v, 100)}%;height:100%;background:${color};border-radius:4px;transition:width 1s ease"></div>
                    </div>
                    <span class="text-xs font-semibold" style="width:40px;text-align:right">${v}%</span>
                </div>`;
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function renderCircle(canvasId, value) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const center = size / 2;
        const radius = center - 10;
        const color = value >= 75 ? '#2ED573' : value >= 50 ? '#FFA502' : '#FF4757';

        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // Animated progress
        let progress = 0;
        const animate = () => {
            progress += 2;
            if (progress > value) progress = value;
            ctx.clearRect(0, 0, size, size);
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + (progress / 100) * Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();
            if (progress < value) requestAnimationFrame(animate);
        };
        animate();
    }

    function renderExamBarChart(stats) {
        const ctx = document.getElementById('userExamChart');
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

    function renderScorePieChart(stats) {
        const ctx = document.getElementById('userPieChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Exam Avg', 'Assignment Avg', 'Attendance Avg'],
                datasets: [{
                    data: [stats.avg_exam, stats.avg_assignment, stats.avg_attendance],
                    backgroundColor: ['rgba(108,99,255,0.8)', 'rgba(255,101,132,0.8)', 'rgba(67,233,123,0.8)'],
                    borderColor: ['#6C63FF', '#FF6584', '#43E97B'],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#A7A9BE', padding: 16, usePointStyle: true } },
                    title: { display: true, text: 'Score Distribution', color: '#FFFFFE', font: { size: 14, weight: '600' } },
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

    function renderTrendChart(stats) {
        const ctx = document.getElementById('userTrendChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: stats.subjects,
                datasets: [
                    {
                        label: 'Exam',
                        data: stats.exam_scores,
                        borderColor: '#6C63FF',
                        backgroundColor: 'rgba(108,99,255,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#6C63FF',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                    },
                    {
                        label: 'Attendance',
                        data: stats.attendances,
                        borderColor: '#43E97B',
                        backgroundColor: 'rgba(67,233,123,0.05)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#43E97B',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#A7A9BE', padding: 16, usePointStyle: true } },
                    title: { display: true, text: 'Performance Trend', color: '#FFFFFE', font: { size: 14, weight: '600' } }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE' } },
                    x: { grid: { display: false }, ticks: { color: '#A7A9BE', maxRotation: 45 } }
                }
            }
        });
    }

    function renderAttendanceBarChart(stats) {
        const ctx = document.getElementById('userAttendChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.subjects,
                datasets: [{
                    label: 'Attendance %',
                    data: stats.attendances,
                    backgroundColor: stats.attendances.map(a =>
                        a >= 75 ? 'rgba(67,233,123,0.6)' : a >= 50 ? 'rgba(255,165,2,0.6)' : 'rgba(255,71,87,0.6)'
                    ),
                    borderColor: stats.attendances.map(a =>
                        a >= 75 ? '#43E97B' : a >= 50 ? '#FFA502' : '#FF4757'
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
                    title: { display: true, text: 'Attendance by Subject', color: '#FFFFFE', font: { size: 14, weight: '600' } }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#A7A9BE' } },
                    x: { grid: { display: false }, ticks: { color: '#A7A9BE', maxRotation: 45 } }
                }
            }
        });
    }

    function renderRecords(records) {
        const tbody = document.getElementById('userRecordsBody');
        if (!tbody) return;
        tbody.innerHTML = records.map(r => {
            const getColor = v => v >= 75 ? 'color:#2ED573' : v >= 50 ? 'color:#FFA502' : 'color:#FF4757';
            return `<tr>
                <td style="font-weight:600">${r.subject}</td>
                <td><span style="font-weight:600;${getColor(r.exam_score)}">${r.exam_score}%</span></td>
                <td><span style="font-weight:600;${getColor(r.assignment_score)}">${r.assignment_score}%</span></td>
                <td><span style="font-weight:600;${getColor(r.attendance)}">${r.attendance}%</span></td>
            </tr>`;
        }).join('');
    }

    // Logout
    window.userLogout = function() { API.logout(); };
});
