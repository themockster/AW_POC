"""
Main FastAPI application for the Chatbot Service.

This module creates and configures the FastAPI application with all
routes, middleware, CORS, and error handling.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import structlog
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from app.config import get_settings
from app.database.session import create_tables
from app.database.init_db import init_db
from app.routers import auth, health, chat, profiles

# Get settings
settings = get_settings()

# Configure structured logging
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
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Chatbot Service", version=settings.version)
    
    # Create database tables
    create_tables()
    logger.info("Database tables created")
    
    # Initialize sample data in development
    if settings.environment == "development":
        from app.database.session import SessionLocal
        db = SessionLocal()
        try:
            init_db(db)
            logger.info("Sample data initialized")
        finally:
            db.close()
    
    yield
    
    # Shutdown
    logger.info("Shutting down Chatbot Service")


# Create FastAPI application
app = FastAPI(
    title="Chatbot Service",
    description="A modular chatbot service for larger applications",
    version=settings.version,
    docs_url="/docs" if settings.service.debug else None,
    redoc_url="/redoc" if settings.service.debug else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.security.cors_origins,
    allow_credentials=settings.security.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.service.debug else ["localhost", "127.0.0.1"]
)


@app.middleware("http")
async def metrics_middleware(request, call_next):
    """Middleware for collecting metrics."""
    import time
    start_time = time.time()
    
    response = await call_next(request)
    
    # Record metrics
    duration = time.time() - start_time
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.observe(duration)
    
    return response


@app.middleware("http")
async def logging_middleware(request, call_next):
    """Middleware for request logging."""
    logger.info(
        "Request started",
        method=request.method,
        url=str(request.url),
        client_ip=request.client.host if request.client else None
    )
    
    response = await call_next(request)
    
    logger.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code
    )
    
    return response


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["Profiles"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Chatbot Service",
        "version": settings.version,
        "environment": settings.environment,
        "docs": "/docs" if settings.service.debug else None
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        method=request.method,
        url=str(request.url)
    )
    
    return HTTPException(
        status_code=500,
        detail="Internal server error"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.service.host,
        port=settings.service.port,
        reload=settings.service.debug,
        log_level=settings.service.log_level.lower()
    ) 