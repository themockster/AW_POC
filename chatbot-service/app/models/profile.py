"""
Profile model for managing chatbot personalities and configurations.

This module defines the Profile model which handles different chatbot
personalities, system instructions, and LLM provider configurations.
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Profile(Base):
    """Profile model for managing chatbot personalities and configurations."""
    
    __tablename__ = "profiles"
    
    id = Column(
        Integer, 
        primary_key=True, 
        index=True,
        doc="Unique profile identifier"
    )
    name = Column(
        String(100), 
        nullable=False,
        doc="Profile name for identification"
    )
    description = Column(
        Text, 
        nullable=True,
        doc="Profile description"
    )
    system_instructions = Column(
        Text, 
        nullable=False,
        doc="System instructions for the LLM"
    )
    llm_provider = Column(
        String(50), 
        nullable=False, 
        default="lm_studio",
        doc="LLM provider to use (lm_studio, azure_openai, etc.)"
    )
    llm_model = Column(
        String(100), 
        nullable=True,
        doc="Specific LLM model to use"
    )
    temperature = Column(
        String(10), 
        default="0.7",
        doc="Temperature setting for LLM responses"
    )
    max_tokens = Column(
        Integer, 
        default=1000,
        doc="Maximum tokens for LLM responses"
    )
    is_default = Column(
        Boolean, 
        default=False,
        doc="Whether this is the default profile for the user"
    )
    is_active = Column(
        Boolean, 
        default=True,
        doc="Whether this profile is active"
    )
    
    # Foreign Keys
    user_id = Column(
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        doc="User who owns this profile"
    )
    
    # Relationships
    user = relationship("User", back_populates="profiles")
    sessions = relationship("Session", back_populates="profile", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="profile", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        """String representation of the Profile instance."""
        return f"<Profile(id={self.id}, name='{self.name}', user_id={self.user_id})>" 