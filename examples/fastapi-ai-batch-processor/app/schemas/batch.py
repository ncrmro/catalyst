"""
Pydantic schemas for API request/response validation.

This module defines the data structures used for API input validation
and response serialization.
"""

from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

from app.models.batch import JobStatus, RequestStatus


# Base schemas
class TimestampMixin(BaseModel):
    """Mixin for models with timestamps."""
    created_at: datetime
    updated_at: datetime


class BatchRequestCreate(BaseModel):
    """Schema for creating a batch request."""
    custom_id: str = Field(..., description="Unique identifier for the request")
    method: str = Field(default="POST", description="HTTP method")
    url: str = Field(default="/v1/chat/completions", description="API endpoint")
    body: Dict[str, Any] = Field(..., description="Request body")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "custom_id": "req_1",
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-3.5-turbo",
                    "messages": [
                        {"role": "user", "content": "What is the capital of France?"}
                    ],
                    "max_tokens": 100
                }
            }
        }
    )


class BatchRequestResponse(TimestampMixin):
    """Schema for batch request responses."""
    id: str
    job_id: str
    custom_id: str
    status: RequestStatus
    method: str
    url: str
    body: Dict[str, Any]
    retry_count: int
    error_message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class BatchResponseResponse(TimestampMixin):
    """Schema for batch response data."""
    id: str
    job_id: str
    request_id: str
    custom_id: str
    response_body: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    openai_request_id: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class BatchJobCreate(BaseModel):
    """Schema for creating a batch job."""
    name: str = Field(..., min_length=1, max_length=255, description="Job name")
    description: Optional[str] = Field(None, description="Job description")
    model: str = Field(default="gpt-3.5-turbo", description="OpenAI model to use")
    max_tokens: Optional[int] = Field(None, ge=1, le=4096, description="Maximum tokens per response")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Temperature for generation")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Customer Support Analysis",
                "description": "Analyze customer support tickets for sentiment and categorization",
                "model": "gpt-3.5-turbo",
                "max_tokens": 150,
                "temperature": 0.7
            }
        }
    )


class BatchJobResponse(TimestampMixin):
    """Schema for batch job responses."""
    id: str
    name: str
    description: Optional[str] = None
    status: JobStatus
    openai_batch_id: Optional[str] = None
    openai_input_file_id: Optional[str] = None
    openai_output_file_id: Optional[str] = None
    openai_error_file_id: Optional[str] = None
    total_requests: int
    completed_requests: int
    failed_requests: int
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    model: str
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)


class BatchJobWithDetails(BatchJobResponse):
    """Schema for batch job with related requests and responses."""
    requests: List[BatchRequestResponse] = []
    responses: List[BatchResponseResponse] = []


class BatchJobUpdate(BaseModel):
    """Schema for updating a batch job."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[JobStatus] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Updated Customer Support Analysis",
                "description": "Updated description for the analysis job",
                "status": "cancelled"
            }
        }
    )


class BatchJobListResponse(BaseModel):
    """Schema for paginated batch job list."""
    jobs: List[BatchJobResponse]
    total: int
    page: int
    size: int
    pages: int


class CreateBatchRequestsRequest(BaseModel):
    """Schema for adding multiple requests to a batch job."""
    requests: List[BatchRequestCreate] = Field(..., min_items=1, max_items=100)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "requests": [
                    {
                        "custom_id": "req_1",
                        "body": {
                            "model": "gpt-3.5-turbo",
                            "messages": [{"role": "user", "content": "Analyze this text for sentiment"}],
                            "max_tokens": 100
                        }
                    },
                    {
                        "custom_id": "req_2", 
                        "body": {
                            "model": "gpt-3.5-turbo",
                            "messages": [{"role": "user", "content": "Summarize this document"}],
                            "max_tokens": 150
                        }
                    }
                ]
            }
        }
    )


class BatchProcessingStats(BaseModel):
    """Schema for batch processing statistics."""
    total_jobs: int
    pending_jobs: int
    processing_jobs: int
    completed_jobs: int
    failed_jobs: int
    total_requests: int
    total_responses: int
    total_tokens_used: int


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)