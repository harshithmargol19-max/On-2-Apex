from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.job_analysis import router as job_analysis_router
from app.api.v1.endpoints.job_match import router as job_match_router
from app.api.v1.endpoints.jobs import router as jobs_router
from app.api.v1.endpoints.learning import router as learning_router
from app.api.v1.endpoints.llm import router as llm_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.resumes import router as resumes_router
from app.api.v1.endpoints.workspace import router as workspace_router
from app.api.v1.endpoints.google import router as google_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health & Readiness"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile_router, prefix="/profile", tags=["Student Profile"])
api_router.include_router(jobs_router, prefix="/jobs", tags=["Job Intelligence"])
api_router.include_router(job_analysis_router, prefix="/jobs", tags=["Job Description Intelligence"])
api_router.include_router(job_match_router, prefix="/jobs", tags=["Skill Gap Engine"])
api_router.include_router(learning_router, prefix="/learning", tags=["Personalized Learning Engine"])
api_router.include_router(resumes_router, prefix="/resumes", tags=["Job-Specific Resume Generator"])
api_router.include_router(workspace_router, prefix="/workspace", tags=["Placement Workspace & Applications"])
api_router.include_router(google_router, prefix="/google", tags=["Google Integration"])
api_router.include_router(documents_router, prefix="/documents", tags=["Document Intelligence"])
api_router.include_router(llm_router, prefix="/settings/llm", tags=["BYOK LLM Gateway"])
api_router.include_router(llm_router, prefix="/llm", tags=["BYOK LLM Gateway"])

