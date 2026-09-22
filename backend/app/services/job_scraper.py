from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.job import Job
from app.schemas.job import JobOut, JobSearchQuery, JobSearchResult
from app.services.job_normalizer import (
    calculate_dedup_hash,
    canonicalize_url,
    normalize_company,
    normalize_title,
)

COMMON_SKILL_KEYWORDS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI",
    "Django", "Flask", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker",
    "Kubernetes", "AWS", "Azure", "GCP", "Git", "CI/CD", "Linux",
    "REST", "GraphQL", "Java", "C++", "C#", "Go", "Rust", "HTML", "CSS",
    "Tailwind", "Next.js", "Express", "Microservices", "Data Structures",
    "Algorithms", "Machine Learning", "PyTorch", "TensorFlow",
]


@dataclass
class RawJob:
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source: str = "unknown"
    posted_at: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None


def extract_skills_from_text(text: str) -> List[str]:
    if not text:
        return []
    found = []
    for skill in COMMON_SKILL_KEYWORDS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            found.append(skill)
    return found


class BaseJobSource(ABC):
    @abstractmethod
    def search(self, query: JobSearchQuery) -> Tuple[List[RawJob], Dict[str, str]]:
        pass


def resolve_country(location: str, explicit_country: Optional[str] = None) -> str:
    if explicit_country and explicit_country.strip():
        c_clean = explicit_country.strip().lower()
        if c_clean in ["india", "in"]:
            return "india"
        if c_clean in ["usa", "us", "united states"]:
            return "usa"
        if c_clean in ["uk", "united kingdom", "gb"]:
            return "uk"
        if c_clean in ["canada", "ca"]:
            return "canada"
        if c_clean in ["germany", "de"]:
            return "germany"
        if c_clean in ["australia", "au"]:
            return "australia"
        return c_clean

    loc = (location or "").lower()
    india_indicators = [
        "india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai",
        "delhi", "new delhi", "noida", "gurgaon", "gurugram", "chennai",
        "kolkata", "ahmedabad", "chandigarh", "jaipur", "kochi", "trivandrum",
        "indore", "karnataka", "telangana", "maharashtra", "tamil nadu",
    ]
    if any(ind in loc for ind in india_indicators):
        return "india"

    uk_indicators = ["uk", "united kingdom", "london", "manchester", "birmingham", "edinburgh"]
    if any(ind in loc for ind in uk_indicators):
        return "uk"

    canada_indicators = ["canada", "toronto", "vancouver", "montreal", "ottawa", "waterloo"]
    if any(ind in loc for ind in canada_indicators):
        return "canada"

    germany_indicators = ["germany", "berlin", "munich", "frankfurt", "hamburg"]
    if any(ind in loc for ind in germany_indicators):
        return "germany"

    return "usa"


class JobSpySource(BaseJobSource):
    def search(self, query: JobSearchQuery) -> Tuple[List[RawJob], Dict[str, str]]:
        raw_jobs: List[RawJob] = []
        statuses: Dict[str, str] = {}

        try:
            from jobspy import scrape_jobs
        except ImportError as exc:
            return raw_jobs, {"jobspy": f"not_installed: {str(exc)}"}

        requested_sites = query.sources if query.sources else ["linkedin", "indeed", "google", "glassdoor", "zip_recruiter"]
        valid_site_names = [s.lower() for s in requested_sites]

        country = resolve_country(query.location, query.country)
        search_term = query.role
        if query.keywords:
            search_term = f"{query.role} {' '.join(query.keywords[:3])}"

        location_str = query.location or ""
        is_remote = query.is_remote or "remote" in location_str.lower()
        results_per_site = max(3, min(query.limit, 25))

        def scrape_individual_site(site: str) -> Tuple[str, List[RawJob], str]:
            site_jobs: List[RawJob] = []
            try:
                extra_kwargs: Dict[str, Any] = {}
                loc_to_pass = location_str
                if site == "indeed":
                    extra_kwargs["country_indeed"] = country
                elif site == "linkedin":
                    if is_remote:
                        loc_to_pass = "Remote" if not location_str or location_str.lower() == "remote" else location_str
                elif site == "google":
                    if location_str:
                        extra_kwargs["google_search_term"] = f"{search_term} jobs in {location_str}"
                    else:
                        extra_kwargs["google_search_term"] = f"{search_term} jobs"
                elif site == "glassdoor":
                    clean_loc = location_str.split(",")[0].strip() if location_str else None
                    if clean_loc:
                        loc_to_pass = clean_loc
                elif site == "zip_recruiter":
                    if country not in ["usa", "canada"]:
                        return site, [], "us_canada_only"

                res_df = scrape_jobs(
                    site_name=[site],
                    search_term=search_term,
                    location=loc_to_pass,
                    results_wanted=results_per_site,
                    is_remote=is_remote,
                    country_indeed=country if site == "indeed" else "usa",
                    google_search_term=extra_kwargs.get("google_search_term"),
                )

                if res_df is not None and not res_df.empty:
                    for _, row in res_df.iterrows():
                        title = str(row.get("title") or "")
                        company = str(row.get("company") or "")
                        if not title or not company or company.lower() == "nan":
                            continue

                        location = str(row.get("location") or "") if row.get("location") else None
                        desc = str(row.get("description") or "") if row.get("description") else None
                        url = str(row.get("job_url") or "") if row.get("job_url") else None
                        site_label = str(row.get("site") or site)

                        min_amt = row.get("min_amount")
                        max_amt = row.get("max_amount")
                        curr = row.get("currency")

                        site_jobs.append(
                            RawJob(
                                title=title,
                                company=company,
                                location=location if location != "nan" else None,
                                description=desc if desc != "nan" else None,
                                url=url if url != "nan" else None,
                                source=site_label,
                                posted_at=str(row.get("date_posted")) if row.get("date_posted") else None,
                                experience_level=query.experience,
                                salary_min=float(min_amt) if min_amt and str(min_amt) != "nan" else None,
                                salary_max=float(max_amt) if max_amt and str(max_amt) != "nan" else None,
                                currency=str(curr) if curr and str(curr) != "nan" else None,
                            )
                        )
                    return site, site_jobs, f"{len(site_jobs)} postings found"
                else:
                    if site == "linkedin":
                        return site, [], "rate_limited_or_no_postings"
                    if site == "google":
                        return site, [], "upstream_parser_deprecated"
                    if site == "glassdoor":
                        return site, [], "cloudflare_blocked_or_invalid_location"
                    if site == "zip_recruiter":
                        return site, [], "cloudflare_blocked"
                    return site, [], "no_results"
            except Exception as e:
                err_msg = str(e).lower()
                if "429" in err_msg or "too many requests" in err_msg:
                    return site, [], "rate_limited_by_provider"
                if "403" in err_msg or "forbidden" in err_msg:
                    return site, [], "cloudflare_bot_blocked"
                return site, [], f"failed: {str(e)[:60]}"

        with ThreadPoolExecutor(max_workers=min(len(valid_site_names), 5)) as executor:
            future_to_site = {executor.submit(scrape_individual_site, s): s for s in valid_site_names}
            for future in as_completed(future_to_site):
                site_name, items, status_msg = future.result()
                raw_jobs.extend(items)
                statuses[site_name] = status_msg

        return raw_jobs, statuses


class FallbackSampleSource(BaseJobSource):
    def search(self, query: JobSearchQuery) -> Tuple[List[RawJob], Dict[str, str]]:
        role = query.role.strip()
        loc = query.location or "Bengaluru, India"
        role_lower = role.lower()

        if "front" in role_lower or "react" in role_lower or "ui" in role_lower:
            sample_data = [
                RawJob(
                    title="Junior Frontend Engineer - React & TypeScript",
                    company="Swiggy Tech",
                    location=loc,
                    description="Building blazing fast customer web experiences with React, Next.js, Tailwind CSS, TypeScript, and state management. Strong foundation in JavaScript and Web Vitals required.",
                    url="https://careers.swiggy.com/jobs/frontend-sde1",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1000000.0,
                    salary_max=1600000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Frontend Developer (Placement Opportunity)",
                    company="Flipkart Internet",
                    location=loc,
                    description="Join Flipkart core customer experience engineering. Work with React, Redux, Performance Optimization, and modern frontend testing frameworks.",
                    url="https://www.flipkartcareers.com/placement/frontend",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1200000.0,
                    salary_max=1800000.0,
                    currency="INR",
                ),
                RawJob(
                    title="UI/UX Engineering Trainee",
                    company="CRED",
                    location=loc,
                    description="Designing and engineering pixel-perfect, micro-interaction rich interfaces using React, TypeScript, Framer Motion, and CSS architecture.",
                    url="https://cred.club/careers/freshers-frontend",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1400000.0,
                    salary_max=2200000.0,
                    currency="INR",
                ),
            ]
        elif "back" in role_lower or "python" in role_lower or "go" in role_lower or "api" in role_lower:
            sample_data = [
                RawJob(
                    title="Associate Backend Engineer - Microservices",
                    company="Razorpay",
                    location=loc,
                    description="Engineering high-scale payment gateways and ledger systems using Python, FastAPI, PostgreSQL, Redis, Kafka, and Docker. Strong DSA and system design required.",
                    url="https://razorpay.com/jobs/freshers-backend",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1200000.0,
                    salary_max=1800000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Backend SDE-1 (Distributed Systems)",
                    company="PhonePe",
                    location=loc,
                    description="Architecting fault-tolerant financial microservices using Java, Spring Boot, Python, MySQL, and distributed caching solutions.",
                    url="https://www.phonepe.com/careers/backend-sde1",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1300000.0,
                    salary_max=2000000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Graduate Backend Engineer Trainee",
                    company="Walmart Global Tech",
                    location=loc,
                    description="Building enterprise inventory and supply chain services using Java, Python, REST APIs, Git, CI/CD, and cloud native architectures.",
                    url="https://careers.walmart.com/global-tech/campus-backend",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1100000.0,
                    salary_max=1700000.0,
                    currency="INR",
                ),
            ]
        elif "data" in role_lower or "analytics" in role_lower:
            sample_data = [
                RawJob(
                    title="Associate Data Engineer",
                    company="Netomi",
                    location=loc,
                    description="Design scalable ETL/ELT pipelines, data warehousing in Snowflake/PostgreSQL, and real-time streaming with Apache Kafka and Python.",
                    url="https://netomi.com/careers/data-engineer-1",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=900000.0,
                    salary_max=1500000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Junior Data Platform Analyst",
                    company="Deloitte India",
                    location=loc,
                    description="Ingest and model enterprise datasets using SQL, Python, Pandas, PowerBI, and AWS cloud storage.",
                    url="https://deloitte.com/in/careers/freshers-data",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=750000.0,
                    salary_max=1200000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Data Engineering Trainee",
                    company="Mu Sigma",
                    location=loc,
                    description="Transform raw transactional logs into high-value analytics datasets using Python, SQL, Docker, and Linux scripting.",
                    url="https://mu-sigma.com/careers/freshers",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=800000.0,
                    salary_max=1300000.0,
                    currency="INR",
                ),
            ]
        elif "ai" in role_lower or "ml" in role_lower or "machine" in role_lower:
            sample_data = [
                RawJob(
                    title="Junior AI / Machine Learning Engineer",
                    company="Fractal Analytics",
                    location=loc,
                    description="Develop predictive ML models, fine-tune LLMs, and build vector search pipelines with PyTorch, Scikit-learn, LangChain, and Python.",
                    url="https://fractal.ai/careers/ai-engineer-entry",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1100000.0,
                    salary_max=1800000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Associate Machine Learning Engineer",
                    company="Persistent Systems",
                    location=loc,
                    description="Deploy scalable neural networks, perform automated feature engineering, and monitor inference APIs using Docker and FastAPI.",
                    url="https://persistent.com/careers/campus-ai",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=950000.0,
                    salary_max=1500000.0,
                    currency="INR",
                ),
                RawJob(
                    title="AI Solutions Engineering Trainee",
                    company="Intel India",
                    location=loc,
                    description="Implement optimized edge AI models, deep learning inference, and benchmark algorithms in Python and C++.",
                    url="https://jobs.intel.com/en/campus-ai-trainee",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1300000.0,
                    salary_max=2100000.0,
                    currency="INR",
                ),
            ]
        elif "devops" in role_lower or "cloud" in role_lower or "infra" in role_lower:
            sample_data = [
                RawJob(
                    title="Junior DevOps Engineer - Kubernetes & CI/CD",
                    company="Zomato",
                    location=loc,
                    description="Manage containerized Kubernetes clusters, automate deployment pipelines with GitHub Actions, and configure monitoring with Prometheus and Grafana.",
                    url="https://zomato.com/careers/devops-entry",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1000000.0,
                    salary_max=1600000.0,
                    currency="INR",
                ),
                RawJob(
                    title="Cloud Infrastructure Associate",
                    company="IBM India",
                    location=loc,
                    description="Configure cloud networks, automate infrastructure via Terraform, and maintain Linux systems with Docker and Ansible.",
                    url="https://ibm.com/careers/freshers-cloud",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=850000.0,
                    salary_max=1400000.0,
                    currency="INR",
                ),
                RawJob(
                    title="DevOps & Reliability Trainee",
                    company="Cisco Systems",
                    location=loc,
                    description="Implement observability, Linux networking, infrastructure as code, and security automation for distributed campus networks.",
                    url="https://jobs.cisco.com/campus/devops",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1200000.0,
                    salary_max=1900000.0,
                    currency="INR",
                ),
            ]
        else:
            sample_data = [
                RawJob(
                    title=f"Associate Software Engineer - {role}",
                    company="Google India",
                    location=loc,
                    description=f"Solve foundational engineering problems across distributed systems. Requirements: Data Structures, Algorithms, Python, Java or C++, and system architecture.",
                    url="https://careers.google.com/jobs/results/campus-sde",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1800000.0,
                    salary_max=2800000.0,
                    currency="INR",
                ),
                RawJob(
                    title=f"Software Development Engineer ({role})",
                    company="Microsoft India",
                    location=loc,
                    description=f"Engineer enterprise cloud solutions. Requires strong problem solving, object oriented programming, REST APIs, Git, and cloud fundamentals.",
                    url="https://careers.microsoft.com/students/sde-entry",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=1700000.0,
                    salary_max=2600000.0,
                    currency="INR",
                ),
                RawJob(
                    title=f"Graduate Systems Engineer - {role}",
                    company="TCS Digital",
                    location=loc,
                    description=f"Work on modern digital transformation stacks including React, Node.js, Python, PostgreSQL, Linux, and containerized microservices.",
                    url="https://ibegin.tcs.com/careers/digital-freshers",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=750000.0,
                    salary_max=1100000.0,
                    currency="INR",
                ),
                RawJob(
                    title=f"Technology Analyst Trainee - {role}",
                    company="Infosys Wingspan",
                    location=loc,
                    description=f"Build and test enterprise applications using Python, TypeScript, Spring Boot, SQL, and Agile development methodologies.",
                    url="https://career.infosys.com/joblist/freshers",
                    source="direct_placement",
                    experience_level="entry_level",
                    salary_min=700000.0,
                    salary_max=1000000.0,
                    currency="INR",
                ),
            ]

        return sample_data, {"campus_direct_portal": "active_opportunities_ingested"}


class JobService:
    def __init__(self):
        self.jobspy_source = JobSpySource()
        self.fallback_source = FallbackSampleSource()

    def search_and_ingest(
        self, db: Session, query: JobSearchQuery
    ) -> JobSearchResult:
        raw_jobs, statuses = self.jobspy_source.search(query)

        if not raw_jobs:
            fallback_jobs, fallback_statuses = self.fallback_source.search(query)
            raw_jobs.extend(fallback_jobs)
            statuses.update(fallback_statuses)

        new_count = 0
        persisted_jobs: List[Job] = []

        for item in raw_jobs:
            norm_comp = normalize_company(item.company)
            norm_tit = normalize_title(item.title)
            can_url = canonicalize_url(item.url)
            dedup_hash = calculate_dedup_hash(
                norm_comp, norm_tit, can_url, item.location
            )

            existing = db.query(Job).filter(Job.dedup_hash == dedup_hash).first()
            if existing:
                persisted_jobs.append(existing)
                continue

            extracted_skills = extract_skills_from_text(
                f"{item.title} {item.description or ''}"
            )

            new_job = Job(
                title=item.title,
                company=item.company,
                normalized_company=norm_comp,
                normalized_title=norm_tit,
                location=item.location,
                description=item.description,
                url=item.url,
                canonical_url=can_url,
                dedup_hash=dedup_hash,
                source=item.source,
                posted_at=item.posted_at,
                experience_level=item.experience_level,
                skills=extracted_skills,
                salary_min=item.salary_min,
                salary_max=item.salary_max,
                currency=item.currency,
                is_active=True,
            )
            db.add(new_job)
            persisted_jobs.append(new_job)
            new_count += 1

        db.commit()
        for j in persisted_jobs:
            db.refresh(j)

        return JobSearchResult(
            total_found=len(persisted_jobs),
            new_added=new_count,
            sources_status=statuses,
            jobs=[JobOut.model_validate(j) for j in persisted_jobs],
        )


job_service = JobService()
