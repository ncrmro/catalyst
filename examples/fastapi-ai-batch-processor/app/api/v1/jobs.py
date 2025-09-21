"""
API endpoints for batch job management.

This module provides REST API endpoints for creating, managing,
and monitoring AI batch processing jobs.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.crud.batch import BatchJobCRUD, BatchRequestCRUD, BatchResponseCRUD, BatchStatsCRUD
from app.db.session import get_db
from app.models.batch import JobStatus
from app.schemas.batch import (
    BatchJobCreate,
    BatchJobResponse,
    BatchJobUpdate,
    BatchJobWithDetails,
    BatchJobListResponse,
    BatchRequestResponse,
    BatchResponseResponse,
    CreateBatchRequestsRequest,
    BatchProcessingStats,
    ErrorResponse
)

logger = structlog.get_logger()
router = APIRouter()


@router.post(
    "/",
    response_model=BatchJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new batch job",
    description="Create a new AI batch processing job with the specified configuration."
)
async def create_batch_job(
    job_data: BatchJobCreate,
    db: AsyncSession = Depends(get_db)
) -> BatchJobResponse:
    """Create a new batch job."""
    try:
        job = await BatchJobCRUD.create(db, job_data)
        await db.commit()
        
        logger.info("Created batch job", job_id=job.id, name=job.name)
        return BatchJobResponse.model_validate(job)
        
    except Exception as e:
        logger.error("Failed to create batch job", error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create batch job"
        )


@router.get(
    "/",
    response_model=BatchJobListResponse,
    summary="List batch jobs",
    description="Get a paginated list of batch jobs with optional status filtering."
)
async def list_batch_jobs(
    skip: int = Query(0, ge=0, description="Number of jobs to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of jobs to return"),
    status: Optional[JobStatus] = Query(None, description="Filter by job status"),
    db: AsyncSession = Depends(get_db)
) -> BatchJobListResponse:
    """List batch jobs with pagination."""
    try:
        jobs = await BatchJobCRUD.get_multi(db, skip=skip, limit=limit, status=status)
        total = await BatchJobCRUD.count(db, status=status)
        
        pages = (total + limit - 1) // limit if total > 0 else 0
        
        return BatchJobListResponse(
            jobs=[BatchJobResponse.model_validate(job) for job in jobs],
            total=total,
            page=(skip // limit) + 1,
            size=len(jobs),
            pages=pages
        )
        
    except Exception as e:
        logger.error("Failed to list batch jobs", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list batch jobs"
        )


@router.get(
    "/{job_id}",
    response_model=BatchJobWithDetails,
    summary="Get batch job details",
    description="Get detailed information about a specific batch job including requests and responses."
)
async def get_batch_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
) -> BatchJobWithDetails:
    """Get batch job details."""
    try:
        job = await BatchJobCRUD.get_with_details(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch job not found"
            )
        
        return BatchJobWithDetails.model_validate(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get batch job", job_id=job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get batch job"
        )


@router.put(
    "/{job_id}",
    response_model=BatchJobResponse,
    summary="Update batch job",
    description="Update a batch job's metadata or status."
)
async def update_batch_job(
    job_id: str,
    job_data: BatchJobUpdate,
    db: AsyncSession = Depends(get_db)
) -> BatchJobResponse:
    """Update a batch job."""
    try:
        job = await BatchJobCRUD.update(db, job_id, job_data)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch job not found"
            )
        
        await db.commit()
        logger.info("Updated batch job", job_id=job_id)
        return BatchJobResponse.model_validate(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update batch job", job_id=job_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update batch job"
        )


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete batch job",
    description="Delete a batch job and all associated requests and responses."
)
async def delete_batch_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a batch job."""
    try:
        deleted = await BatchJobCRUD.delete(db, job_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch job not found"
            )
        
        await db.commit()
        logger.info("Deleted batch job", job_id=job_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete batch job", job_id=job_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete batch job"
        )


@router.post(
    "/{job_id}/requests",
    response_model=List[BatchRequestResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add requests to batch job",
    description="Add multiple AI requests to an existing batch job."
)
async def create_batch_requests(
    job_id: str,
    requests_data: CreateBatchRequestsRequest,
    db: AsyncSession = Depends(get_db)
) -> List[BatchRequestResponse]:
    """Add requests to a batch job."""
    try:
        # Check if job exists
        job = await BatchJobCRUD.get_by_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch job not found"
            )
        
        # Check if job is in a state that allows adding requests
        if job.status not in [JobStatus.PENDING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add requests to a job that is not pending"
            )
        
        # Create requests
        requests = await BatchRequestCRUD.create_multi(db, job_id, requests_data.requests)
        
        # Update job total_requests count
        job.total_requests = len(await BatchRequestCRUD.get_by_job_id(db, job_id))
        
        await db.commit()
        
        logger.info(
            "Added requests to batch job", 
            job_id=job_id, 
            request_count=len(requests)
        )
        
        return [BatchRequestResponse.model_validate(req) for req in requests]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create batch requests", job_id=job_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create batch requests"
        )


@router.get(
    "/{job_id}/requests",
    response_model=List[BatchRequestResponse],
    summary="Get job requests",
    description="Get all requests for a specific batch job."
)
async def get_batch_requests(
    job_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[BatchRequestResponse]:
    """Get all requests for a batch job."""
    try:
        # Check if job exists
        job = await BatchJobCRUD.get_by_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch job not found"
            )
        
        requests = await BatchRequestCRUD.get_by_job_id(db, job_id)
        return [BatchRequestResponse.model_validate(req) for req in requests]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get batch requests", job_id=job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get batch requests"
        )


@router.get(
    "/{job_id}/responses",
    response_model=List[BatchResponseResponse],
    summary="Get job responses",
    description="Get all responses for a specific batch job."
)
async def get_batch_responses(
    job_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[BatchResponseResponse]:
    """Get all responses for a batch job."""
    try:
        # Check if job exists
        job = await BatchJobCRUD.get_by_id(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch job not found"
            )
        
        responses = await BatchResponseCRUD.get_by_job_id(db, job_id)
        return [BatchResponseResponse.model_validate(resp) for resp in responses]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get batch responses", job_id=job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get batch responses"
        )


@router.get(
    "/stats/overview",
    response_model=BatchProcessingStats,
    summary="Get processing statistics",
    description="Get overall statistics about batch processing jobs and requests."
)
async def get_batch_stats(
    db: AsyncSession = Depends(get_db)
) -> BatchProcessingStats:
    """Get batch processing statistics."""
    try:
        stats = await BatchStatsCRUD.get_stats(db)
        return stats
        
    except Exception as e:
        logger.error("Failed to get batch stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get batch statistics"
        )