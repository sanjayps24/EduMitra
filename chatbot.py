"""
EduMitra — Rule-Based Chatbot
Provides personalized improvement roadmaps based on student academic data.
"""


def _attendance_advice(avg_attendance: float) -> list[str]:
    tips = []
    if avg_attendance < 50:
        tips.extend([
            "🚨 **Critical**: Your attendance is dangerously low. Most institutions require ≥75%.",
            "📅 Set daily alarms and create a strict schedule for attending classes.",
            "🤝 Find an accountability partner who can remind you to attend.",
            "📝 Talk to your faculty about attendance recovery options.",
            "🏥 If health issues are causing absences, get medical documentation and inform your HOD."
        ])
    elif avg_attendance < 65:
        tips.extend([
            "⚠️ Your attendance needs significant improvement to avoid academic penalties.",
            "📆 Plan your week every Sunday — block out class times as non-negotiable.",
            "📍 Sit in the front rows to stay engaged and avoid the temptation to skip.",
            "📱 Disable social media notifications during class hours."
        ])
    elif avg_attendance < 75:
        tips.extend([
            "📊 You're close to the minimum required attendance. Don't risk it!",
            "🎯 Aim for 85%+ attendance to build a safety margin.",
            "✅ Track your attendance weekly using a simple spreadsheet."
        ])
    elif avg_attendance < 85:
        tips.extend([
            "👍 Decent attendance! Push it above 85% for optimal learning.",
            "💡 Remember: consistent attendance correlates with better exam scores."
        ])
    else:
        tips.append("🌟 Excellent attendance! Keep it up — you're building great discipline.")
    return tips


def _exam_advice(avg_exam: float, subjects: list, scores: list) -> list[str]:
    tips = []
    if avg_exam < 35:
        tips.extend([
            "🚨 **Critical**: Your exam scores indicate serious academic trouble.",
            "📚 Go back to basics — revise foundational concepts for each subject.",
            "👨‍🏫 Seek extra tutoring or join study groups immediately.",
            "📝 Practice previous year question papers daily.",
            "🧠 Use the Feynman technique: try to explain concepts in simple words."
        ])
    elif avg_exam < 50:
        tips.extend([
            "⚠️ Below-average scores. You need a structured study plan.",
            "📖 Dedicate at least 2-3 hours daily to focused study.",
            "🗂️ Break each subject into topics and master them one by one.",
            "✍️ Solve at least 5 practice problems per weak subject daily."
        ])
    elif avg_exam < 65:
        tips.extend([
            "📊 Average performance. You have room for significant improvement.",
            "🎯 Focus on your 2-3 weakest subjects for the maximum score boost.",
            "📝 Create summary notes and formula sheets for quick revision.",
            "⏰ Use the Pomodoro technique: 25 min study, 5 min break."
        ])
    elif avg_exam < 80:
        tips.extend([
            "👍 Good scores! Push for excellence with targeted improvements.",
            "🔍 Analyze your mistakes in past exams to find patterns.",
            "📈 Challenge yourself with advanced problems and reference books."
        ])
    else:
        tips.extend([
            "🌟 Outstanding exam performance! You are in the top tier.",
            "🚀 Enhancement Tip: Try solving competitive programming challenges or participating in hackathons.",
            "📚 Enhancement Tip: Read recent research papers in your favorite subjects.",
            "🤝 Enhancement Tip: Mentor your peers—teaching is the best way to solidify your own knowledge."
        ])

    # Subject-specific weak areas
    if subjects and scores:
        weak = [(s, sc) for s, sc in zip(subjects, scores) if sc < 50]
        if weak:
            tips.append("\n📌 **Weak Subjects Needing Immediate Attention:**")
            for subj, sc in sorted(weak, key=lambda x: x[1]):
                tips.append(f"   • **{subj}** — Score: {sc}%. Focus on fundamentals and practice problems.")

    return tips


def _assignment_advice(avg_assignment: float) -> list[str]:
    tips = []
    if avg_assignment < 50:
        tips.extend([
            "📋 Your assignment scores are low. Assignments are easy marks — don't waste them!",
            "✅ Submit every assignment on time, even if incomplete.",
            "🤝 Discuss assignment problems with classmates before solving."
        ])
    elif avg_assignment < 70:
        tips.extend([
            "📝 Improve assignment quality: read the rubric carefully and address all points.",
            "📅 Start assignments early — don't leave them for the last day."
        ])
    else:
        tips.append("✨ Good assignment performance! Maintain this consistency.")
    return tips


def _general_roadmap(avg_exam: float, avg_attendance: float) -> list[str]:
    tips = ["\n🗺️ **Your Personalized 30-Day Improvement Roadmap:**"]

    if avg_exam < 50 or avg_attendance < 65:
        tips.extend([
            "**Week 1**: Audit all subjects. List topics you don't understand. Attend ALL classes.",
            "**Week 2**: Focus on 2 weakest subjects. Solve 10 problems/day. Meet professors during office hours.",
            "**Week 3**: Take mock tests for weak subjects. Review mistakes. Continue 100% attendance.",
            "**Week 4**: Full revision. Solve previous year papers under timed conditions. Stay confident!"
        ])
    elif avg_exam < 70:
        tips.extend([
            "**Week 1**: Identify knowledge gaps with self-assessment tests per subject.",
            "**Week 2**: Deep dive into weak topics. Create mind maps and summary sheets.",
            "**Week 3**: Practice advanced problems. Form/join a study group.",
            "**Week 4**: Mock exams and revision. Focus on time management during tests."
        ])
    else:
        tips.extend([
            "**Week 1**: Explore advanced reference books and research topics in your field.",
            "**Week 2**: Build a challenging mini-project to apply your concepts practically.",
            "**Week 3**: Mentor a peer or lead a study group. Explaining concepts boosts retention.",
            "**Week 4**: Prepare a portfolio of your work and apply for internships or specialized certifications.",
            "**Ongoing**: Maintain your excellent momentum and always stay curious!"
        ])

    return tips


def get_chatbot_response(message: str, stats: dict) -> str:
    """Generate a chatbot response based on the message and student stats."""
    msg = message.lower().strip()
    avg_exam = stats.get("avg_exam", 0)
    avg_assign = stats.get("avg_assignment", 0)
    avg_att = stats.get("avg_attendance", 0)
    subjects = stats.get("subjects", [])
    exam_scores = stats.get("exam_scores", [])

    # Greeting
    if any(w in msg for w in ["hi", "hello", "hey", "help", "start"]):
        return (
            "👋 Hello! I'm the **EduMitra Academic Advisor**.\n\n"
            "I can help you with:\n"
            "• 📈 **Improvement roadmap** — type `roadmap` or `improve`\n"
            "• 📚 **Exam tips** — type `exam` or `study`\n"
            "• 📅 **Attendance advice** — type `attendance`\n"
            "• 📝 **Assignment help** — type `assignment`\n"
            "• 📊 **Performance summary** — type `summary` or `status`\n\n"
            "What would you like to know?"
        )

    responses = []

    # Summary
    if any(w in msg for w in ["summary", "status", "performance", "how am i"]):
        responses.append(f"📊 **Your Performance Summary:**\n"
                         f"• Average Exam Score: **{avg_exam}%**\n"
                         f"• Average Assignment Score: **{avg_assign}%**\n"
                         f"• Average Attendance: **{avg_att}%**\n"
                         f"• Classification: **{'Good' if avg_exam >= 75 else 'Average' if avg_exam >= 50 else 'Needs Improvement'}**")

    # Roadmap / Improve
    if any(w in msg for w in ["roadmap", "improve", "plan", "better", "strategy"]):
        responses.extend(_exam_advice(avg_exam, subjects, exam_scores))
        responses.extend(_attendance_advice(avg_att))
        responses.extend(_assignment_advice(avg_assign))
        responses.extend(_general_roadmap(avg_exam, avg_att))

    # Exam specific
    elif any(w in msg for w in ["exam", "study", "score", "marks", "test"]):
        responses.extend(_exam_advice(avg_exam, subjects, exam_scores))

    # Attendance specific
    elif any(w in msg for w in ["attendance", "absent", "present", "class"]):
        responses.extend(_attendance_advice(avg_att))

    # Assignment specific
    elif any(w in msg for w in ["assignment", "homework", "project", "submission"]):
        responses.extend(_assignment_advice(avg_assign))

    if not responses:
        return (
            "🤔 I'm not sure I understand. Try asking about:\n"
            "• `roadmap` — full improvement plan\n"
            "• `exam` — exam score tips\n"
            "• `attendance` — attendance advice\n"
            "• `assignment` — assignment tips\n"
            "• `summary` — your performance overview"
        )

    return "\n".join(responses)
