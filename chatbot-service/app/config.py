"""
Configuration management for the Chatbot Service.

This module handles all configuration settings including database connections,
LLM provider settings, authentication, and service-specific configurations.
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
import os


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""
    
    url: str = Field(
        default="sqlite:///./chatbot.db",
        description="Database connection URL"
    )
    echo: bool = Field(
        default=False,
        description="Enable SQLAlchemy query logging"
    )
    pool_size: int = Field(
        default=10,
        description="Database connection pool size"
    )
    max_overflow: int = Field(
        default=20,
        description="Maximum database connection overflow"
    )

    class Config:
        env_prefix = "DB_"


class LLMSettings(BaseSettings):
    """LLM provider configuration settings."""
    
    # LM Studio Configuration
    lm_studio_url: str = Field(
        default="http://localhost:3001",
        description="AgentWatch proxy URL (intercepts LM Studio requests)"
    )
    lm_studio_timeout: int = Field(
        default=30,
        description="LM Studio request timeout in seconds"
    )
    
    # Azure OpenAI Configuration
    azure_openai_endpoint: Optional[str] = Field(
        default=None,
        description="Azure OpenAI endpoint URL"
    )
    azure_openai_api_key: Optional[str] = Field(
        default=None,
        description="Azure OpenAI API key"
    )
    azure_openai_deployment: Optional[str] = Field(
        default=None,
        description="Azure OpenAI deployment name"
    )
    
    # Default LLM Provider
    default_provider: str = Field(
        default="lm_studio",
        description="Default LLM provider to use"
    )

    class Config:
        env_prefix = "LLM_"


class SecuritySettings(BaseSettings):
    """Security and authentication settings."""
    
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    algorithm: str = Field(
        default="HS256",
        description="JWT algorithm"
    )
    access_token_expire_minutes: int = Field(
        default=30,
        description="JWT access token expiration time in minutes"
    )
    
    # CORS Settings
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow CORS credentials"
    )

    class Config:
        env_prefix = "SECURITY_"


class ServiceSettings(BaseSettings):
    """General service configuration settings."""
    
    host: str = Field(
        default="0.0.0.0",
        description="Service host address"
    )
    port: int = Field(
        default=8000,
        description="Service port"
    )
    debug: bool = Field(
        default=False,
        description="Enable debug mode"
    )
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(
        default=60,
        description="Rate limit per minute per user"
    )
    
    # Chat Settings
    max_message_length: int = Field(
        default=4000,
        description="Maximum message length"
    )
    max_history_length: int = Field(
        default=100,
        description="Maximum chat history length per conversation"
    )

    class Config:
        env_prefix = "SERVICE_"


class RedisSettings(BaseSettings):
    """Redis configuration for caching and session management."""
    
    url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )
    enabled: bool = Field(
        default=False,
        description="Enable Redis for caching"
    )

    class Config:
        env_prefix = "REDIS_"


class Settings(BaseSettings):
    """Main application settings combining all configuration sections."""
    
    # Environment
    environment: str = Field(
        default="development",
        description="Application environment"
    )
    
    # Service Info
    service_name: str = Field(
        default="chatbot-service",
        description="Service name for logging and monitoring"
    )
    version: str = Field(
        default="1.0.0",
        description="Service version"
    )
    
    # Configuration sections
    database: DatabaseSettings = DatabaseSettings()
    llm: LLMSettings = LLMSettings()
    security: SecuritySettings = SecuritySettings()
    service: ServiceSettings = ServiceSettings()
    redis: RedisSettings = RedisSettings()
    
    # Validation will be handled at runtime

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance."""
    return settings 