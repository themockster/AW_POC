"""
Session model for managing chat sessions and conversations.

This module defines the Session model which handles chat sessions,
conversation tracking, and session-specific metadata.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import Base


class Session(Base):
    """Session model for managing chat sessions and conversations."""
    
    __tablename__ = "sessions"
    
    id = Column(
        Integer, 
        primary_key=True, 
        index=True,
        doc="Unique session identifier"
    )
    session_id = Column(
        String(100), 
        unique=True, 
        index=True, 
        nullable=False,
        doc="Unique session ID for external reference"
    )
    title = Column(
        String(200), 
        nullable=True,
        doc="Session title (auto-generated from first message)"
    )
    is_active = Column(
        Boolean, 
        default=True,
        doc="Whether the session is currently active"
    )
    started_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        doc="When the session was started"
    )
    last_activity = Column(
        DateTime, 
        default=datetime.utcnow, 
        nullable=False,
        doc="Last activity timestamp"
    )
    session_metadata = Column(
        Text, 
        nullable=True,
        doc="JSON metadata for the session"
    )
    
    # Foreign Keys
    user_id = Column(
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        doc="User who owns this session"
    )
    profile_id = Column(
        Integer, 
        ForeignKey("profiles.id", ondelete="CASCADE"), 
        nullable=False,
        doc="Profile used for this session"
    )
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    profile = relationship("Profile", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """String representation of the Session instance."""
        return f"<Session(id={self.id}, session_id='{self.session_id}', user_id={self.user_id})>" 