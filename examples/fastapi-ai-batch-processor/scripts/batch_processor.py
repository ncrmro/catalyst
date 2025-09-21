#!/usr/bin/env python3
"""
Batch Processor Script

This script processes AI batch jobs by:
1. Submitting pending jobs to OpenAI's Batch API
2. Checking status of processing jobs
3. Downloading and storing completed results

This script is designed to be run as a cronjob for automated processing.

Usage:
    python scripts/batch_processor.py [--dry-run] [--verbose]
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add the parent directory to the Python path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import async_session_factory
from app.services.openai_batch import OpenAIBatchService

# Configure logging for the script
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if not sys.stdout.isatty() else structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class BatchProcessor:
    """Main batch processor class."""
    
    def __init__(self, dry_run: bool = False):
        """Initialize the batch processor."""
        self.dry_run = dry_run
        self.openai_service = OpenAIBatchService()
    
    async def run(self) -> None:
        """Run the batch processing cycle."""
        logger.info(
            "Starting batch processor",
            dry_run=self.dry_run,
            app_name=settings.APP_NAME
        )
        
        async with async_session_factory() as db:
            try:
                # Process pending jobs
                await self._process_pending_jobs(db)
                
                # Check processing jobs
                await self._check_processing_jobs(db)
                
                logger.info("Batch processor completed successfully")
                
            except Exception as e:
                logger.error("Batch processor failed", error=str(e))
                raise
    
    async def _process_pending_jobs(self, db: AsyncSession) -> None:
        """Process all pending jobs."""
        logger.info("Processing pending jobs")
        
        if self.dry_run:
            logger.info("DRY RUN: Would process pending jobs")
            return
        
        try:
            submitted, errors = await self.openai_service.process_pending_jobs(db)
            
            logger.info(
                "Pending jobs processed",
                submitted=submitted,
                errors=errors
            )
            
            if errors > 0:
                logger.warning(f"Encountered {errors} errors while processing pending jobs")
                
        except Exception as e:
            logger.error("Failed to process pending jobs", error=str(e))
            raise
    
    async def _check_processing_jobs(self, db: AsyncSession) -> None:
        """Check status of all processing jobs."""
        logger.info("Checking processing jobs")
        
        if self.dry_run:
            logger.info("DRY RUN: Would check processing jobs")
            return
        
        try:
            checked, errors = await self.openai_service.check_processing_jobs(db)
            
            logger.info(
                "Processing jobs checked",
                checked=checked,
                errors=errors
            )
            
            if errors > 0:
                logger.warning(f"Encountered {errors} errors while checking processing jobs")
                
        except Exception as e:
            logger.error("Failed to check processing jobs", error=str(e))
            raise


async def main() -> None:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Process AI batch jobs")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run in dry-run mode (don't make actual changes)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Set log level based on arguments
    if args.verbose:
        structlog.configure(
            processors=structlog.get_config()["processors"],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
        # Set level to DEBUG for verbose mode
        import logging
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate configuration
    if not settings.OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY is not set")
        sys.exit(1)
    
    if not settings.DATABASE_URL:
        logger.error("DATABASE_URL is not set")
        sys.exit(1)
    
    # Create and run the processor
    processor = BatchProcessor(dry_run=args.dry_run)
    
    try:
        await processor.run()
        logger.info("Batch processor finished successfully")
        
    except KeyboardInterrupt:
        logger.info("Batch processor interrupted by user")
        sys.exit(1)
        
    except Exception as e:
        logger.error("Batch processor failed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())