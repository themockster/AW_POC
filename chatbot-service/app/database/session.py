"""
Database session management and configuration.

This module handles database connection setup, session creation,
and connection pooling for the chatbot service.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.config import get_settings
from app.models.base import Base

# Get settings
settings = get_settings()

# Create database engine
if settings.database.url.startswith("sqlite"):
    # SQLite configuration for development
    engine = create_engine(
        settings.database.url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=settings.database.echo
    )
else:
    # PostgreSQL configuration for production
    engine = create_engine(
        settings.database.url,
        pool_size=settings.database.pool_size,
        max_overflow=settings.database.max_overflow,
        echo=settings.database.echo
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Get database session.
    
    Yields:
        Session: SQLAlchemy database session
        
    Note:
        This function is designed to be used as a dependency in FastAPI.
        It automatically handles session cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine) 