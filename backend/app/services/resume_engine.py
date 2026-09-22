import json
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.errors import AppException
from app.models.job import Job
from app.models.profile import Project, Experience
from app.models.resume import GeneratedResume
from app.models.user import User
from app.schemas.resume import (
    GeneratedResumeBrief,
    GeneratedResumeOut,
    ResumeApplyRequest,
    ResumeDiffItem,
    ResumeGenerateRequest,
    ResumeUpdateRequest,
)
from app.services.llm_gateway import llm_gateway

RESUME_SYSTEM_PROMPT = """You are an Elite Technical Resume Strategist and ATS Optimization Specialist.
Given a candidate's profile and target job description, generate tailored project and experience bullets.
Follow the Google XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]'.
STRICT INVARIANT: NEVER hallucinate, invent, or fabricate companies, unearned degrees, metrics, or technologies not present in the candidate's existing record.
Return ONLY a valid JSON object matching this schema:
{
  "position": "Target Position Name",
  "tags": ["Role 1", "Role 2", "Role 3"],
  "projects": [
    {
      "id": "project_id_or_title",
      "title": "Project Title",
      "bullets": [
        "Tailored bullet 1 following XYZ formula",
        "Tailored bullet 2 following XYZ formula"
      ],
      "explanation": "Why this was tailored for the target job",
      "keywords_added": ["Keyword1", "Keyword2"]
    }
  ],
  "experiences": [
    {
      "id": "experience_id_or_company",
      "company": "Company Name",
      "role": "Role Title",
      "bullets": [
        "Tailored bullet 1 following XYZ formula"
      ],
      "explanation": "Why this was tailored for the target job",
      "keywords_added": ["Keyword1"]
    }
  ]
}"""


class ResumeTailorEngine:
    def generate_resume(
        self,
        db: Session,
        user: User,
        request: ResumeGenerateRequest,
    ) -> GeneratedResumeOut:
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if not job:
            raise AppException(message="Job not found.", code="NOT_FOUND", status_code=404)

        position = (request.custom_position or job.title).strip()
        user_prof = getattr(user, "profile", None) or getattr(user, "student_profile", None)
        candidate_name = user.full_name or (user_prof.full_name if user_prof and hasattr(user_prof, "full_name") else "Candidate")
        email = user.email
        phone = user_prof.phone if user_prof and user_prof.phone else ""
        location = user_prof.location if user_prof and user_prof.location else ""

        skills = [s.name for s in user.skills] if user.skills else ["Python", "FastAPI", "SQL", "Git"]
        projects = user.projects or []
        experiences = user.experiences or []
        educations = user.educations or []
        certifications = [c.name for c in user.certifications] if user.certifications else []

        tailored_data, diff_items = self._tailor_content(
            db=db,
            user=user,
            job=job,
            position=position,
            custom_instructions=request.custom_instructions,
            projects=projects,
            experiences=experiences,
        )

        tags = tailored_data.get("tags") or self._generate_default_tags(position)
        applied_companies = [job.company] if job.company else []

        structured_content = {
            "contact": {
                "name": candidate_name,
                "email": email,
                "phone": phone,
                "location": location,
            },
            "position": position,
            "tags": tags,
            "skills": skills,
            "projects": tailored_data.get("projects", []),
            "experiences": tailored_data.get("experiences", []),
            "educations": [
                {
                    "institution": edu.institution,
                    "degree": edu.degree,
                    "branch": edu.branch or "",
                    "cgpa": edu.cgpa or "",
                    "start_year": edu.start_year,
                    "end_year": edu.end_year,
                }
                for edu in educations
            ],
            "certifications": certifications,
        }

        markdown = self._build_markdown(structured_content)
        latex = self._build_latex(structured_content)

        resume_record = GeneratedResume(
            user_id=user.id,
            job_id=job.id,
            position=position,
            tags=tags,
            applied_companies=applied_companies,
            content=structured_content,
            markdown=markdown,
            latex=latex,
            diffs=[d.model_dump() for d in diff_items],
            status="DRAFT",
        )
        db.add(resume_record)
        db.commit()
        db.refresh(resume_record)

        return GeneratedResumeOut.model_validate(resume_record)

    def list_resumes(
        self,
        db: Session,
        user: User,
        tag: Optional[str] = None,
        position: Optional[str] = None,
    ) -> List[GeneratedResumeBrief]:
        query = db.query(GeneratedResume).filter(GeneratedResume.user_id == user.id)
        if position:
            query = query.filter(GeneratedResume.position.ilike(f"%{position.strip()}%"))
        resumes = query.order_by(GeneratedResume.created_at.desc()).all()

        if tag:
            normalized_tag = tag.strip().lower()
            resumes = [
                r for r in resumes
                if any(normalized_tag in t.lower() for t in (r.tags or []))
            ]

        results = []
        for r in resumes:
            results.append(
                GeneratedResumeBrief(
                    id=r.id,
                    user_id=r.user_id,
                    job_id=r.job_id,
                    position=r.position,
                    tags=r.tags or [],
                    applied_companies=r.applied_companies or [],
                    status=r.status,
                    diffs_count=len(r.diffs or []),
                    created_at=r.created_at,
                )
            )
        return results

    def get_resume_by_id(
        self,
        db: Session,
        user: User,
        resume_id: str,
    ) -> GeneratedResumeOut:
        resume = (
            db.query(GeneratedResume)
            .filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == user.id)
            .first()
        )
        if not resume:
            raise AppException(message="Resume not found.", code="NOT_FOUND", status_code=404)
        return GeneratedResumeOut.model_validate(resume)

    def update_resume(
        self,
        db: Session,
        user: User,
        resume_id: str,
        payload: ResumeUpdateRequest,
    ) -> GeneratedResumeOut:
        resume = (
            db.query(GeneratedResume)
            .filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == user.id)
            .first()
        )
        if not resume:
            raise AppException(message="Resume not found.", code="NOT_FOUND", status_code=404)

        if payload.position is not None:
            resume.position = payload.position.strip()
        if payload.tags is not None:
            resume.tags = payload.tags
        if payload.applied_companies is not None:
            resume.applied_companies = payload.applied_companies
        if payload.status is not None:
            resume.status = payload.status
        if payload.content is not None:
            resume.content = payload.content
            resume.markdown = self._build_markdown(resume.content)
            resume.latex = self._build_latex(resume.content)

        db.commit()
        db.refresh(resume)
        return GeneratedResumeOut.model_validate(resume)

    def record_application(
        self,
        db: Session,
        user: User,
        resume_id: str,
        payload: ResumeApplyRequest,
    ) -> GeneratedResumeOut:
        resume = (
            db.query(GeneratedResume)
            .filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == user.id)
            .first()
        )
        if not resume:
            raise AppException(message="Resume not found.", code="NOT_FOUND", status_code=404)

        company = payload.company_name.strip()
        current_list = list(resume.applied_companies or [])
        if company and company not in current_list:
            current_list.append(company)
            resume.applied_companies = current_list
            db.commit()
            db.refresh(resume)

        return GeneratedResumeOut.model_validate(resume)

    def delete_resume(
        self,
        db: Session,
        user: User,
        resume_id: str,
    ) -> None:
        resume = (
            db.query(GeneratedResume)
            .filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == user.id)
            .first()
        )
        if not resume:
            raise AppException(message="Resume not found.", code="NOT_FOUND", status_code=404)

        db.delete(resume)
        db.commit()

    def _tailor_content(
        self,
        db: Session,
        user: User,
        job: Job,
        position: str,
        custom_instructions: Optional[str],
        projects: List[Project],
        experiences: List[Experience],
    ) -> tuple[Dict[str, Any], List[ResumeDiffItem]]:
        projects_input = [
            {
                "id": str(p.id),
                "title": p.title,
                "description": p.description or "",
                "technologies": p.technologies or [],
            }
            for p in projects
        ]
        experiences_input = [
            {
                "id": str(e.id),
                "company": e.company,
                "role": e.role,
                "description": e.description or "",
            }
            for e in experiences
        ]

        user_prompt = f"""Target Position: {position} at {job.company or 'Target Company'}
Job Description Requirements:
{job.description[:1500]}

Candidate Existing Projects:
{json.dumps(projects_input)}

Candidate Existing Experiences:
{json.dumps(experiences_input)}

Custom Instructions: {custom_instructions or 'Tailor bullets for maximum ATS match without fabricating unearned credentials.'}"""

        diff_items: List[ResumeDiffItem] = []
        try:
            raw_response = llm_gateway.generate(
                prompt=user_prompt,
                system_prompt=RESUME_SYSTEM_PROMPT,
                json_mode=True,
                user_id=user.id,
                db=db,
            )
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            data = json.loads(cleaned)

            tailored_projects = data.get("projects", [])
            tailored_experiences = data.get("experiences", [])

            for p_orig in projects:
                matching_tp = next((tp for tp in tailored_projects if str(tp.get("id")) == str(p_orig.id) or tp.get("title") == p_orig.title), None)
                if matching_tp:
                    orig_text = p_orig.description or p_orig.title
                    tailored_text = " ".join(matching_tp.get("bullets", [])) or orig_text
                    diff_items.append(
                        ResumeDiffItem(
                            section="projects",
                            item_id=str(p_orig.id),
                            original=orig_text,
                            tailored=tailored_text,
                            explanation=matching_tp.get("explanation", "Aligned project details with role expectations."),
                            keywords_added=matching_tp.get("keywords_added", []),
                        )
                    )

            for e_orig in experiences:
                matching_te = next((te for te in tailored_experiences if str(te.get("id")) == str(e_orig.id) or te.get("company") == e_orig.company), None)
                if matching_te:
                    orig_text = e_orig.description or e_orig.role
                    tailored_text = " ".join(matching_te.get("bullets", [])) or orig_text
                    diff_items.append(
                        ResumeDiffItem(
                            section="experiences",
                            item_id=str(e_orig.id),
                            original=orig_text,
                            tailored=tailored_text,
                            explanation=matching_te.get("explanation", "Aligned experience bullet points with role scope."),
                            keywords_added=matching_te.get("keywords_added", []),
                        )
                    )

            return data, diff_items
        except Exception:
            pass

        return self._generate_fallback(projects, experiences, position)

    def _generate_fallback(
        self,
        projects: List[Project],
        experiences: List[Experience],
        position: str,
    ) -> tuple[Dict[str, Any], List[ResumeDiffItem]]:
        fb_projects = []
        for p in projects:
            desc = p.description or f"Implemented core features for {p.title} using {', '.join(p.technologies or ['Python'])}."
            fb_projects.append({
                "id": str(p.id),
                "title": p.title,
                "bullets": [desc],
                "technologies": p.technologies or [],
                "explanation": "Preserved original verified project evidence.",
                "keywords_added": [],
            })

        fb_experiences = []
        for e in experiences:
            desc = e.description or f"Contributed to software engineering workflows as {e.role} at {e.company}."
            fb_experiences.append({
                "id": str(e.id),
                "company": e.company,
                "role": e.role,
                "bullets": [desc],
                "explanation": "Preserved original verified experience record.",
                "keywords_added": [],
            })

        tags = self._generate_default_tags(position)
        return {
            "position": position,
            "tags": tags,
            "projects": fb_projects,
            "experiences": fb_experiences,
        }, []

    def _generate_default_tags(self, position: str) -> List[str]:
        cleaned = position.strip()
        tags = [cleaned]
        if "Senior" in cleaned:
            tags.append(cleaned.replace("Senior", "").strip())
        elif "Junior" in cleaned or "Associate" in cleaned:
            tags.append(cleaned.replace("Junior", "").replace("Associate", "").strip())
        if "Engineer" in cleaned and "Developer" not in cleaned:
            tags.append(cleaned.replace("Engineer", "Developer").strip())
        elif "Developer" in cleaned and "Engineer" not in cleaned:
            tags.append(cleaned.replace("Developer", "Engineer").strip())
        return list(dict.fromkeys(tags))[:4]

    def _build_markdown(self, data: Dict[str, Any]) -> str:
        contact = data.get("contact", {})
        position = data.get("position", "Software Engineer")
        tags = data.get("tags", [])
        skills = data.get("skills", [])
        projects = data.get("projects", [])
        experiences = data.get("experiences", [])
        educations = data.get("educations", [])
        certifications = data.get("certifications", [])

        lines = [
            f"# {contact.get('name', 'Candidate')}",
            f"**Target Role:** {position}  ",
            f"**Contact:** {contact.get('email', '')} | {contact.get('phone', '')} | {contact.get('location', '')}  ",
            f"**Targeted Tags:** {', '.join(tags)}  \n",
            "## Technical Skills",
            f"- **Skills:** {', '.join(skills)}",
            "",
        ]

        if projects:
            lines.append("## Projects")
            for p in projects:
                title = p.get("title", "")
                tech = ", ".join(p.get("technologies", []))
                tech_header = f" ({tech})" if tech else ""
                lines.append(f"### {title}{tech_header}")
                for b in p.get("bullets", []):
                    lines.append(f"- {b}")
                lines.append("")

        if experiences:
            lines.append("## Experience")
            for e in experiences:
                role = e.get("role", "")
                company = e.get("company", "")
                lines.append(f"### {role} — {company}")
                for b in e.get("bullets", []):
                    lines.append(f"- {b}")
                lines.append("")

        if educations:
            lines.append("## Education")
            for edu in educations:
                inst = edu.get("institution", "")
                deg = edu.get("degree", "")
                br = f" in {edu.get('branch')}" if edu.get("branch") else ""
                yr = f" ({edu.get('start_year', '')} - {edu.get('end_year', '')})" if edu.get("end_year") else ""
                lines.append(f"- **{deg}{br}**, {inst}{yr}")
            lines.append("")

        if certifications:
            lines.append("## Certifications")
            for c in certifications:
                lines.append(f"- {c}")
            lines.append("")

        return "\n".join(lines).strip()

    def _build_latex(self, data: Dict[str, Any]) -> str:
        contact = data.get("contact", {})
        name = contact.get("name", "Candidate")
        email = contact.get("email", "")
        phone = contact.get("phone", "")
        skills = ", ".join(data.get("skills", []))
        projects = data.get("projects", [])
        experiences = data.get("experiences", [])
        educations = data.get("educations", [])

        latex = [
            r"\documentclass[letterpaper,10pt]{article}",
            r"\usepackage[empty]{fullpage}",
            r"\usepackage{titlesec}",
            r"\usepackage{enumitem}",
            r"\usepackage[hidelinks]{hyperref}",
            r"\titleformat{\section}{\large\bfseries\raggedright}{}{0em}{}[\titlerule]",
            r"\begin{document}",
            r"\begin{center}",
            f"\\textbf{{\\Huge {name}}} \\\\",
            f"{email} $|$ {phone}",
            r"\end{center}",
            r"\section{Technical Skills}",
            f"\\textbf{{Skills:}} {skills} \\\\",
        ]

        if projects:
            latex.append(r"\section{Projects}")
            for p in projects:
                title = p.get("title", "")
                latex.append(f"\\textbf{{{title}}} \\\\")
                latex.append(r"\begin{itemize}[noitemsep,topsep=0pt]")
                for b in p.get("bullets", []):
                    escaped_b = b.replace("&", r"\&").replace("%", r"\%").replace("$", r"\$")
                    latex.append(f"  \\item {escaped_b}")
                latex.append(r"\end{itemize}")

        if experiences:
            latex.append(r"\section{Experience}")
            for e in experiences:
                role = e.get("role", "")
                company = e.get("company", "")
                latex.append(f"\\textbf{{{role}}} -- {company} \\\\")
                latex.append(r"\begin{itemize}[noitemsep,topsep=0pt]")
                for b in e.get("bullets", []):
                    escaped_b = b.replace("&", r"\&").replace("%", r"\%").replace("$", r"\$")
                    latex.append(f"  \\item {escaped_b}")
                latex.append(r"\end{itemize}")

        if educations:
            latex.append(r"\section{Education}")
            for edu in educations:
                inst = edu.get("institution", "")
                deg = edu.get("degree", "")
                latex.append(f"\\textbf{{{inst}}} $|$ {deg} \\\\")

        latex.append(r"\end{document}")
        return "\n".join(latex)


resume_engine = ResumeTailorEngine()
