import unittest

from placement_coach import PlacementCoach


class PlacementCoachTests(unittest.TestCase):
    def setUp(self):
        self.coach = PlacementCoach()

    def test_resume_analysis_identifies_strengths_and_gaps(self):
        analysis = self.coach.analyze_resume(
            "Built two projects and led a college team. Portfolio on GitHub.",
            "Software Engineer",
        )
        self.assertIn("Project experience mentioned", analysis["strengths"])
        self.assertIn("Include internship or practical experience", analysis["placement_gaps"])
        self.assertEqual(analysis["target_role"], "Software Engineer")

    def test_skill_gaps_and_roadmap_generation(self):
        assessed = self.coach.assess_technical_skills(
            {"Data Structures": 60, "Algorithms": 70, "Communication": 75, "Projects": 40}
        )
        gaps = self.coach.identify_placement_gaps(assessed, "software engineer")
        self.assertIn("Data Structures", gaps)
        self.assertIn("Projects", gaps)

        roadmap = self.coach.generate_preparation_roadmap(gaps)
        self.assertGreater(len(roadmap), 0)
        roadmap_skills = [item["skill"] for item in roadmap]
        self.assertIn("Projects", roadmap_skills)

    def test_mock_interview_evaluation_and_adaptation(self):
        questions = self.coach.conduct_mock_interview("software engineer", question_count=3)
        self.assertEqual(len(questions), 3)

        evaluation = self.coach.evaluate_mock_interview(
            [
                {"question": questions[0], "answer": "I would pick a queue because it ensures order and I can explain trade-off with memory."},
                {"question": questions[1], "answer": "I would inspect indexes and provide an example with query plans."},
            ]
        )
        self.assertGreaterEqual(evaluation["overall_score"], 50)

        base_roadmap = [
            {"skill": "Algorithms", "focus_weeks": 1, "goal_score": 75, "actions": "Solve problems"},
        ]
        adapted = self.coach.adapt_learning_plan(base_roadmap, [45, 50, 55])
        self.assertEqual(adapted[0]["focus_weeks"], 2)


if __name__ == "__main__":
    unittest.main()
