"""
Database initialization and sample data creation.

This module handles database initialization, table creation,
and sample data seeding for development and testing.
"""

import uuid
from sqlalchemy.orm import Session
from app.models import User, Profile, Session as ChatSession
from app.core.security import get_password_hash


def init_db(db: Session) -> None:
    """
    Initialize database with sample data.
    
    Args:
        db: Database session
        
    Note:
        This function creates sample users and profiles for development.
        It should not be used in production.
    """
    # Create sample user
    user = db.query(User).filter(User.username == "demo_user").first()
    if not user:
        user = User(
            username="demo_user",
            email="demo@example.com",
            hashed_password=get_password_hash("demo123"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create sample profiles
    profiles_data = [
        {
            "name": "General Assistant",
            "description": "A helpful and friendly AI assistant",
            "system_instructions": "You are a helpful, friendly, and knowledgeable AI assistant. You provide clear, accurate, and helpful responses to user questions.",
            "llm_provider": "lm_studio",
            "llm_model": "llama-2-7b-chat",
            "temperature": "0.7",
            "max_tokens": 1000,
            "is_default": True
        },
        {
            "name": "Code Assistant",
            "description": "Specialized in programming and technical questions",
            "system_instructions": "You are a programming expert. You help users with code, debugging, and technical questions. Always provide clear, well-documented code examples.",
            "llm_provider": "lm_studio",
            "llm_model": "llama-2-7b-chat",
            "temperature": "0.3",
            "max_tokens": 1500,
            "is_default": False
        },
        {
            "name": "Creative Writer",
            "description": "Creative and imaginative writing assistant",
            "system_instructions": "You are a creative writing assistant. You help users with storytelling, creative writing, and imaginative content. Be creative, engaging, and inspiring.",
            "llm_provider": "lm_studio",
            "llm_model": "llama-2-7b-chat",
            "temperature": "0.9",
            "max_tokens": 2000,
            "is_default": False
        }
    ]
    
    for profile_data in profiles_data:
        existing_profile = db.query(Profile).filter(
            Profile.name == profile_data["name"],
            Profile.user_id == user.id
        ).first()
        
        if not existing_profile:
            profile = Profile(
                user_id=user.id,
                **profile_data
            )
            db.add(profile)
    
    db.commit()
    print("Database initialized with sample data")


def create_sample_session(db: Session, user_id: int, profile_id: int) -> ChatSession:
    """
    Create a sample chat session.
    
    Args:
        db: Database session
        user_id: User ID
        profile_id: Profile ID
        
    Returns:
        ChatSession: Created session
    """
    session = ChatSession(
        session_id=str(uuid.uuid4()),
        user_id=user_id,
        profile_id=profile_id,
        title="Sample Conversation",
        is_active=True
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session 