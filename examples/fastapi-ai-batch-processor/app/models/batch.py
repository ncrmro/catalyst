"""
Database models for AI batch processing.

This module defines the SQLAlchemy models for managing AI batch jobs,
requests, and responses.
"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    JSON, String, Integer, Text, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class JobStatus(PyEnum):
    """Enumeration for batch job statuses."""
    PENDING = "pending"
    PROCESSING = "processing" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RequestStatus(PyEnum):
    """Enumeration for individual request statuses."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class BatchJob(Base):
    """Model for AI batch processing jobs."""
    
    __tablename__ = "batch_jobs"
    
    # Job metadata
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus),
        default=JobStatus.PENDING,
        nullable=False,
        index=True
    )
    
    # OpenAI batch metadata
    openai_batch_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    openai_input_file_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    openai_output_file_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    openai_error_file_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Processing metadata
    total_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Timing
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Error information
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Configuration
    model: Mapped[str] = mapped_column(String(100), default="gpt-3.5-turbo", nullable=False)
    max_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temperature: Mapped[Optional[float]] = mapped_column(nullable=True)
    
    # Relationships
    requests: Mapped[List["BatchRequest"]] = relationship(
        "BatchRequest", 
        back_populates="job",
        cascade="all, delete-orphan"
    )
    responses: Mapped[List["BatchResponse"]] = relationship(
        "BatchResponse", 
        back_populates="job",
        cascade="all, delete-orphan"
    )


class BatchRequest(Base):
    """Model for individual AI requests within a batch."""
    
    __tablename__ = "batch_requests"
    
    # Job relationship
    job_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("batch_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Request metadata
    custom_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus),
        default=RequestStatus.PENDING,
        nullable=False,
        index=True
    )
    
    # Request content
    method: Mapped[str] = mapped_column(String(10), default="POST", nullable=False)
    url: Mapped[str] = mapped_column(String(255), default="/v1/chat/completions", nullable=False)
    body: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Processing metadata
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    job: Mapped["BatchJob"] = relationship("BatchJob", back_populates="requests")
    response: Mapped[Optional["BatchResponse"]] = relationship(
        "BatchResponse", 
        back_populates="request",
        uselist=False
    )


class BatchResponse(Base):
    """Model for AI responses from batch processing."""
    
    __tablename__ = "batch_responses"
    
    # Job and request relationships
    job_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("batch_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    request_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("batch_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Response metadata
    custom_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    
    # Response content
    response_body: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # OpenAI metadata
    openai_request_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Usage information
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Relationships
    job: Mapped["BatchJob"] = relationship("BatchJob", back_populates="responses")
    request: Mapped["BatchRequest"] = relationship("BatchRequest", back_populates="response")