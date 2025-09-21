"""
Application Configuration

This module handles all configuration settings using Pydantic Settings
for type safety and validation.
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application settings
    APP_NAME: str = Field(default="FastAPI AI Batch Processor", description="Application name")
    APP_VERSION: str = Field(default="1.0.0", description="Application version")
    DEBUG: bool = Field(default=False, description="Debug mode")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # Server settings
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    
    # Database settings
    DATABASE_URL: str = Field(
        default="postgresql://username:password@localhost:5432/fastapi_ai_batch",
        description="PostgreSQL database URL"
    )
    
    # OpenAI settings
    OPENAI_API_KEY: str = Field(description="OpenAI API key")
    
    # Batch processing settings
    BATCH_SIZE: int = Field(default=100, description="Maximum number of requests per batch")
    BATCH_TIMEOUT_HOURS: int = Field(default=24, description="Batch processing timeout in hours")
    MAX_RETRIES: int = Field(default=3, description="Maximum number of retry attempts")
    
    # Security
    SECRET_KEY: str = Field(description="Secret key for security")
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = Field(default=["*"], description="Allowed CORS origins")
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level is one of the allowed values."""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"LOG_LEVEL must be one of {allowed_levels}")
        return v.upper()
    
    @field_validator("BATCH_SIZE")
    @classmethod
    def validate_batch_size(cls, v: int) -> int:
        """Validate batch size is within reasonable limits."""
        if not 1 <= v <= 1000:
            raise ValueError("BATCH_SIZE must be between 1 and 1000")
        return v
    
    @field_validator("BATCH_TIMEOUT_HOURS")
    @classmethod
    def validate_batch_timeout(cls, v: int) -> int:
        """Validate batch timeout is within reasonable limits."""
        if not 1 <= v <= 168:  # 1 hour to 1 week
            raise ValueError("BATCH_TIMEOUT_HOURS must be between 1 and 168 (1 week)")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()