"""
Basic tests for the FastAPI AI Batch Processor.

These tests verify the core functionality of the application.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.batch import JobStatus
from app.schemas.batch import BatchJobCreate, BatchRequestCreate


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test the root endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test the health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_create_batch_job():
    """Test creating a batch job."""
    job_data = {
        "name": "Test Job",
        "description": "A test batch job",
        "model": "gpt-3.5-turbo",
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/jobs/", json=job_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == job_data["name"]
    assert data["status"] == JobStatus.PENDING.value
    assert data["total_requests"] == 0


@pytest.mark.asyncio  
async def test_list_batch_jobs():
    """Test listing batch jobs."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/jobs/")
    
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert "total" in data
    assert "page" in data
    assert "size" in data


@pytest.mark.asyncio
async def test_get_batch_stats():
    """Test getting batch processing statistics."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/jobs/stats/overview")
    
    assert response.status_code == 200
    data = response.json()
    assert "total_jobs" in data
    assert "pending_jobs" in data
    assert "processing_jobs" in data
    assert "completed_jobs" in data


def test_batch_job_schema():
    """Test BatchJobCreate schema validation."""
    # Valid data
    valid_data = {
        "name": "Test Job",
        "description": "Test description",
        "model": "gpt-3.5-turbo"
    }
    job = BatchJobCreate(**valid_data)
    assert job.name == "Test Job"
    assert job.model == "gpt-3.5-turbo"
    
    # Invalid data - empty name
    with pytest.raises(ValueError):
        BatchJobCreate(name="", model="gpt-3.5-turbo")


def test_batch_request_schema():
    """Test BatchRequestCreate schema validation."""
    # Valid data
    valid_data = {
        "custom_id": "test_req_1",
        "body": {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}]
        }
    }
    request = BatchRequestCreate(**valid_data)
    assert request.custom_id == "test_req_1"
    assert request.method == "POST"
    assert request.url == "/v1/chat/completions"