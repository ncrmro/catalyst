"""
OpenAI Batch Processing Service

This module handles interaction with OpenAI's Batch API for
processing AI requests in batches with cost optimization.
"""

import asyncio
import json
import tempfile
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path

import structlog
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud.batch import BatchJobCRUD, BatchRequestCRUD, BatchResponseCRUD
from app.models.batch import BatchJob, BatchRequest, JobStatus, RequestStatus

logger = structlog.get_logger()


class OpenAIBatchService:
    """Service for managing OpenAI batch processing operations."""
    
    def __init__(self):
        """Initialize the OpenAI client."""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def submit_batch_job(self, db: AsyncSession, job_id: str) -> bool:
        """Submit a batch job to OpenAI for processing."""
        try:
            # Get the job and its requests
            job = await BatchJobCRUD.get_by_id(db, job_id)
            if not job:
                logger.error("Job not found", job_id=job_id)
                return False
            
            # Check if job is in correct status
            if job.status != JobStatus.PENDING:
                logger.warning("Job not in pending status", job_id=job_id, status=job.status)
                return False
            
            # Get all requests for this job
            requests = await BatchRequestCRUD.get_by_job_id(db, job_id)
            if not requests:
                logger.warning("No requests found for job", job_id=job_id)
                return False
            
            # Create JSONL file for OpenAI batch API
            input_file_id = await self._create_input_file(requests)
            if not input_file_id:
                logger.error("Failed to create input file", job_id=job_id)
                return False
            
            # Submit batch to OpenAI
            batch = await self.client.batches.create(
                input_file_id=input_file_id,
                endpoint="/v1/chat/completions",
                completion_window="24h",
                metadata={"job_id": job_id, "created_by": "fastapi-batch-processor"}
            )
            
            # Update job with OpenAI batch information
            job.openai_batch_id = batch.id
            job.openai_input_file_id = input_file_id
            job.status = JobStatus.PROCESSING
            job.submitted_at = datetime.utcnow()
            
            # Update request statuses
            for request in requests:
                request.status = RequestStatus.PROCESSING
            
            await db.commit()
            
            logger.info(
                "Submitted batch job to OpenAI",
                job_id=job_id,
                openai_batch_id=batch.id,
                request_count=len(requests)
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to submit batch job", job_id=job_id, error=str(e))
            await db.rollback()
            return False
    
    async def check_batch_status(self, db: AsyncSession, job_id: str) -> bool:
        """Check the status of a batch job with OpenAI."""
        try:
            job = await BatchJobCRUD.get_by_id(db, job_id)
            if not job or not job.openai_batch_id:
                logger.warning("Job not found or missing OpenAI batch ID", job_id=job_id)
                return False
            
            # Get batch status from OpenAI
            batch = await self.client.batches.retrieve(job.openai_batch_id)
            
            logger.info(
                "Checked batch status",
                job_id=job_id,
                openai_batch_id=batch.id,
                status=batch.status,
                request_counts=batch.request_counts
            )
            
            # Update job based on OpenAI batch status
            if batch.status == "completed":
                await self._handle_completed_batch(db, job, batch)
            elif batch.status == "failed":
                await self._handle_failed_batch(db, job, batch)
            elif batch.status == "cancelled":
                job.status = JobStatus.CANCELLED
                await db.commit()
            
            return True
            
        except Exception as e:
            logger.error("Failed to check batch status", job_id=job_id, error=str(e))
            return False
    
    async def _create_input_file(self, requests: List[BatchRequest]) -> Optional[str]:
        """Create JSONL input file for OpenAI batch API."""
        try:
            # Create temporary file with JSONL content
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                for request in requests:
                    batch_request = {
                        "custom_id": request.custom_id,
                        "method": request.method,
                        "url": request.url,
                        "body": request.body
                    }
                    f.write(json.dumps(batch_request) + '\n')
                
                temp_file_path = f.name
            
            # Upload file to OpenAI
            with open(temp_file_path, 'rb') as f:
                file_response = await self.client.files.create(
                    file=f,
                    purpose='batch'
                )
            
            # Clean up temporary file
            Path(temp_file_path).unlink()
            
            logger.info("Created input file for batch", file_id=file_response.id)
            return file_response.id
            
        except Exception as e:
            logger.error("Failed to create input file", error=str(e))
            return None
    
    async def _handle_completed_batch(self, db: AsyncSession, job: BatchJob, batch) -> None:
        """Handle a completed batch job."""
        try:
            # Update job status
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.openai_output_file_id = batch.output_file_id
            job.openai_error_file_id = batch.error_file_id
            
            # Download and process results
            if batch.output_file_id:
                await self._process_output_file(db, job, batch.output_file_id)
            
            if batch.error_file_id:
                await self._process_error_file(db, job, batch.error_file_id)
            
            # Update counters
            responses = await BatchResponseCRUD.get_by_job_id(db, job.id)
            job.completed_requests = len([r for r in responses if r.response_body])
            job.failed_requests = len([r for r in responses if r.error])
            
            await db.commit()
            
            logger.info(
                "Processed completed batch",
                job_id=job.id,
                completed=job.completed_requests,
                failed=job.failed_requests
            )
            
        except Exception as e:
            logger.error("Failed to handle completed batch", job_id=job.id, error=str(e))
            await db.rollback()
    
    async def _handle_failed_batch(self, db: AsyncSession, job: BatchJob, batch) -> None:
        """Handle a failed batch job."""
        try:
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.error_message = f"OpenAI batch failed: {batch.status}"
            
            if batch.error_file_id:
                job.openai_error_file_id = batch.error_file_id
                await self._process_error_file(db, job, batch.error_file_id)
            
            await db.commit()
            
            logger.error("Batch job failed", job_id=job.id, openai_batch_id=batch.id)
            
        except Exception as e:
            logger.error("Failed to handle failed batch", job_id=job.id, error=str(e))
            await db.rollback()
    
    async def _process_output_file(self, db: AsyncSession, job: BatchJob, file_id: str) -> None:
        """Process the output file from a completed batch."""
        try:
            # Download the output file
            file_content = await self.client.files.content(file_id)
            content = file_content.read().decode('utf-8')
            
            # Process each line (JSONL format)
            for line in content.strip().split('\n'):
                if not line:
                    continue
                
                result = json.loads(line)
                custom_id = result.get('custom_id')
                
                # Find the corresponding request
                request = await BatchRequestCRUD.get_by_custom_id(db, custom_id)
                if not request:
                    logger.warning("Request not found for custom_id", custom_id=custom_id)
                    continue
                
                # Extract usage information
                usage = result.get('response', {}).get('body', {}).get('usage', {})
                
                # Create response record
                await BatchResponseCRUD.create(
                    db=db,
                    job_id=job.id,
                    request_id=request.id,
                    custom_id=custom_id,
                    response_body=result.get('response', {}).get('body'),
                    openai_request_id=result.get('response', {}).get('request_id'),
                    prompt_tokens=usage.get('prompt_tokens'),
                    completion_tokens=usage.get('completion_tokens'),
                    total_tokens=usage.get('total_tokens')
                )
                
                # Update request status
                request.status = RequestStatus.COMPLETED
            
            logger.info("Processed output file", job_id=job.id, file_id=file_id)
            
        except Exception as e:
            logger.error("Failed to process output file", job_id=job.id, file_id=file_id, error=str(e))
    
    async def _process_error_file(self, db: AsyncSession, job: BatchJob, file_id: str) -> None:
        """Process the error file from a batch."""
        try:
            # Download the error file
            file_content = await self.client.files.content(file_id)
            content = file_content.read().decode('utf-8')
            
            # Process each error line
            for line in content.strip().split('\n'):
                if not line:
                    continue
                
                error_result = json.loads(line)
                custom_id = error_result.get('custom_id')
                
                # Find the corresponding request
                request = await BatchRequestCRUD.get_by_custom_id(db, custom_id)
                if not request:
                    logger.warning("Request not found for error custom_id", custom_id=custom_id)
                    continue
                
                # Create error response record
                await BatchResponseCRUD.create(
                    db=db,
                    job_id=job.id,
                    request_id=request.id,
                    custom_id=custom_id,
                    error=error_result.get('error')
                )
                
                # Update request status
                request.status = RequestStatus.FAILED
                request.error_message = str(error_result.get('error', {}))
            
            logger.info("Processed error file", job_id=job.id, file_id=file_id)
            
        except Exception as e:
            logger.error("Failed to process error file", job_id=job.id, file_id=file_id, error=str(e))
    
    async def process_pending_jobs(self, db: AsyncSession) -> Tuple[int, int]:
        """Process all pending jobs by submitting them to OpenAI."""
        submitted_count = 0
        error_count = 0
        
        try:
            # Get all pending jobs
            pending_jobs = await BatchJobCRUD.get_multi(db, status=JobStatus.PENDING, limit=100)
            
            for job in pending_jobs:
                success = await self.submit_batch_job(db, job.id)
                if success:
                    submitted_count += 1
                else:
                    error_count += 1
            
            logger.info(
                "Processed pending jobs",
                submitted=submitted_count,
                errors=error_count
            )
            
        except Exception as e:
            logger.error("Failed to process pending jobs", error=str(e))
            error_count += 1
        
        return submitted_count, error_count
    
    async def check_processing_jobs(self, db: AsyncSession) -> Tuple[int, int]:
        """Check status of all processing jobs."""
        checked_count = 0
        error_count = 0
        
        try:
            # Get all processing jobs
            processing_jobs = await BatchJobCRUD.get_multi(db, status=JobStatus.PROCESSING, limit=100)
            
            for job in processing_jobs:
                success = await self.check_batch_status(db, job.id)
                if success:
                    checked_count += 1
                else:
                    error_count += 1
                
                # Add small delay to avoid rate limits
                await asyncio.sleep(0.1)
            
            logger.info(
                "Checked processing jobs",
                checked=checked_count,
                errors=error_count
            )
            
        except Exception as e:
            logger.error("Failed to check processing jobs", error=str(e))
            error_count += 1
        
        return checked_count, error_count