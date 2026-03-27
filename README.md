# 🎓 EduMitra — Student Performance Prediction & Monitoring System

An AI-powered web application built with **FastAPI**, **scikit-learn**, and **Tailwind CSS** to track, analyze, and predict student academic performance.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![ML](https://img.shields.io/badge/ML-scikit--learn-orange)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

---

## ✨ Features

### 🏠 Landing Page
- Animated hero with EduMitra branding
- Feature highlights and call-to-action

### 🔐 Authentication
- **Student Login** — USN + Password
- **Admin Login / Signup** — Admin ID + Password
- JWT-based authentication with role-based access

### 📊 Admin Dashboard
- Summary cards (Total, Good, Average, At-Risk students)
- **Search** by name or USN
- **Filter** by classification, department, attendance range, marks range
- **Sort** by name, USN, exam score, attendance (A→Z / Z→A)
- **CRUD** — Edit, delete student records; add new academic records
- Click any student to view detailed profile

### 👤 Student Profile (Admin View)
- Circular progress indicators for exam, assignment, attendance
- **Bar Chart** — Subject-wise exam scores
- **Pie Chart** — Attendance distribution
- **Radar Chart** — Overall performance comparison
- **Risk Analysis** — ML-predicted risk level with probabilities
- Academic records table

### 📈 User Dashboard (Student View)
- Personal academic overview cards
- Performance classification (Good/Average/At-Risk)
- All 4 chart types (Bar, Pie, Line, Bar)
- ML risk prediction with probability bars
- Academic records table

### 🤖 AI Chatbot
- Rule-based academic advisor
- Personalized improvement roadmaps
- Subject-specific weak area identification
- 30-day study plans based on performance data

### 📖 About & Guide
- Step-by-step usage guide for Students and Admins
- Feature showcase and tech stack info

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI (Python) |
| ML Model | scikit-learn (Random Forest) |
| Data Storage | XLSX files (pandas + openpyxl) |
| Frontend | HTML + Tailwind CSS + Vanilla JS |
| Charts | Chart.js |
| Authentication | JWT (python-jose) |
| Deployment | Render |

---

## 🚀 Local Setup

### Prerequisites
- Python 3.11+

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/EduMitra.git
cd EduMitra

# Create virtual environment
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Train ML model & seed sample data
python train_and_seed.py

# Run the server
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000** in your browser.

### Demo Credentials

| Role | ID | Password |
|------|----|----------|
| Admin | `admin` | `admin123` |
| Student | `1ED22CS001` | `1ed22cs001` |

> 💡 Default student password is their USN in lowercase.

---

## 📁 Project Structure

```
EduMitra/
├── main.py                  # FastAPI application + routes
├── auth.py                  # JWT authentication
├── data_manager.py          # XLSX CRUD operations
├── ml_model.py              # ML model (Random Forest)
├── chatbot.py               # Rule-based academic advisor
├── train_and_seed.py        # Train model + seed sample data
├── requirements.txt         # Python dependencies
├── render.yaml              # Render deployment config
├── data/                    # Generated XLSX data files
│   ├── students.xlsx
│   ├── admins.xlsx
│   ├── academic_records.xlsx
│   └── model.joblib
└── frontend/
    ├── index.html           # Landing page
    ├── login.html           # Login/Signup
    ├── admin-dashboard.html # Admin dashboard
    ├── student-profile.html # Student profile view
    ├── user-dashboard.html  # Student dashboard
    ├── about.html           # About & guide
    ├── css/style.css        # Custom styles
    └── js/
        ├── api.js           # API client
        ├── auth.js          # Auth handling
        ├── admin-dashboard.js
        ├── student-profile.js
        ├── user-dashboard.js
        └── chatbot.js
```

---

## 🌐 Deploy to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repo
5. Render will auto-detect `render.yaml` and deploy

Or manually:
1. Create a **New Web Service**
2. Connect your GitHub repo
3. Set:
   - **Build Command**: `pip install -r requirements.txt && python train_and_seed.py`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable: `SECRET_KEY` (any random string)

---

## 📊 Student Classification Logic

| Category | Criteria |
|----------|----------|
| **Good** 🟢 | Average exam score ≥ 75% |
| **Average** 🟡 | Average exam score 50–74% |
| **At-Risk** 🔴 | Average exam score < 50% |

## 🛡️ Risk Prediction

Uses a **Random Forest Classifier** trained on exam scores, assignment scores, and attendance to predict:
- **Low Risk** 🟢 — Strong academic standing
- **Medium Risk** 🟡 — Needs improvement
- **High Risk** 🔴 — Immediate intervention required

---

## 📄 License

MIT License — © 2026 EduMitra