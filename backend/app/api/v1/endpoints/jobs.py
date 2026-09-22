from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.errors import AppException
from app.db.session import get_db
from app.models.job import Job, SavedJob
from app.models.user import User
from app.schemas.job import JobListOut, JobOut, JobSearchQuery, JobSearchResult
from app.services.job_scraper import job_service

router = APIRouter()


@router.post("/search", response_model=JobSearchResult)
def search_jobs(
    query: JobSearchQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = job_service.search_and_ingest(db, query)
    saved_ids = {
        s.job_id for s in db.query(SavedJob.job_id).filter(SavedJob.user_id == current_user.id).all()
    }
    for job_out in result.jobs:
        job_out.is_saved = job_out.id in saved_ids
    return result


@router.get("", response_model=JobListOut)
def list_jobs(
    role: Optional[str] = None,
    location: Optional[str] = None,
    company: Optional[str] = None,
    search: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.is_active == True)

    if role:
        query = query.filter(Job.normalized_title.ilike(f"%{role.strip()}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location.strip()}%"))
    if company:
        query = query.filter(Job.normalized_company.ilike(f"%{company.strip()}%"))
    if source and source.strip().lower() != "all":
        query = query.filter(Job.source.ilike(f"%{source.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Job.title.ilike(term),
                Job.company.ilike(term),
                Job.description.ilike(term),
            )
        )

    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    saved_ids = {
        s.job_id for s in db.query(SavedJob.job_id).filter(SavedJob.user_id == current_user.id).all()
    }

    items = []
    for job in jobs:
        out = JobOut.model_validate(job)
        out.is_saved = job.id in saved_ids
        items.append(out)

    return JobListOut(total=total, items=items)


@router.get("/saved", response_model=List[JobOut])
def get_saved_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved_records = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.created_at.desc())
        .all()
    )
    items = []
    for record in saved_records:
        out = JobOut.model_validate(record.job)
        out.is_saved = True
        items.append(out)
    return items


@router.get("/{job_id}", response_model=JobOut)
def get_job_by_id(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise AppException(
            message="Job not found.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    is_saved = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
        is not None
    )
    out = JobOut.model_validate(job)
    out.is_saved = is_saved
    return out


@router.post("/{job_id}/save", status_code=status.HTTP_200_OK)
def save_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise AppException(
            message="Job not found.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    existing = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    if not existing:
        saved = SavedJob(user_id=current_user.id, job_id=job_id)
        db.add(saved)
        db.commit()

    return {"status": "ok", "message": "Job saved successfully"}


@router.delete("/{job_id}/save", status_code=status.HTTP_200_OK)
def unsave_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()

    return {"status": "ok", "message": "Job removed from saved list"}
