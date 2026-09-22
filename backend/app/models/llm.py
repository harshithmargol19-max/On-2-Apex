import uuid
from typing import Optional
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.base import TimestampMixin


class LLMProviderConfig(Base, TimestampMixin):
    __tablename__ = "llm_provider_configs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    primary_provider: Mapped[str] = mapped_column(
        String(50), default="nvidia_nim", nullable=False
    )
    primary_model: Mapped[str] = mapped_column(
        String(100), default="meta/llama-3.1-8b-instruct", nullable=False
    )
    primary_api_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    backup_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    backup_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    backup_api_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    backup_base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship("User")
