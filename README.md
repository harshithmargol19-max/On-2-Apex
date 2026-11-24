# On-2-Apex

AI Placement Coach: an agentic placement preparation platform that analyzes resumes, evaluates technical skills, identifies placement gaps, generates personalized preparation roadmaps, conducts mock interviews, evaluates performance, and adapts learning plans based on progress.

## Minimal implementation included

- `placement_coach.py` provides the core end-to-end coaching workflow:
  - resume analysis
  - skill assessment
  - placement gap identification
  - personalized roadmap generation
  - AI-style mock interview question generation
  - interview performance evaluation
  - adaptive learning-plan updates based on scores
- `tests/test_placement_coach.py` validates the main workflow with focused unit tests.

## Run tests

```bash
python -m unittest discover -s tests -p "test_*.py"
```
