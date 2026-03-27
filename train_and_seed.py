"""
EduMitra — Train ML Model & Seed Sample Data
Run this script once to set up the application.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

# Ensure we can import from the project
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)


def train_model():
    """Train a Random Forest model on synthetic student data."""
    print("🧠 Training ML model...")
    np.random.seed(42)
    n = 1000

    exam = np.random.uniform(10, 100, n)
    assign = np.random.uniform(10, 100, n)
    attend = np.random.uniform(20, 100, n)

    # Risk label based on combined score
    combined = exam * 0.4 + assign * 0.2 + attend * 0.4
    labels = []
    for c in combined:
        if c >= 70:
            labels.append("Low Risk")
        elif c >= 45:
            labels.append("Medium Risk")
        else:
            labels.append("High Risk")

    X = np.column_stack([exam, assign, attend])
    y = np.array(labels)

    clf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    clf.fit(X, y)

    model_path = os.path.join(DATA_DIR, "model.joblib")
    joblib.dump(clf, model_path)
    print(f"✅ Model saved to {model_path}")
    return clf


def seed_data():
    """Create sample students and academic records."""
    from auth import hash_password

    print("📋 Seeding sample data...")

    # ── Create sample admins ────────────────────────────────
    admins = pd.DataFrame([
        {"id": "admin001", "admin_id": "admin", "name": "Dr. Rajesh Kumar",
         "email": "admin@edumitra.com", "password_hash": hash_password("admin123")},
        {"id": "admin002", "admin_id": "admin2", "name": "Prof. Ananya Sharma",
         "email": "admin2@edumitra.com", "password_hash": hash_password("admin123")},
    ])
    admins.to_excel(os.path.join(DATA_DIR, "admins.xlsx"), index=False, engine="openpyxl")
    print(f"   ✅ {len(admins)} admins created")

    # ── Create sample students ──────────────────────────────
    np.random.seed(42)
    first_names = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh",
                   "Krishna", "Ishaan", "Shaurya", "Ananya", "Diya", "Myra", "Sara",
                   "Aadhya", "Ira", "Anika", "Priya", "Kavya", "Riya",
                   "Rohan", "Karthik", "Deepak", "Nikhil", "Rahul",
                   "Sneha", "Pooja", "Meera", "Lakshmi", "Nandini",
                   "Amit", "Suresh", "Vijay", "Ganesh", "Harsha",
                   "Divya", "Rashmi", "Swati", "Pallavi", "Tanvi",
                   "Akash", "Pranav", "Siddharth", "Varun", "Tarun",
                   "Neha", "Shruti", "Bhavana", "Chaitra", "Keerthi"]

    departments = ["CSE", "ISE", "ECE", "ME", "EEE", "CE"]
    semesters = [3, 4, 5, 6]

    students = []
    for i, name in enumerate(first_names):
        dept = departments[i % len(departments)]
        sem = semesters[i % len(semesters)]
        usn = f"1ED{22 + (i % 3)}{dept[:2]}{str(i + 1).zfill(3)}"
        students.append({
            "id": f"stu{str(i + 1).zfill(3)}",
            "usn": usn,
            "name": name,
            "email": f"{name.lower()}@edumitra.com",
            "password_hash": hash_password(f"{usn.lower()}"),
            "semester": sem,
            "department": dept,
        })

    students_df = pd.DataFrame(students)
    students_df.to_excel(os.path.join(DATA_DIR, "students.xlsx"), index=False, engine="openpyxl")
    print(f"   ✅ {len(students_df)} students created")

    # ── Create academic records ─────────────────────────────
    subjects_map = {
        3: ["Data Structures", "Digital Electronics", "Discrete Math", "OOP with Java", "Computer Organization"],
        4: ["Operating Systems", "DBMS", "Computer Networks", "Software Engineering", "Linear Algebra"],
        5: ["Machine Learning", "Web Technologies", "Compiler Design", "Theory of Computation", "Cryptography"],
        6: ["Artificial Intelligence", "Cloud Computing", "Big Data Analytics", "Mobile App Dev", "IoT"],
    }

    records = []
    rec_id = 1
    for s in students:
        sem = s["semester"]
        subjects = subjects_map.get(sem, subjects_map[3])
        # Create different performance profiles
        idx = int(s["id"].replace("stu", ""))
        if idx % 5 == 0:
            # High performer
            base_exam, base_assign, base_att = 82, 85, 88
        elif idx % 5 == 1:
            # Good performer
            base_exam, base_assign, base_att = 68, 72, 78
        elif idx % 5 == 2:
            # Average performer
            base_exam, base_assign, base_att = 55, 58, 65
        elif idx % 5 == 3:
            # Below average
            base_exam, base_assign, base_att = 38, 42, 52
        else:
            # At risk
            base_exam, base_assign, base_att = 25, 30, 40

        for subj in subjects:
            exam = max(0, min(100, base_exam + np.random.randint(-12, 13)))
            assign = max(0, min(100, base_assign + np.random.randint(-10, 11)))
            att = max(0, min(100, base_att + np.random.randint(-8, 9)))
            records.append({
                "id": f"rec{str(rec_id).zfill(4)}",
                "student_id": s["id"],
                "subject": subj,
                "exam_score": float(exam),
                "assignment_score": float(assign),
                "attendance": float(att),
                "semester": sem,
            })
            rec_id += 1

    records_df = pd.DataFrame(records)
    records_df.to_excel(os.path.join(DATA_DIR, "academic_records.xlsx"), index=False, engine="openpyxl")
    print(f"   ✅ {len(records_df)} academic records created")
    print("\n🎉 Data seeding complete!")


if __name__ == "__main__":
    train_model()
    seed_data()
