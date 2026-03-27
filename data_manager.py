"""
EduMitra — XLSX Data Manager
Handles all CRUD operations on Excel files for students, admins, and academic records.
"""

import os
import threading
import uuid
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

STUDENT_COLUMNS = ["id", "usn", "name", "email", "password_hash", "semester", "department"]
ADMIN_COLUMNS = ["id", "admin_id", "name", "email", "password_hash"]
RECORD_COLUMNS = ["id", "student_id", "subject", "exam_score", "assignment_score", "attendance", "semester"]


class DataManager:
    """Thread-safe XLSX data manager with in-memory caching."""

    def __init__(self):
        self.lock = threading.Lock()
        os.makedirs(DATA_DIR, exist_ok=True)
        self._load_all()

    def _load_all(self):
        self.students = self._load("students.xlsx", STUDENT_COLUMNS)
        self.admins = self._load("admins.xlsx", ADMIN_COLUMNS)
        self.records = self._load("academic_records.xlsx", RECORD_COLUMNS)

    def _path(self, filename):
        return os.path.join(DATA_DIR, filename)

    def _load(self, filename, columns):
        path = self._path(filename)
        if os.path.exists(path):
            try:
                df = pd.read_excel(path, engine="openpyxl")
                for col in columns:
                    if col not in df.columns:
                        df[col] = ""
                return df
            except Exception:
                return pd.DataFrame(columns=columns)
        return pd.DataFrame(columns=columns)

    def _save(self, df, filename):
        df.to_excel(self._path(filename), index=False, engine="openpyxl")

    @staticmethod
    def _new_id():
        return str(uuid.uuid4())[:8]

    # ── Admin CRUD ──────────────────────────────────────────────
    def get_admin_by_id(self, admin_id: str):
        with self.lock:
            row = self.admins[self.admins["admin_id"] == admin_id]
            return row.iloc[0].to_dict() if not row.empty else None

    def create_admin(self, admin_id: str, name: str, email: str, password_hash: str):
        with self.lock:
            if not self.admins[self.admins["admin_id"] == admin_id].empty:
                return None
            new = pd.DataFrame([{
                "id": self._new_id(),
                "admin_id": admin_id,
                "name": name,
                "email": email,
                "password_hash": password_hash
            }])
            self.admins = pd.concat([self.admins, new], ignore_index=True)
            self._save(self.admins, "admins.xlsx")
            return new.iloc[0].to_dict()

    # ── Student CRUD ────────────────────────────────────────────
    def get_student_by_usn(self, usn: str):
        with self.lock:
            row = self.students[self.students["usn"].str.upper() == usn.upper()]
            return row.iloc[0].to_dict() if not row.empty else None

    def get_student_by_id(self, student_id: str):
        with self.lock:
            row = self.students[self.students["id"] == student_id]
            return row.iloc[0].to_dict() if not row.empty else None

    def get_all_students(self):
        with self.lock:
            return self.students.to_dict("records")

    def create_student(self, usn, name, email, password_hash, semester, department):
        with self.lock:
            if not self.students[self.students["usn"].str.upper() == usn.upper()].empty:
                return None
            new = pd.DataFrame([{
                "id": self._new_id(),
                "usn": usn.upper(),
                "name": name,
                "email": email,
                "password_hash": password_hash,
                "semester": semester,
                "department": department
            }])
            self.students = pd.concat([self.students, new], ignore_index=True)
            self._save(self.students, "students.xlsx")
            return new.iloc[0].to_dict()

    def update_student(self, student_id: str, updates: dict):
        with self.lock:
            idx = self.students.index[self.students["id"] == student_id]
            if idx.empty:
                return None
            for k, v in updates.items():
                if k in self.students.columns and k not in ("id", "password_hash"):
                    self.students.at[idx[0], k] = v
            self._save(self.students, "students.xlsx")
            return self.students.loc[idx[0]].to_dict()

    def delete_student(self, student_id: str):
        with self.lock:
            before = len(self.students)
            self.students = self.students[self.students["id"] != student_id]
            self.records = self.records[self.records["student_id"] != student_id]
            if len(self.students) < before:
                self._save(self.students, "students.xlsx")
                self._save(self.records, "academic_records.xlsx")
                return True
            return False

    # ── Academic Record CRUD ────────────────────────────────────
    def get_records_by_student(self, student_id: str):
        with self.lock:
            rows = self.records[self.records["student_id"] == student_id]
            return rows.to_dict("records")

    def add_record(self, student_id, subject, exam_score, assignment_score, attendance, semester):
        with self.lock:
            new = pd.DataFrame([{
                "id": self._new_id(),
                "student_id": student_id,
                "subject": subject,
                "exam_score": float(exam_score),
                "assignment_score": float(assignment_score),
                "attendance": float(attendance),
                "semester": semester
            }])
            self.records = pd.concat([self.records, new], ignore_index=True)
            self._save(self.records, "academic_records.xlsx")
            return new.iloc[0].to_dict()

    def update_record(self, record_id: str, updates: dict):
        with self.lock:
            idx = self.records.index[self.records["id"] == record_id]
            if idx.empty:
                return None
            for k, v in updates.items():
                if k in ("exam_score", "assignment_score", "attendance", "subject", "semester"):
                    self.records.at[idx[0], k] = float(v) if k != "subject" and k != "semester" else v
            self._save(self.records, "academic_records.xlsx")
            return self.records.loc[idx[0]].to_dict()

    def delete_record(self, record_id: str):
        with self.lock:
            before = len(self.records)
            self.records = self.records[self.records["id"] != record_id]
            if len(self.records) < before:
                self._save(self.records, "academic_records.xlsx")
                return True
            return False

    # ── Analytics ───────────────────────────────────────────────
    def get_student_stats(self, student_id: str):
        with self.lock:
            recs = self.records[self.records["student_id"] == student_id]
            if recs.empty:
                return {"avg_exam": 0, "avg_assignment": 0, "avg_attendance": 0,
                        "subjects": [], "exam_scores": [], "assignment_scores": [],
                        "attendances": [], "total_subjects": 0}
            return {
                "avg_exam": round(recs["exam_score"].mean(), 2),
                "avg_assignment": round(recs["assignment_score"].mean(), 2),
                "avg_attendance": round(recs["attendance"].mean(), 2),
                "subjects": recs["subject"].tolist(),
                "exam_scores": recs["exam_score"].tolist(),
                "assignment_scores": recs["assignment_score"].tolist(),
                "attendances": recs["attendance"].tolist(),
                "total_subjects": len(recs),
            }

    def get_dashboard_summary(self):
        with self.lock:
            total = len(self.students)
            good = avg = bad = 0
            for _, s in self.students.iterrows():
                recs = self.records[self.records["student_id"] == s["id"]]
                if recs.empty:
                    bad += 1
                    continue
                mean_exam = recs["exam_score"].mean()
                if mean_exam >= 75:
                    good += 1
                elif mean_exam >= 50:
                    avg += 1
                else:
                    bad += 1
            return {"total": total, "good": good, "average": avg, "bad": bad}


# Singleton
dm = DataManager()
