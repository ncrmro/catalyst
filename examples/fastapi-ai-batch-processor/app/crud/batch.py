"""
CRUD operations for batch processing models.

This module provides Create, Read, Update, Delete operations
for batch jobs, requests, and responses.
"""

from typing import List, Optional, Sequence
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.batch import BatchJob, BatchRequest, BatchResponse, JobStatus, RequestStatus
from app.schemas.batch import (
    BatchJobCreate, BatchJobUpdate, BatchRequestCreate,
    BatchProcessingStats
)


class BatchJobCRUD:
    """CRUD operations for BatchJob model."""
    
    @staticmethod
    async def create(db: AsyncSession, job_data: BatchJobCreate) -> BatchJob:
        """Create a new batch job."""
        job = BatchJob(
            name=job_data.name,
            description=job_data.description,
            model=job_data.model,
            max_tokens=job_data.max_tokens,
            temperature=job_data.temperature
        )
        db.add(job)
        await db.flush()
        await db.refresh(job)
        return job
    
    @staticmethod
    async def get_by_id(db: AsyncSession, job_id: str) -> Optional[BatchJob]:
        """Get a batch job by ID."""
        query = select(BatchJob).where(BatchJob.id == job_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_with_details(db: AsyncSession, job_id: str) -> Optional[BatchJob]:
        """Get a batch job with all related requests and responses."""
        query = (
            select(BatchJob)
            .options(
                selectinload(BatchJob.requests),
                selectinload(BatchJob.responses)
            )
            .where(BatchJob.id == job_id)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_multi(
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[JobStatus] = None
    ) -> Sequence[BatchJob]:
        """Get multiple batch jobs with optional filtering."""
        query = select(BatchJob).offset(skip).limit(limit).order_by(BatchJob.created_at.desc())
        
        if status:
            query = query.where(BatchJob.status == status)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def count(db: AsyncSession, status: Optional[JobStatus] = None) -> int:
        """Count batch jobs with optional filtering."""
        query = select(func.count(BatchJob.id))
        
        if status:
            query = query.where(BatchJob.status == status)
        
        result = await db.execute(query)
        return result.scalar() or 0
    
    @staticmethod
    async def update(db: AsyncSession, job_id: str, job_data: BatchJobUpdate) -> Optional[BatchJob]:
        """Update a batch job."""
        job = await BatchJobCRUD.get_by_id(db, job_id)
        if not job:
            return None
        
        update_data = job_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(job, field, value)
        
        await db.flush()
        await db.refresh(job)
        return job
    
    @staticmethod
    async def delete(db: AsyncSession, job_id: str) -> bool:
        """Delete a batch job."""
        job = await BatchJobCRUD.get_by_id(db, job_id)
        if not job:
            return False
        
        await db.delete(job)
        return True
    
    @staticmethod
    async def get_by_openai_batch_id(db: AsyncSession, openai_batch_id: str) -> Optional[BatchJob]:
        """Get a batch job by OpenAI batch ID."""
        query = select(BatchJob).where(BatchJob.openai_batch_id == openai_batch_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()


class BatchRequestCRUD:
    """CRUD operations for BatchRequest model."""
    
    @staticmethod
    async def create(db: AsyncSession, job_id: str, request_data: BatchRequestCreate) -> BatchRequest:
        """Create a new batch request."""
        request = BatchRequest(
            job_id=job_id,
            custom_id=request_data.custom_id,
            method=request_data.method,
            url=request_data.url,
            body=request_data.body
        )
        db.add(request)
        await db.flush()
        await db.refresh(request)
        return request
    
    @staticmethod
    async def create_multi(
        db: AsyncSession, 
        job_id: str, 
        requests_data: List[BatchRequestCreate]
    ) -> List[BatchRequest]:
        """Create multiple batch requests."""
        requests = []
        for request_data in requests_data:
            request = BatchRequest(
                job_id=job_id,
                custom_id=request_data.custom_id,
                method=request_data.method,
                url=request_data.url,
                body=request_data.body
            )
            requests.append(request)
            db.add(request)
        
        await db.flush()
        for request in requests:
            await db.refresh(request)
        
        return requests
    
    @staticmethod
    async def get_by_job_id(db: AsyncSession, job_id: str) -> Sequence[BatchRequest]:
        """Get all requests for a job."""
        query = select(BatchRequest).where(BatchRequest.job_id == job_id)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_by_custom_id(db: AsyncSession, custom_id: str) -> Optional[BatchRequest]:
        """Get a request by custom ID."""
        query = select(BatchRequest).where(BatchRequest.custom_id == custom_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_status(
        db: AsyncSession, 
        request_id: str, 
        status: RequestStatus,
        error_message: Optional[str] = None
    ) -> Optional[BatchRequest]:
        """Update request status."""
        request = await BatchRequestCRUD.get_by_id(db, request_id)
        if not request:
            return None
        
        request.status = status
        if error_message:
            request.error_message = error_message
        
        await db.flush()
        await db.refresh(request)
        return request
    
    @staticmethod
    async def get_by_id(db: AsyncSession, request_id: str) -> Optional[BatchRequest]:
        """Get a request by ID."""
        query = select(BatchRequest).where(BatchRequest.id == request_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()


class BatchResponseCRUD:
    """CRUD operations for BatchResponse model."""
    
    @staticmethod
    async def create(
        db: AsyncSession,
        job_id: str,
        request_id: str,
        custom_id: str,
        response_body: Optional[dict] = None,
        error: Optional[dict] = None,
        openai_request_id: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None
    ) -> BatchResponse:
        """Create a new batch response."""
        response = BatchResponse(
            job_id=job_id,
            request_id=request_id,
            custom_id=custom_id,
            response_body=response_body,
            error=error,
            openai_request_id=openai_request_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens
        )
        db.add(response)
        await db.flush()
        await db.refresh(response)
        return response
    
    @staticmethod
    async def get_by_job_id(db: AsyncSession, job_id: str) -> Sequence[BatchResponse]:
        """Get all responses for a job."""
        query = select(BatchResponse).where(BatchResponse.job_id == job_id)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_by_request_id(db: AsyncSession, request_id: str) -> Optional[BatchResponse]:
        """Get response by request ID."""
        query = select(BatchResponse).where(BatchResponse.request_id == request_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()


class BatchStatsCRUD:
    """CRUD operations for batch processing statistics."""
    
    @staticmethod
    async def get_stats(db: AsyncSession) -> BatchProcessingStats:
        """Get batch processing statistics."""
        # Count jobs by status
        jobs_query = select(
            func.count().label('total'),
            func.sum(func.case((BatchJob.status == JobStatus.PENDING, 1), else_=0)).label('pending'),
            func.sum(func.case((BatchJob.status == JobStatus.PROCESSING, 1), else_=0)).label('processing'),
            func.sum(func.case((BatchJob.status == JobStatus.COMPLETED, 1), else_=0)).label('completed'),
            func.sum(func.case((BatchJob.status == JobStatus.FAILED, 1), else_=0)).label('failed'),
        ).select_from(BatchJob)
        
        jobs_result = await db.execute(jobs_query)
        jobs_stats = jobs_result.first()
        
        # Count requests and responses
        requests_count = await db.execute(select(func.count(BatchRequest.id)))
        responses_count = await db.execute(select(func.count(BatchResponse.id)))
        tokens_sum = await db.execute(
            select(func.coalesce(func.sum(BatchResponse.total_tokens), 0))
        )
        
        return BatchProcessingStats(
            total_jobs=jobs_stats.total or 0,
            pending_jobs=jobs_stats.pending or 0,
            processing_jobs=jobs_stats.processing or 0,
            completed_jobs=jobs_stats.completed or 0,
            failed_jobs=jobs_stats.failed or 0,
            total_requests=requests_count.scalar() or 0,
            total_responses=responses_count.scalar() or 0,
            total_tokens_used=tokens_sum.scalar() or 0
        )