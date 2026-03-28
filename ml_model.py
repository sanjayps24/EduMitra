"""
EduMitra — ML Model
Random Forest Classifier for student performance classification and risk prediction.
"""

import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "model.joblib")


def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


model = load_model()


def classify_student(avg_exam: float, avg_assign: float = None) -> str:
    """Classify based on average academic performance (70% Exam, 30% Assignment)."""
    if avg_assign is None:
        # Fallback to pure exam score if assignment is not available
        score = avg_exam
    else:
        score = (avg_exam * 0.7) + (avg_assign * 0.3)
    
    if score >= 75:
        return "Good"
    elif score >= 50:
        return "Average"
    return "Poor"


def predict_risk(exam_score: float, assignment_score: float, attendance: float) -> dict:
    """Predict risk level using ML model with fallback to rule-based."""
    global model
    if model is None:
        model = load_model()

    if model is not None:
        try:
            features = np.array([[exam_score, assignment_score, attendance]])
            prediction = model.predict(features)[0]
            probabilities = model.predict_proba(features)[0]
            classes = model.classes_.tolist()
            prob_dict = {str(c): round(float(p) * 100, 1) for c, p in zip(classes, probabilities)}
            return {
                "risk_level": str(prediction),
                "probabilities": prob_dict,
                "method": "ml"
            }
        except Exception:
            pass

    # Fallback rule-based
    score = (exam_score * 0.4) + (assignment_score * 0.2) + (attendance * 0.4)
    if score >= 70:
        risk = "Low Risk"
    elif score >= 45:
        risk = "Medium Risk"
    else:
        risk = "High Risk"

    return {
        "risk_level": risk,
        "probabilities": {
            "Low Risk": round(max(0, score - 30) * 1.4, 1),
            "Medium Risk": round(max(0, 100 - abs(score - 55) * 2), 1),
            "High Risk": round(max(0, (70 - score) * 1.4), 1)
        },
        "method": "rule-based"
    }


def predict_student_performance(stats: dict) -> dict:
    """Full prediction for a student given their stats."""
    avg_exam = stats.get("avg_exam", 0)
    avg_assign = stats.get("avg_assignment", 0)
    avg_att = stats.get("avg_attendance", 0)

    classification = classify_student(avg_exam, avg_assign)
    risk = predict_risk(avg_exam, avg_assign, avg_att)

    # Separate risk for attendance and exams/assignments
    att_risk_level = "High Risk" if avg_att < 60 else ("Medium Risk" if avg_att < 75 else "Low Risk")
    exam_risk_level = "High Risk" if avg_exam < 50 else ("Medium Risk" if avg_exam < 70 else "Low Risk")
    assign_risk_level = "High Risk" if avg_assign < 50 else ("Medium Risk" if avg_assign < 70 else "Low Risk")

    return {
        "classification": classification,
        "overall_risk": risk,
        "attendance_risk": att_risk_level,
        "exam_risk": exam_risk_level,
        "assignment_risk": assign_risk_level,
        "scores": {
            "avg_exam": avg_exam,
            "avg_assignment": avg_assign,
            "avg_attendance": avg_att
        }
    }
