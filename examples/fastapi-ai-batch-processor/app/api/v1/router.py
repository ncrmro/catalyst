"""API v1 router that combines all endpoint modules."""

from fastapi import APIRouter

from app.api.v1 import jobs

api_router = APIRouter()

# Include all route modules
api_router.include_router(jobs.router, prefix="/jobs", tags=["Batch Jobs"])

# Add any additional v1 routes here as the API grows