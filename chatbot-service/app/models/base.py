"""
Base model class for all database models.

This module provides a base class with common fields and functionality
that all models in the application inherit from.
"""

from datetime import datetime
from typing import Any
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""
    
    # Common fields for all models
    created_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        doc="Timestamp when the record was created"
    )
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        nullable=False,
        doc="Timestamp when the record was last updated"
    )
    
    def to_dict(self) -> dict[str, Any]:
        """Convert model instance to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def __repr__(self) -> str:
        """String representation of the model instance."""
        return f"<{self.__class__.__name__}(id={getattr(self, 'id', 'N/A')})>" 