"""
EduMitra — PostgreSQL Data Manager
Handles all CRUD operations on the SQL database for students, admins, and academic records.
"""

import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal, engine
import models

class DataManager:
    """SQL-based data manager using SQLAlchemy sessions."""

    def __init__(self):
        # Tables verified in public schema. Skipping auto-create to avoid pooler conflicts.
        pass

    @staticmethod
    def _new_id():
        return str(uuid.uuid4())[:8]

    def _get_db(self):
        return SessionLocal()

    # ── Admin CRUD ──────────────────────────────────────────────
    def get_admin_by_id(self, admin_id: str):
        db = self._get_db()
        try:
            admin = db.query(models.Admin).filter(models.Admin.admin_id == admin_id).first()
            if not admin:
                return None
            return {
                "id": admin.id,
                "admin_id": admin.admin_id,
                "name": admin.name,
                "email": admin.email,
                "password_hash": admin.password_hash
            }
        finally:
            db.close()

    def create_admin(self, admin_id: str, name: str, email: str, password_hash: str):
        db = self._get_db()
        try:
            # Case-insensitive check for admin_id
            existing = db.query(models.Admin).filter(func.lower(models.Admin.admin_id) == admin_id.lower()).first()
            if existing:
                print(f"⚠️ Admin creation failed: ID {admin_id} already exists")
                return None
            
            new_admin = models.Admin(
                id=self._new_id(),
                admin_id=admin_id,
                name=name,
                email=email,
                password_hash=password_hash
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            print(f"✅ Admin created: {admin_id}")
            return {
                "id": new_admin.id,
                "admin_id": new_admin.admin_id,
                "name": new_admin.name,
                "email": new_admin.email
            }
        except Exception as e:
            print(f"❌ Error creating admin: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    def get_all_admins(self):
        db = self._get_db()
        try:
            admins = db.query(models.Admin).all()
            return [{
                "id": a.id,
                "admin_id": a.admin_id,
                "name": a.name,
                "email": a.email
            } for a in admins]
        except Exception as e:
            print(f"❌ Error fetching admins: {e}")
            return []
        finally:
            db.close()

    # ── Student CRUD ────────────────────────────────────────────
    def get_student_by_usn(self, usn: str):
        db = self._get_db()
        try:
            student = db.query(models.Student).filter(func.upper(models.Student.usn) == usn.upper()).first()
            if not student:
                return None
            return {
                "id": student.id,
                "usn": student.usn,
                "name": student.name,
                "email": student.email,
                "password_hash": student.password_hash,
                "semester": student.semester,
                "department": student.department
            }
        finally:
            db.close()

    def get_student_by_id(self, student_id: str):
        db = self._get_db()
        try:
            student = db.query(models.Student).filter(models.Student.id == student_id).first()
            if not student:
                return None
            return {
                "id": student.id,
                "usn": student.usn,
                "name": student.name,
                "email": student.email,
                "password_hash": student.password_hash,
                "semester": student.semester,
                "department": student.department
            }
        finally:
            db.close()

    def get_all_students(self):
        db = self._get_db()
        try:
            students = db.query(models.Student).all()
            return [{
                "id": s.id,
                "usn": s.usn,
                "name": s.name,
                "email": s.email,
                "password_hash": s.password_hash,
                "semester": s.semester,
                "department": s.department
            } for s in students]
        finally:
            db.close()

    def get_all_students_enriched(self):
        """Fetches all students with pre-calculated academic averages in ONE query."""
        db = self._get_db()
        try:
            # Join Student with AcademicRecord and group by student ID
            results = db.query(
                models.Student,
                func.avg(models.AcademicRecord.exam_score).label("avg_exam"),
                func.avg(models.AcademicRecord.assignment_score).label("avg_assign"),
                func.avg(models.AcademicRecord.attendance).label("avg_att"),
                func.count(models.AcademicRecord.id).label("total_subjects")
            ).outerjoin(models.AcademicRecord, models.Student.id == models.AcademicRecord.student_id)\
             .group_by(models.Student.id).all()
            
            enriched = []
            for s, avg_exam, avg_assign, avg_att, total_subjects in results:
                enriched.append({
                    "id": s.id,
                    "usn": s.usn,
                    "name": s.name,
                    "email": s.email,
                    "password_hash": s.password_hash,
                    "semester": s.semester,
                    "department": s.department,
                    "avg_exam": round(float(avg_exam or 0), 2),
                    "avg_assignment": round(float(avg_assign or 0), 2),
                    "avg_attendance": round(float(avg_att or 0), 2),
                    "total_subjects": total_subjects
                })
            return enriched
        finally:
            db.close()

    def create_student(self, usn, name, email, password_hash, semester, department):
        db = self._get_db()
        try:
            # Case-insensitive USN check
            normalized_usn = usn.strip().upper()
            existing = db.query(models.Student).filter(func.upper(models.Student.usn) == normalized_usn).first()
            if existing:
                print(f"⚠️ Student creation failed: USN {normalized_usn} already exists")
                return None
            
            new_student = models.Student(
                id=self._new_id(),
                usn=normalized_usn,
                name=name.strip(),
                email=email.strip().lower(),
                password_hash=password_hash,
                semester=int(semester),
                department=department.strip()
            )
            db.add(new_student)
            db.commit()
            db.refresh(new_student)
            print(f"✅ Student created: {normalized_usn}")
            return {
                "id": new_student.id,
                "usn": new_student.usn,
                "name": new_student.name,
                "email": new_student.email,
                "semester": new_student.semester,
                "department": new_student.department
            }
        except Exception as e:
            print(f"❌ Error creating student: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    def update_student(self, student_id: str, updates: dict):
        db = self._get_db()
        try:
            student = db.query(models.Student).filter(models.Student.id == student_id).first()
            if not student:
                return None
            
            for k, v in updates.items():
                if hasattr(student, k) and k not in ("id", "password_hash"):
                    setattr(student, k, v)
            
            db.commit()
            db.refresh(student)
            return {
                "id": student.id,
                "usn": student.usn,
                "name": student.name,
                "email": student.email,
                "semester": student.semester,
                "department": student.department
            }
        finally:
            db.close()

    def delete_student(self, student_id: str):
        db = self._get_db()
        try:
            student = db.query(models.Student).filter(models.Student.id == student_id).first()
            if not student:
                return False
            db.delete(student)
            db.commit()
            return True
        finally:
            db.close()

    # ── Academic Record CRUD ────────────────────────────────────
    def get_records_by_student(self, student_id: str):
        db = self._get_db()
        try:
            records = db.query(models.AcademicRecord).filter(models.AcademicRecord.student_id == student_id).all()
            return [{
                "id": r.id,
                "student_id": r.student_id,
                "subject": r.subject,
                "exam_score": r.exam_score,
                "assignment_score": r.assignment_score,
                "attendance": r.attendance,
                "semester": r.semester
            } for r in records]
        finally:
            db.close()

    def add_record(self, student_id, subject, exam_score, assignment_score, attendance, semester):
        db = self._get_db()
        try:
            new_rec = models.AcademicRecord(
                id=self._new_id(),
                student_id=student_id,
                subject=subject,
                exam_score=float(exam_score),
                assignment_score=float(assignment_score),
                attendance=float(attendance),
                semester=semester
            )
            db.add(new_rec)
            db.commit()
            db.refresh(new_rec)
            return {
                "id": new_rec.id,
                "student_id": new_rec.student_id,
                "subject": new_rec.subject,
                "exam_score": new_rec.exam_score,
                "assignment_score": new_rec.assignment_score,
                "attendance": new_rec.attendance,
                "semester": new_rec.semester
            }
        finally:
            db.close()

    def update_record(self, record_id: str, updates: dict):
        db = self._get_db()
        try:
            record = db.query(models.AcademicRecord).filter(models.AcademicRecord.id == record_id).first()
            if not record:
                return None
            
            for k, v in updates.items():
                if k in ("exam_score", "assignment_score", "attendance", "subject", "semester"):
                    setattr(record, k, float(v) if k not in ("subject", "semester") else v)
            
            db.commit()
            db.refresh(record)
            return {
                "id": record.id,
                "student_id": record.student_id,
                "subject": record.subject,
                "exam_score": record.exam_score,
                "assignment_score": record.assignment_score,
                "attendance": record.attendance,
                "semester": record.semester
            }
        finally:
            db.close()

    def delete_record(self, record_id: str):
        db = self._get_db()
        try:
            record = db.query(models.AcademicRecord).filter(models.AcademicRecord.id == record_id).first()
            if not record:
                return False
            db.delete(record)
            db.commit()
            return True
        finally:
            db.close()

    # ── Analytics ───────────────────────────────────────────────
    def get_student_stats(self, student_id: str):
        db = self._get_db()
        try:
            recs = db.query(models.AcademicRecord).filter(models.AcademicRecord.student_id == student_id).all()
            if not recs:
                return {"avg_exam": 0, "avg_assignment": 0, "avg_attendance": 0,
                        "subjects": [], "exam_scores": [], "assignment_scores": [],
                        "attendances": [], "total_subjects": 0}
            
            exam_scores = [r.exam_score for r in recs]
            assignment_scores = [r.assignment_score for r in recs]
            attendances = [r.attendance for r in recs]
            
            return {
                "avg_exam": round(sum(exam_scores) / len(recs), 2),
                "avg_assignment": round(sum(assignment_scores) / len(recs), 2),
                "avg_attendance": round(sum(attendances) / len(recs), 2),
                "subjects": [r.subject for r in recs],
                "exam_scores": exam_scores,
                "assignment_scores": assignment_scores,
                "attendances": attendances,
                "total_subjects": len(recs),
            }
        finally:
            db.close()

    def get_dashboard_summary(self):
        """Enhanced summary with breakdowns for Marks, Assignments, and Attendance."""
        db = self._get_db()
        try:
            total_students = db.query(models.Student).count()
            if total_students == 0:
                return {
                    "total": 0, "good": 0, "average": 0, "poor": 0,
                    "marks": {"good": 0, "average": 0, "poor": 0},
                    "assignments": {"good": 0, "average": 0, "poor": 0},
                    "attendance": {"good": 0, "average": 0, "poor": 0}
                }
            
            # Subquery to get average academic scores by student_id
            avg_subquery = db.query(
                models.AcademicRecord.student_id,
                func.avg(models.AcademicRecord.exam_score).label("avg_exam"),
                func.avg(models.AcademicRecord.assignment_score).label("avg_assign"),
                func.avg(models.AcademicRecord.attendance).label("avg_att")
            ).group_by(models.AcademicRecord.student_id).all()
            
            # Overall counts
            good = avg = poor = 0
            
            # Detailed counts per dimension
            m_good = m_avg = m_poor = 0
            a_good = a_avg = a_poor = 0
            att_good = att_avg = att_poor = 0
            
            student_ids_with_records = set()
            
            for row in avg_subquery:
                student_ids_with_records.add(row.student_id)
                # Weighted overall score: 70% exam, 30% assignment
                overall_score = (row.avg_exam * 0.7) + (row.avg_assign * 0.3)
                
                # Overall
                if overall_score >= 75: good += 1
                elif overall_score >= 50: avg += 1
                else: poor += 1
                
                # Marks (Exam)
                if row.avg_exam >= 75: m_good += 1
                elif row.avg_exam >= 50: m_avg += 1
                else: m_poor += 1
                
                # Assignments
                if row.avg_assign >= 75: a_good += 1
                elif row.avg_assign >= 50: a_avg += 1
                else: a_poor += 1
                
                # Attendance
                if row.avg_att >= 85: att_good += 1
                elif row.avg_att >= 75: att_avg += 1
                else: att_poor += 1
            
            # Students with no records are considered poor/at-risk
            missing_count = total_students - len(student_ids_with_records)
            poor += missing_count
            m_poor += missing_count
            a_poor += missing_count
            att_poor += missing_count
            
            return {
                "total": total_students,
                "good": good, "average": avg, "poor": poor,
                "marks": {"good": m_good, "average": m_avg, "poor": m_poor},
                "assignments": {"good": a_good, "average": a_avg, "poor": a_poor},
                "attendance": {"good": att_good, "average": att_avg, "poor": att_poor}
            }
        except Exception as e:
            print(f"❌ Error in dashboard summary: {e}")
            return {"total": 0, "good": 0, "average": 0, "bad": 0}
        finally:
            db.close()

# Singleton
dm = DataManager()
