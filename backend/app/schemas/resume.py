from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ResumeDiffItem(BaseModel):
    section: str
    item_id: Optional[str] = None
    original: str
    tailored: str
    explanation: str
    keywords_added: List[str] = []


class ResumeGenerateRequest(BaseModel):
    job_id: str
    custom_position: Optional[str] = Field(default=None, max_length=255)
    custom_instructions: Optional[str] = Field(default=None, max_length=1000)


class ResumeUpdateRequest(BaseModel):
    position: Optional[str] = Field(default=None, max_length=255)
    tags: Optional[List[str]] = None
    applied_companies: Optional[List[str]] = None
    content: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(default=None, max_length=50)


class ResumeApplyRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)


class GeneratedResumeOut(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    position: str
    tags: List[str] = []
    applied_companies: List[str] = []
    content: Dict[str, Any] = {}
    markdown: str
    latex: str
    diffs: List[ResumeDiffItem] = []
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GeneratedResumeBrief(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    position: str
    tags: List[str] = []
    applied_companies: List[str] = []
    status: str
    diffs_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeAnalysisOut(BaseModel):
    interview_readiness_score: int = Field(..., ge=0, le=100)
    short_description: str
    technical_depth_score: int = Field(..., ge=0, le=100)
    impact_score: int = Field(..., ge=0, le=100)
    ats_score: int = Field(..., ge=0, le=100)
    strengths: List[str] = []
    improvements: List[str] = []
    interview_topics: List[str] = []
    extracted_markdown: Optional[str] = None
    candidate_name: Optional[str] = None
    analyzed_at: datetime

