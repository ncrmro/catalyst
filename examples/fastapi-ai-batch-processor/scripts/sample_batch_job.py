#!/usr/bin/env python3
"""
Sample script to create and submit a batch job.

This script demonstrates how to:
1. Create a new batch job
2. Add multiple AI requests to the job
3. Submit the job for processing

Usage:
    python scripts/sample_batch_job.py
"""

import asyncio
import json
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import async_session_factory
from app.crud.batch import BatchJobCRUD, BatchRequestCRUD
from app.schemas.batch import BatchJobCreate, BatchRequestCreate
from app.services.openai_batch import OpenAIBatchService

logger = structlog.get_logger()


async def create_sample_batch_job():
    """Create a sample batch job with multiple requests."""
    
    # Sample data for the batch job
    job_data = BatchJobCreate(
        name="Sample Customer Support Analysis",
        description="Analyze customer support tickets for sentiment and categorization",
        model="gpt-3.5-turbo",
        max_tokens=150,
        temperature=0.7
    )
    
    # Sample requests
    requests_data = [
        BatchRequestCreate(
            custom_id="support_ticket_1",
            body={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a customer support analyst. Analyze the following ticket and provide sentiment (positive/negative/neutral) and category."
                    },
                    {
                        "role": "user", 
                        "content": "I'm really frustrated with your service. My order was late and the customer support was unhelpful."
                    }
                ],
                "max_tokens": 150,
                "temperature": 0.7
            }
        ),
        BatchRequestCreate(
            custom_id="support_ticket_2",
            body={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a customer support analyst. Analyze the following ticket and provide sentiment (positive/negative/neutral) and category."
                    },
                    {
                        "role": "user",
                        "content": "Thank you so much for the quick resolution! Your team was very helpful and professional."
                    }
                ],
                "max_tokens": 150,
                "temperature": 0.7
            }
        ),
        BatchRequestCreate(
            custom_id="support_ticket_3",
            body={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a customer support analyst. Analyze the following ticket and provide sentiment (positive/negative/neutral) and category."
                    },
                    {
                        "role": "user",
                        "content": "I have a question about my billing statement. Can you help me understand the charges?"
                    }
                ],
                "max_tokens": 150,
                "temperature": 0.7
            }
        )
    ]
    
    async with async_session_factory() as db:
        try:
            # Create the batch job
            job = await BatchJobCRUD.create(db, job_data)
            logger.info("Created batch job", job_id=job.id, name=job.name)
            
            # Add requests to the job
            requests = await BatchRequestCRUD.create_multi(db, job.id, requests_data)
            logger.info("Added requests to job", job_id=job.id, request_count=len(requests))
            
            # Update job total_requests count
            job.total_requests = len(requests)
            
            await db.commit()
            
            logger.info(
                "Sample batch job created successfully",
                job_id=job.id,
                name=job.name,
                total_requests=job.total_requests
            )
            
            # Optionally submit the job immediately
            print(f"\nBatch job created with ID: {job.id}")
            print(f"Name: {job.name}")
            print(f"Total requests: {job.total_requests}")
            print(f"\nTo submit this job for processing, run:")
            print(f"python scripts/batch_processor.py")
            print(f"\nOr check the job status via the API:")
            print(f"curl http://localhost:8000/api/v1/jobs/{job.id}")
            
            return job
            
        except Exception as e:
            await db.rollback()
            logger.error("Failed to create sample batch job", error=str(e))
            raise


async def main():
    """Main entry point."""
    logger.info("Creating sample batch job")
    
    # Check if required environment variables are set
    if not settings.OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY is not set")
        print("Please set your OPENAI_API_KEY in the .env file")
        sys.exit(1)
    
    if not settings.DATABASE_URL:
        logger.error("DATABASE_URL is not set")
        print("Please set your DATABASE_URL in the .env file")
        sys.exit(1)
    
    try:
        job = await create_sample_batch_job()
        print(f"\n✅ Sample batch job created successfully!")
        print(f"Job ID: {job.id}")
        
    except Exception as e:
        logger.error("Failed to create sample batch job", error=str(e))
        print(f"\n❌ Failed to create sample batch job: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())