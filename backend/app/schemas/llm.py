from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

ProviderType = Literal["nvidia_nim", "groq", "ollama", "openrouter", "gemini"]


class LLMConfigUpdate(BaseModel):
    primary_provider: ProviderType = Field(default="nvidia_nim")
    primary_model: str = Field(default="meta/llama-3.1-8b-instruct", min_length=1, max_length=100)
    primary_api_key: Optional[str] = Field(default=None, max_length=500)
    primary_base_url: Optional[str] = Field(default=None, max_length=500)

    backup_provider: Optional[ProviderType] = None
    backup_model: Optional[str] = Field(default=None, max_length=100)
    backup_api_key: Optional[str] = Field(default=None, max_length=500)
    backup_base_url: Optional[str] = Field(default=None, max_length=500)


class LLMConfigOut(BaseModel):
    id: str
    user_id: str
    primary_provider: str
    primary_model: str
    primary_api_key_masked: Optional[str] = None
    primary_base_url: Optional[str] = None
    backup_provider: Optional[str] = None
    backup_model: Optional[str] = None
    backup_api_key_masked: Optional[str] = None
    backup_base_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LLMTestRequest(BaseModel):
    provider: ProviderType
    model: str = Field(..., min_length=1, max_length=100)
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class LLMTestResponse(BaseModel):
    success: bool
    provider: str
    model: str
    latency_ms: float
    response: Optional[str] = None
    error: Optional[str] = None
