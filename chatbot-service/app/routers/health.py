"""
Health check router for monitoring and service status.

This module provides endpoints for health checks, service status,
and monitoring information.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.config import get_settings
from app.database.session import get_db
from app.services.llm_service import LLMService

router = APIRouter()
settings = get_settings()
llm_service = LLMService()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    version: str
    environment: str


class ServiceStatus(BaseModel):
    """Service status response model."""
    database: bool
    llm_providers: dict
    available_providers: list


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        HealthResponse: Service health status
    """
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        version=settings.version,
        environment=settings.environment
    )


@router.get("/status", response_model=ServiceStatus)
async def service_status(db: Session = Depends(get_db)):
    """
    Detailed service status check.
    
    Args:
        db: Database session
        
    Returns:
        ServiceStatus: Detailed service status
    """
    # Check database connection
    try:
        db.execute("SELECT 1")
        database_healthy = True
    except Exception:
        database_healthy = False
    
    # Check LLM providers
    available_providers = llm_service.get_available_providers()
    provider_status = {}
    
    for provider_name in ["lm_studio", "azure_openai"]:
        provider_status[provider_name] = llm_service.is_provider_available(provider_name)
    
    return ServiceStatus(
        database=database_healthy,
        llm_providers=provider_status,
        available_providers=available_providers
    ) 