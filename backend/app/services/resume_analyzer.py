import json
import re
import tempfile
import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.llm import LLMProviderConfig
from app.schemas.resume import ResumeAnalysisOut
from app.services.document_engine import document_engine
from app.services.llm_gateway import llm_gateway
from app.core.logging import logger


ANALYSIS_SYSTEM_PROMPT = """You are an elite technical recruiter and interview preparation coach with 15 years of experience at FAANG companies. You analyze resumes and evaluate candidates' interview readiness with brutal honesty and precision.

Evaluate the resume and return ONLY valid JSON with this exact structure:
{
  "interview_readiness_score": <integer 0-100>,
  "short_description": "<2-3 sentence executive summary of candidate profile, strengths, and interview viability>",
  "technical_depth_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "candidate_name": "<extracted candidate name or null>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "interview_topics": ["<topic 1>", "<topic 2>", "<topic 3>", "<topic 4>", "<topic 5>"]
}

Scoring rubric:
- interview_readiness_score: Overall interview conversion likelihood (0=not ready, 100=elite)
- technical_depth_score: Depth of technical skill evidence — projects, complexity, architecture (0-100)
- impact_score: Quantifiable impact — metrics, numbers, XYZ-formula bullets (0-100)
- ats_score: ATS keyword density and formatting compliance (0-100)
- strengths: Top 3 things that will impress interviewers
- improvements: Top 3 specific, actionable changes that would raise the score
- interview_topics: Exactly 5 technical areas interviewers will focus on based on this resume's claims"""


def _heuristic_fallback(markdown: str) -> dict:
    text_lower = markdown.lower()
    skills_count = len(re.findall(r'\b(python|java|react|node|sql|docker|kubernetes|aws|gcp|azure|typescript|go|rust|c\+\+|machine learning|deep learning|fastapi|django|postgresql|redis|kafka)\b', text_lower))
    has_numbers = len(re.findall(r'\d+[%xX]|\$\d+|\d+\s*(users|requests|ms|seconds|million|thousand|k\b)', text_lower))
    has_education = 1 if any(kw in text_lower for kw in ['bachelor', 'master', 'b.tech', 'b.e', 'bca', 'mca']) else 0
    has_projects = len(re.findall(r'project|built|developed|implemented|designed|architected', text_lower))
    has_experience = len(re.findall(r'intern|engineer|developer|analyst|trainee', text_lower))

    technical_depth = min(100, skills_count * 6 + has_projects * 4)
    impact = min(100, has_numbers * 10 + has_experience * 8)
    ats = min(100, skills_count * 5 + 30)
    readiness = int((technical_depth * 0.4 + impact * 0.35 + ats * 0.25))
    readiness = max(20, min(85, readiness))

    candidate_name_match = re.search(r'^([A-Z][a-z]+ [A-Z][a-z]+)', markdown.strip())
    candidate_name = candidate_name_match.group(1) if candidate_name_match else None

    return {
        "interview_readiness_score": readiness,
        "short_description": f"Candidate demonstrates {skills_count} identifiable technical skills with {'strong' if impact > 50 else 'moderate'} quantifiable impact evidence. {'Well-structured' if ats > 60 else 'Resume'} profile with {'clear' if has_education else 'limited'} educational background. Interview readiness is {'high' if readiness > 70 else 'moderate' if readiness > 50 else 'developing'}.",
        "technical_depth_score": technical_depth,
        "impact_score": impact,
        "ats_score": ats,
        "candidate_name": candidate_name,
        "strengths": [
            f"Demonstrates {skills_count} relevant technical skills",
            "Educational credentials support technical roles" if has_education else "Project portfolio showcases practical skills",
            f"Shows {has_projects} technical projects/implementations",
        ],
        "improvements": [
            "Add quantifiable metrics (%, response times, user counts) to every bullet",
            "Include system design keywords: scalability, distributed, microservices, caching",
            "Add more impact-driven verbs: architected, scaled, reduced, optimized, automated",
        ],
        "interview_topics": [
            "Data structures and algorithm complexity",
            "System design and scalability",
            "Core language proficiency and concurrency",
            "Database design and query optimization",
            "Project architecture and technical decisions",
        ],
    }


class ResumeAnalyzerService:
    def _extract_text(self, file_path: str) -> str:
        markdown, _ = document_engine.parse_pdf(file_path)
        return markdown

    def _call_llm(self, markdown: str, user_id: str, db: Session) -> dict:
        prompt = f"""Analyze the following resume and return the JSON evaluation:

---RESUME START---
{markdown[:6000]}
---RESUME END---

Return ONLY the JSON object. No explanation, no markdown fences."""
        try:
            raw = llm_gateway.generate(
                prompt=prompt,
                system_prompt=ANALYSIS_SYSTEM_PROMPT,
                json_mode=True,
                user_id=user_id,
                db=db,
            )
            clean = raw.strip()
            if clean.startswith("```"):
                clean = re.sub(r"^```[a-z]*\n?", "", clean)
                clean = re.sub(r"\n?```$", "", clean)
            return json.loads(clean)
        except Exception as exc:
            logger.warning(f"LLM resume analysis failed, falling back to heuristic: {exc}")
            return _heuristic_fallback(markdown)

    def _build_output(self, data: dict, markdown: str) -> ResumeAnalysisOut:
        def clamp(v, lo=0, hi=100):
            try:
                return max(lo, min(hi, int(v)))
            except (TypeError, ValueError):
                return 50

        return ResumeAnalysisOut(
            interview_readiness_score=clamp(data.get("interview_readiness_score", 50)),
            short_description=str(data.get("short_description", "Analysis complete.")),
            technical_depth_score=clamp(data.get("technical_depth_score", 50)),
            impact_score=clamp(data.get("impact_score", 50)),
            ats_score=clamp(data.get("ats_score", 50)),
            strengths=list(data.get("strengths", [])),
            improvements=list(data.get("improvements", [])),
            interview_topics=list(data.get("interview_topics", [])),
            extracted_markdown=markdown,
            candidate_name=data.get("candidate_name") or None,
            analyzed_at=datetime.now(timezone.utc),
        )

    def analyze_uploaded_file(
        self,
        file: UploadFile,
        user: User,
        db: Session,
        target_position: Optional[str] = None,
    ) -> ResumeAnalysisOut:
        suffix = ".pdf"
        if file.filename:
            ext = os.path.splitext(file.filename)[-1].lower()
            if ext in {".pdf", ".docx", ".doc"}:
                suffix = ext

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name

        try:
            markdown = self._extract_text(tmp_path)
            if target_position:
                markdown = f"TARGET POSITION: {target_position}\n\n{markdown}"
            data = self._call_llm(markdown, str(user.id), db)
            return self._build_output(data, markdown)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    def analyze_existing_resume(
        self,
        resume_id: str,
        user: User,
        db: Session,
    ) -> ResumeAnalysisOut:
        from app.models.resume import GeneratedResume
        record = db.query(GeneratedResume).filter(
            GeneratedResume.id == resume_id,
            GeneratedResume.user_id == user.id,
        ).first()
        if not record:
            from app.core.errors import AppException
            raise AppException(message="Resume not found", code="NOT_FOUND")

        markdown = record.markdown or ""
        data = self._call_llm(markdown, str(user.id), db)
        return self._build_output(data, markdown)


resume_analyzer = ResumeAnalyzerService()
