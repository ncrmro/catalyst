# FastAPI AI Batch Processor Example

This example demonstrates a production-ready FastAPI server that integrates with PostgreSQL and OpenAI's Batch API for cost-effective AI request processing.

> 💡 **Cost Savings**: Using OpenAI's Batch API provides 50% cost reduction compared to standard API calls, making this ideal for processing large volumes of AI requests.

## 🎯 What This Example Demonstrates

- **Modern FastAPI Development** - Async/await, type hints, automatic API documentation
- **Database Integration** - SQLAlchemy 2.x with PostgreSQL, proper migrations with Alembic  
- **AI Batch Processing** - OpenAI Batch API integration with job management
- **Production Practices** - Docker setup, structured logging, comprehensive testing
- **Automated Processing** - Cron-compatible scripts for hands-off operation

## Features

- **FastAPI Server**: Modern async Python web framework with automatic API documentation
- **PostgreSQL Integration**: Using SQLAlchemy 2.x with modern typed ORM patterns
- **OpenAI Batch API**: Efficient batch processing of AI requests with cost savings
- **Cronjob Script**: Automated batch processing that can be scheduled
- **Docker Support**: Easy deployment and development setup
- **Comprehensive Logging**: Structured logging for monitoring and debugging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │    │   PostgreSQL    │    │   OpenAI        │
│   Server        │◄──►│   Database      │    │   Batch API     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Interface │    │   Data Models   │    │   Batch         │
│   & API Docs    │    │   & Relations   │    │   Processor     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

- **batch_jobs**: Tracks batch processing jobs
- **batch_requests**: Individual AI requests within a batch
- **batch_responses**: AI responses from OpenAI

## Quick Start

1. **Setup Environment**:
   ```bash
   cd examples/fastapi-ai-batch-processor
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure Database**:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL and OpenAI settings
   ```

3. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```

4. **Start the Server**:
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Access API Documentation**:
   - Open http://localhost:8000/docs for Swagger UI
   - Open http://localhost:8000/redoc for ReDoc

6. **Run Batch Processor**:
   ```bash
   python scripts/batch_processor.py
   ```

## API Endpoints

- `GET /` - Health check
- `GET /jobs` - List all batch jobs
- `POST /jobs` - Create a new batch job
- `GET /jobs/{job_id}` - Get job details
- `POST /jobs/{job_id}/requests` - Add requests to a job
- `GET /jobs/{job_id}/responses` - Get job responses

## Scheduling with Cron

Add to your crontab to run batch processing every hour:
```bash
0 * * * * cd /path/to/fastapi-ai-batch-processor && python scripts/batch_processor.py
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

## Development

Run tests:
```bash
pytest
```

Run with Docker:
```bash
docker-compose up
```

## 📚 Documentation

- **[README.md](README.md)** - Quick start and overview
- **[USAGE.md](USAGE.md)** - Detailed usage examples and API documentation  
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Comprehensive project documentation
- **Validation** - Run `python validate.py` to verify project structure

## 🔧 Project Validation

Before getting started, validate the project structure:

```bash
python validate.py
```

This will check all files, syntax, and configurations to ensure everything is set up correctly.