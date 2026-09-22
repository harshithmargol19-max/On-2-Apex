
import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.profile import (
        StudentProfile,
        Skill,
        Education,
        Project,
        Experience,
        Certification,
        Achievement,
    )


class User(Base, TimestampMixin):
    """User account entity representing authenticated identity."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    profile: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def student_profile(self):
        return self.profile

    # Sub-entities (1-to-many)
    skills: Mapped[List["Skill"]] = relationship(
        "Skill", back_populates="user", cascade="all, delete-orphan"
    )
    educations: Mapped[List["Education"]] = relationship(
        "Education", back_populates="user", cascade="all, delete-orphan"
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="user", cascade="all, delete-orphan"
    )
    experiences: Mapped[List["Experience"]] = relationship(
        "Experience", back_populates="user", cascade="all, delete-orphan"
    )
    certifications: Mapped[List["Certification"]] = relationship(
        "Certification", back_populates="user", cascade="all, delete-orphan"
    )
    achievements: Mapped[List["Achievement"]] = relationship(
        "Achievement", back_populates="user", cascade="all, delete-orphan"
    )
