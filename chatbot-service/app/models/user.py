"""
User model for authentication and user management.

This module defines the User model which handles user authentication,
profile associations, and user-specific data.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from .base import Base


class User(Base):
    """User model for authentication and user management."""
    
    __tablename__ = "users"
    
    id = Column(
        Integer, 
        primary_key=True, 
        index=True,
        doc="Unique user identifier"
    )
    username = Column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False,
        doc="Unique username for login"
    )
    email = Column(
        String(100), 
        unique=True, 
        index=True, 
        nullable=False,
        doc="User's email address"
    )
    hashed_password = Column(
        String(255), 
        nullable=False,
        doc="Hashed password for security"
    )
    is_active = Column(
        Boolean, 
        default=True,
        doc="Whether the user account is active"
    )
    is_superuser = Column(
        Boolean, 
        default=False,
        doc="Whether the user has superuser privileges"
    )
    last_login = Column(
        DateTime, 
        nullable=True,
        doc="Timestamp of last login"
    )
    
    # Relationships
    profiles = relationship("Profile", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """String representation of the User instance."""
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>" 