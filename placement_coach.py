"""Core logic for an AI-inspired placement coaching workflow.

This module provides a deterministic implementation of the core product flow:
resume analysis, skill assessment, placement gap identification, personalized
roadmap generation, mock interviews, performance evaluation, and adaptive
planning updates.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean


ROLE_REQUIREMENTS = {
    "software engineer": {
        "Data Structures": 75,
        "Algorithms": 75,
        "System Design": 65,
        "Databases": 65,
        "Communication": 70,
        "Projects": 70,
    },
    "data analyst": {
        "SQL": 75,
        "Statistics": 70,
        "Python": 70,
        "Data Visualization": 70,
        "Communication": 70,
        "Projects": 65,
    },
}


QUESTION_BANK = {
    "software engineer": [
        "Explain the difference between a stack and a queue.",
        "How would you optimize a slow SQL query?",
        "Describe a system design for a URL shortener.",
        "Tell me about a challenging bug you fixed.",
        "How do you approach time and space trade-offs?",
    ],
    "data analyst": [
        "How do you handle missing values in a dataset?",
        "Explain p-value in simple terms.",
        "Write an SQL query to find top 3 products by revenue.",
        "How would you validate data quality before analysis?",
        "Tell me about a dashboard you built.",
    ],
}


@dataclass(frozen=True)
class PlacementCoach:
    """Placement coach service that models the full preparation cycle."""

    def analyze_resume(self, resume_text: str, target_role: str) -> dict:
        text = resume_text.lower()
        strengths: list[str] = []
        gaps: list[str] = []

        if "project" in text:
            strengths.append("Project experience mentioned")
        else:
            gaps.append("Add at least 2 relevant projects with measurable impact")

        if "intern" in text:
            strengths.append("Industry exposure through internship")
        else:
            gaps.append("Include internship or practical experience")

        if "lead" in text or "team" in text:
            strengths.append("Collaboration or leadership indicators")
        else:
            gaps.append("Highlight teamwork and communication outcomes")

        if "github" in text or "portfolio" in text:
            strengths.append("Public proof of work available")
        else:
            gaps.append("Add GitHub or portfolio links")

        return {
            "target_role": target_role,
            "strengths": strengths,
            "placement_gaps": gaps,
            "readiness_summary": "ready" if len(gaps) <= 1 else "needs improvement",
        }

    def assess_technical_skills(self, skill_scores: dict[str, float]) -> dict[str, int]:
        return {skill: max(0, min(100, int(score))) for skill, score in skill_scores.items()}

    def identify_placement_gaps(
        self, assessed_skills: dict[str, int], target_role: str
    ) -> dict[str, dict[str, int]]:
        requirements = ROLE_REQUIREMENTS.get(target_role.lower(), {})
        return {
            skill: {"required": required, "current": assessed_skills.get(skill, 0)}
            for skill, required in requirements.items()
            if assessed_skills.get(skill, 0) < required
        }

    def generate_preparation_roadmap(
        self, placement_gaps: dict[str, dict[str, int]]
    ) -> list[dict[str, str | int]]:
        roadmap = []
        for skill, scores in sorted(
            placement_gaps.items(), key=lambda item: item[1]["required"] - item[1]["current"], reverse=True
        ):
            gap_size = scores["required"] - scores["current"]
            roadmap.append(
                {
                    "skill": skill,
                    "focus_weeks": 2 if gap_size >= 20 else 1,
                    "goal_score": scores["required"],
                    "actions": f"Practice {skill} daily with curated problems and revision notes",
                }
            )
        return roadmap

    def conduct_mock_interview(self, target_role: str, question_count: int = 5) -> list[str]:
        questions = QUESTION_BANK.get(target_role.lower(), QUESTION_BANK["software engineer"])
        return questions[: max(1, min(question_count, len(questions)))]

    def evaluate_mock_interview(self, answers: list[dict[str, str]]) -> dict:
        if not answers:
            return {
                "overall_score": 0,
                "feedback": ["No answers submitted. Complete the mock interview to receive feedback."],
            }

        answer_scores = []
        feedback = []
        for answer in answers:
            text = answer.get("answer", "").strip()
            score = min(100, len(text) * 2)
            if any(keyword in text.lower() for keyword in ("because", "trade-off", "example")):
                score = min(100, score + 15)
            answer_scores.append(score)
            feedback.append(
                "Strong depth and structure."
                if score >= 70
                else "Add more detail, examples, and rationale in your response."
            )

        return {"overall_score": int(mean(answer_scores)), "feedback": feedback}

    def adapt_learning_plan(
        self, roadmap: list[dict[str, str | int]], interview_scores: list[int]
    ) -> list[dict[str, str | int]]:
        if not roadmap:
            return roadmap

        recent_average = int(mean(interview_scores)) if interview_scores else 0
        adapted = []
        for item in roadmap:
            updated = dict(item)
            if recent_average < 60:
                updated["focus_weeks"] = int(updated["focus_weeks"]) + 1
                updated["actions"] = f"{updated['actions']}; add mentor review and weekly mock round"
            elif recent_average >= 80:
                updated["focus_weeks"] = max(1, int(updated["focus_weeks"]) - 1)
            adapted.append(updated)
        return adapted
