# FastAPI AI Batch Processor - Usage Examples

This document provides practical examples of how to use the FastAPI AI Batch Processor.

## Quick Start

1. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL and OpenAI API key
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

4. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

## API Usage Examples

### 1. Create a Batch Job

```bash
curl -X POST "http://localhost:8000/api/v1/jobs/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Sentiment Analysis",
    "description": "Analyze customer feedback for sentiment",
    "model": "gpt-3.5-turbo",
    "max_tokens": 150,
    "temperature": 0.7
  }'
```

### 2. Add Requests to a Job

```bash
curl -X POST "http://localhost:8000/api/v1/jobs/{job_id}/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "custom_id": "feedback_1",
        "body": {
          "model": "gpt-3.5-turbo",
          "messages": [
            {
              "role": "system",
              "content": "Analyze sentiment: positive, negative, or neutral"
            },
            {
              "role": "user",
              "content": "Your service is amazing! Keep up the great work."
            }
          ],
          "max_tokens": 50
        }
      },
      {
        "custom_id": "feedback_2", 
        "body": {
          "model": "gpt-3.5-turbo",
          "messages": [
            {
              "role": "system",
              "content": "Analyze sentiment: positive, negative, or neutral"
            },
            {
              "role": "user",
              "content": "I had a terrible experience with your product."
            }
          ],
          "max_tokens": 50
        }
      }
    ]
  }'
```

### 3. List All Jobs

```bash
curl "http://localhost:8000/api/v1/jobs/?limit=10&skip=0"
```

### 4. Get Job Details

```bash
curl "http://localhost:8000/api/v1/jobs/{job_id}"
```

### 5. Get Job Responses

```bash
curl "http://localhost:8000/api/v1/jobs/{job_id}/responses"
```

### 6. Get Processing Statistics

```bash
curl "http://localhost:8000/api/v1/jobs/stats/overview"
```

## Python SDK Usage

```python
import asyncio
import httpx
from typing import List, Dict, Any

class BatchProcessorClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def create_job(self, name: str, description: str = None, 
                        model: str = "gpt-3.5-turbo") -> Dict[str, Any]:
        """Create a new batch job."""
        response = await self.client.post(
            f"{self.base_url}/api/v1/jobs/",
            json={
                "name": name,
                "description": description,
                "model": model
            }
        )
        response.raise_for_status()
        return response.json()
    
    async def add_requests(self, job_id: str, 
                          requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Add requests to a batch job."""
        response = await self.client.post(
            f"{self.base_url}/api/v1/jobs/{job_id}/requests",
            json={"requests": requests}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_job(self, job_id: str) -> Dict[str, Any]:
        """Get job details."""
        response = await self.client.get(f"{self.base_url}/api/v1/jobs/{job_id}")
        response.raise_for_status()
        return response.json()
    
    async def get_responses(self, job_id: str) -> List[Dict[str, Any]]:
        """Get job responses."""
        response = await self.client.get(f"{self.base_url}/api/v1/jobs/{job_id}/responses")
        response.raise_for_status()
        return response.json()

# Usage example
async def main():
    client = BatchProcessorClient()
    
    # Create a job
    job = await client.create_job("Text Classification", "Classify text samples")
    job_id = job["id"]
    
    # Add requests
    requests = [
        {
            "custom_id": "text_1",
            "body": {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "user", "content": "Classify this text as spam or not spam: 'Win money now!'"}
                ]
            }
        }
    ]
    
    await client.add_requests(job_id, requests)
    
    # Check job status
    job_details = await client.get_job(job_id)
    print(f"Job status: {job_details['status']}")

# Run the example
asyncio.run(main())
```

## Batch Processing with Cron

Set up automated batch processing by adding to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line to run every 30 minutes
*/30 * * * * cd /path/to/fastapi-ai-batch-processor && python scripts/batch_processor.py >> /var/log/batch_processor.log 2>&1

# Or run every hour
0 * * * * cd /path/to/fastapi-ai-batch-processor && python scripts/batch_processor.py

# For development, you can also run manually
python scripts/batch_processor.py --verbose
```

## Common Use Cases

### 1. Content Moderation

```python
requests = [
    {
        "custom_id": f"content_{i}",
        "body": {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": "Review this content for policy violations. Respond with 'APPROVED' or 'REJECTED' and a brief reason."
                },
                {
                    "role": "user",
                    "content": content_text
                }
            ],
            "max_tokens": 100
        }
    }
    for i, content_text in enumerate(content_to_review)
]
```

### 2. Data Extraction

```python
requests = [
    {
        "custom_id": f"extract_{i}",
        "body": {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": "Extract key information from this text as JSON: {name, email, phone, company}"
                },
                {
                    "role": "user",
                    "content": text_to_process
                }
            ],
            "max_tokens": 200
        }
    }
    for i, text_to_process in enumerate(documents)
]
```

### 3. Translation

```python
requests = [
    {
        "custom_id": f"translate_{i}",
        "body": {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": f"Translate the following text to {target_language}:"
                },
                {
                    "role": "user",
                    "content": text_to_translate
                }
            ],
            "max_tokens": len(text_to_translate) * 2
        }
    }
    for i, text_to_translate in enumerate(texts)
]
```

## Monitoring and Troubleshooting

### Check Application Logs

```bash
# View recent logs
tail -f /var/log/batch_processor.log

# Check for errors
grep "ERROR" /var/log/batch_processor.log
```

### Monitor Processing Status

```bash
# Get overview statistics
curl "http://localhost:8000/api/v1/jobs/stats/overview" | jq

# List jobs by status
curl "http://localhost:8000/api/v1/jobs/?status=processing" | jq
```

### Debugging Failed Jobs

```bash
# Get job details to see error messages
curl "http://localhost:8000/api/v1/jobs/{job_id}" | jq '.error_message'

# Check individual request errors
curl "http://localhost:8000/api/v1/jobs/{job_id}/responses" | jq '.[] | select(.error != null)'
```