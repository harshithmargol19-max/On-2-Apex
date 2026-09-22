from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class JobSearchQuery(BaseModel):
    role: str = Field(..., min_length=1, max_length=255)
    location: str = Field(default="", max_length=255)
    keywords: List[str] = Field(default_factory=list)
    experience: Optional[str] = Field(default=None, max_length=50)
    limit: int = Field(default=15, ge=1, le=50)
    sources: Optional[List[str]] = Field(default=None)
    country: Optional[str] = Field(default=None, max_length=50)
    is_remote: bool = Field(default=False)


class JobOut(BaseModel):
    id: str
    title: str
    company: str
    normalized_company: str
    normalized_title: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source: str
    posted_at: Optional[str] = None
    experience_level: Optional[str] = None
    skills: List[str] = []
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    is_saved: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobSearchResult(BaseModel):
    total_found: int
    new_added: int
    sources_status: Dict[str, Any]
    jobs: List[JobOut]


class JobListOut(BaseModel):
    total: int
    items: List[JobOut]
