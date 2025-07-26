"""
Message model for storing chat messages and conversation history.

This module defines the Message model which handles individual chat messages,
their content, metadata, and relationships to sessions and users.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import Base


class Message(Base):
    """Message model for storing chat messages and conversation history."""
    
    __tablename__ = "messages"
    
    id = Column(
        Integer, 
        primary_key=True, 
        index=True,
        doc="Unique message identifier"
    )
    message_id = Column(
        String(100), 
        unique=True, 
        index=True, 
        nullable=False,
        doc="Unique message ID for external reference"
    )
    content = Column(
        Text, 
        nullable=False,
        doc="Message content"
    )
    role = Column(
        String(20), 
        nullable=False,
        doc="Message role (user, assistant, system)"
    )
    is_user_message = Column(
        Boolean, 
        default=True,
        doc="Whether this is a user message (vs assistant)"
    )
    tokens_used = Column(
        Integer, 
        nullable=True,
        doc="Number of tokens used for this message"
    )
    response_time = Column(
        String(20), 
        nullable=True,
        doc="Response time in milliseconds"
    )
    message_metadata = Column(
        Text, 
        nullable=True,
        doc="JSON metadata for the message"
    )
    
    # Foreign Keys
    user_id = Column(
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        doc="User who sent/received this message"
    )
    session_id = Column(
        Integer, 
        ForeignKey("sessions.id", ondelete="CASCADE"), 
        nullable=False,
        doc="Session this message belongs to"
    )
    profile_id = Column(
        Integer, 
        ForeignKey("profiles.id", ondelete="CASCADE"), 
        nullable=False,
        doc="Profile used for this message"
    )
    
    # Relationships
    user = relationship("User", back_populates="messages")
    session = relationship("Session", back_populates="messages")
    profile = relationship("Profile", back_populates="messages")
    
    def __repr__(self) -> str:
        """String representation of the Message instance."""
        return f"<Message(id={self.id}, role='{self.role}', session_id={self.session_id})>" 