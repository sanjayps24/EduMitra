"""
EduMitra — FastAPI Main Application
Serves the API and frontend static files.
"""

import os
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

from data_manager import dm
from auth import hash_password, verify_password, create_token, decode_token
from ml_model import predict_student_performance, classify_student
from chatbot import get_chatbot_response

app = FastAPI(title="EduMitra API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")


# ── Pydantic Schemas ────────────────────────────────────────────

class AdminSignup(BaseModel):
    admin_id: str
    name: str
    email: str
    password: str

class AdminLogin(BaseModel):
    admin_id: str
    password: str

class UserLogin(BaseModel):
    usn: str
    password: str

class RecordCreate(BaseModel):
    subject: str
    exam_score: float
    assignment_score: float
    attendance: float
    semester: int

class RecordUpdate(BaseModel):
    subject: Optional[str] = None
    exam_score: Optional[float] = None
    assignment_score: Optional[float] = None
    attendance: Optional[float] = None
    semester: Optional[int] = None

class StudentCreate(BaseModel):
    usn: str
    name: str
    email: str
    password: str
    semester: int
    department: str

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    semester: Optional[int] = None
    department: Optional[str] = None

class ChatMessage(BaseModel):
    message: str


# ── Auth Helper ─────────────────────────────────────────────────

def get_current_user(token: str):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


# ── Auth Routes ─────────────────────────────────────────────────

@app.post("/api/auth/admin/signup")
async def admin_signup(data: AdminSignup):
    existing = dm.get_admin_by_id(data.admin_id)
    if existing:
        raise HTTPException(status_code=400, detail="Admin ID already exists")
    pw_hash = hash_password(data.password)
    admin = dm.create_admin(data.admin_id, data.name, data.email, pw_hash)
    if not admin:
        raise HTTPException(status_code=400, detail="Failed to create admin")
    token = create_token({"sub": admin["admin_id"], "role": "admin", "name": admin["name"]})
    return {"token": token, "role": "admin", "name": admin["name"], "admin_id": admin["admin_id"]}


@app.post("/api/auth/admin/login")
async def admin_login(data: AdminLogin):
    admin = dm.get_admin_by_id(data.admin_id)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin ID or password")
    if not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid admin ID or password")
    token = create_token({"sub": admin["admin_id"], "role": "admin", "name": admin["name"]})
    return {"token": token, "role": "admin", "name": admin["name"], "admin_id": admin["admin_id"]}


@app.post("/api/auth/user/login")
async def user_login(data: UserLogin):
    student = dm.get_student_by_usn(data.usn)
    if not student:
        raise HTTPException(status_code=401, detail="Invalid USN or password")
    if not verify_password(data.password, student["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid USN or password")
    token = create_token({
        "sub": student["usn"], "role": "student",
        "name": student["name"], "student_id": student["id"]
    })
    return {
        "token": token, "role": "student", "name": student["name"],
        "usn": student["usn"], "student_id": student["id"]
    }


# ── Dashboard Summary ──────────────────────────────────────────

@app.get("/api/dashboard/summary")
async def dashboard_summary():
    return dm.get_dashboard_summary()


# ── Student Routes ──────────────────────────────────────────────

@app.post("/api/students")
async def create_student(data: StudentCreate):
    existing = dm.get_student_by_usn(data.usn)
    if existing:
        raise HTTPException(status_code=400, detail="Student with this USN already exists")
    pw_hash = hash_password(data.password)
    student = dm.create_student(data.usn, data.name, data.email, pw_hash, data.semester, data.department)
    if not student:
        raise HTTPException(status_code=400, detail="Failed to create student")
    student.pop("password_hash", None)
    return student


@app.get("/api/students")
async def list_students(
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None, description="name, exam_score, attendance"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    classification: Optional[str] = Query(None, description="Good, Average, Bad"),
    min_attendance: Optional[float] = None,
    max_attendance: Optional[float] = None,
    min_marks: Optional[float] = None,
    max_marks: Optional[float] = None,
    department: Optional[str] = None,
    semester: Optional[int] = None,
):
    students = dm.get_all_students()

    # Enrich with stats
    enriched = []
    for s in students:
        stats = dm.get_student_stats(s["id"])
        s["avg_exam"] = stats["avg_exam"]
        s["avg_assignment"] = stats["avg_assignment"]
        s["avg_attendance"] = stats["avg_attendance"]
        s["total_subjects"] = stats["total_subjects"]
        s["classification"] = classify_student(stats["avg_exam"])
        enriched.append(s)

    # Search
    if search:
        search_l = search.lower()
        enriched = [s for s in enriched if
                    search_l in s["name"].lower() or search_l in s["usn"].lower()]

    # Filter by classification
    if classification:
        enriched = [s for s in enriched if s["classification"] == classification]

    # Filter by department
    if department:
        enriched = [s for s in enriched if s["department"] == department]

    # Filter by semester
    if semester:
        enriched = [s for s in enriched if s["semester"] == semester]

    # Filter by attendance range
    if min_attendance is not None:
        enriched = [s for s in enriched if s["avg_attendance"] >= min_attendance]
    if max_attendance is not None:
        enriched = [s for s in enriched if s["avg_attendance"] <= max_attendance]

    # Filter by marks range
    if min_marks is not None:
        enriched = [s for s in enriched if s["avg_exam"] >= min_marks]
    if max_marks is not None:
        enriched = [s for s in enriched if s["avg_exam"] <= max_marks]

    # Sort
    if sort_by:
        reverse = sort_order == "desc"
        if sort_by == "name":
            enriched.sort(key=lambda x: x["name"].lower(), reverse=reverse)
        elif sort_by == "exam_score":
            enriched.sort(key=lambda x: x["avg_exam"], reverse=reverse)
        elif sort_by == "attendance":
            enriched.sort(key=lambda x: x["avg_attendance"], reverse=reverse)
        elif sort_by == "usn":
            enriched.sort(key=lambda x: x["usn"], reverse=reverse)

    # Remove password hash from response
    for s in enriched:
        s.pop("password_hash", None)

    return {"students": enriched, "total": len(enriched)}


@app.get("/api/students/{student_id}")
async def get_student(student_id: str):
    student = dm.get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.pop("password_hash", None)
    records = dm.get_records_by_student(student_id)
    stats = dm.get_student_stats(student_id)
    prediction = predict_student_performance(stats)
    return {"student": student, "records": records, "stats": stats, "prediction": prediction}


@app.put("/api/students/{student_id}")
async def update_student(student_id: str, data: StudentUpdate):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    result = dm.update_student(student_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Student not found")
    result.pop("password_hash", None)
    return result


@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    if not dm.delete_student(student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}


# ── Academic Record Routes ──────────────────────────────────────

@app.post("/api/students/{student_id}/records")
async def add_record(student_id: str, data: RecordCreate):
    student = dm.get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    record = dm.add_record(student_id, data.subject, data.exam_score,
                           data.assignment_score, data.attendance, data.semester)
    return record


@app.put("/api/records/{record_id}")
async def update_record(record_id: str, data: RecordUpdate):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    result = dm.update_record(record_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Record not found")
    return result


@app.delete("/api/records/{record_id}")
async def delete_record(record_id: str):
    if not dm.delete_record(record_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted successfully"}


# ── Stats & Prediction ─────────────────────────────────────────

@app.get("/api/students/{student_id}/stats")
async def get_student_stats(student_id: str):
    stats = dm.get_student_stats(student_id)
    return stats


@app.get("/api/students/{student_id}/predict")
async def predict(student_id: str):
    stats = dm.get_student_stats(student_id)
    return predict_student_performance(stats)


# ── Chatbot ─────────────────────────────────────────────────────

@app.post("/api/chatbot/{student_id}")
async def chatbot(student_id: str, data: ChatMessage):
    stats = dm.get_student_stats(student_id)
    response = get_chatbot_response(data.message, stats)
    return {"response": response}


# ── Serve Frontend ──────────────────────────────────────────────

@app.get("/")
async def serve_landing():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/login")
async def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


@app.get("/admin-dashboard")
async def serve_admin_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin-dashboard.html"))


@app.get("/student-profile")
async def serve_student_profile():
    return FileResponse(os.path.join(FRONTEND_DIR, "student-profile.html"))


@app.get("/user-dashboard")
async def serve_user_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "user-dashboard.html"))


@app.get("/guide-user")
async def serve_guide_user():
    return FileResponse(os.path.join(FRONTEND_DIR, "guide-user.html"))


@app.get("/guide-admin")
async def serve_guide_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "guide-admin.html"))


# Mount static assets (CSS, JS, images) — must be AFTER route definitions
if os.path.exists(os.path.join(FRONTEND_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
if os.path.exists(os.path.join(FRONTEND_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")
