"""
Chat router for message handling and conversation management.

This module provides endpoints for sending messages, retrieving chat history,
and managing chat sessions.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile
from app.models.session import Session as ChatSession
from app.models.message import Message
from app.services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()


class MessageRequest(BaseModel):
    """Message request model."""
    content: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    profile_id: Optional[int] = None


class SimpleMessageRequest(BaseModel):
    """Simple message request model for testing."""
    message: str = Field(..., min_length=1, max_length=4000)
    profile: Optional[str] = "default"
    system_prompt: Optional[str] = "You are a helpful AI assistant."
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7


class SimpleMessageResponse(BaseModel):
    """Simple message response model for testing."""
    response: str
    status: str = "success"


class MessageResponse(BaseModel):
    """Message response model."""
    message_id: str
    content: str
    role: str
    timestamp: datetime
    tokens_used: Optional[int] = None
    response_time: Optional[float] = None


class ChatHistoryResponse(BaseModel):
    """Chat history response model."""
    session_id: str
    title: str
    messages: List[MessageResponse]
    created_at: datetime
    last_activity: datetime


class SessionResponse(BaseModel):
    """Session response model."""
    session_id: str
    title: str
    is_active: bool
    created_at: datetime
    last_activity: datetime
    profile_id: int


@router.post("/send", response_model=SimpleMessageResponse)
async def send_message_simple(request: SimpleMessageRequest):
    """
    Simple message endpoint for testing without authentication.
    
    Args:
        request: Simple message request
        
    Returns:
        SimpleMessageResponse: AI response message
    """
    try:
        # Prepare messages for LLM service
        messages = [{"role": "user", "content": request.message}]
        
        # Create a simple profile for testing
        from app.models.profile import Profile
        test_profile = Profile(
            id=1,
            name=request.profile,
            system_instructions=request.system_prompt,
            llm_provider="lm_studio",
            user_id=1
        )
        
        # Use LLM service to generate response
        llm_response = await llm_service.generate_response(
            messages=messages,
            profile=test_profile,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return SimpleMessageResponse(
            response=llm_response.content,
            status="success"
        )
    except Exception as e:
        return SimpleMessageResponse(
            response=f"Erreur: {str(e)}",
            status="error"
        )


@router.post("/send-auth", response_model=MessageResponse)
async def send_message(
    request: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message and get AI response.
    
    Args:
        request: Message request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        MessageResponse: AI response message
        
    Raises:
        HTTPException: If message processing fails
    """
    try:
        # Get or create session
        if request.session_id:
            session = db.query(ChatSession).filter(
                ChatSession.session_id == request.session_id,
                ChatSession.user_id == current_user.id
            ).first()
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )
        else:
            # Get default profile if no profile specified
            if not request.profile_id:
                profile = db.query(Profile).filter(
                    Profile.user_id == current_user.id,
                    Profile.is_default == True
                ).first()
                if not profile:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No default profile found"
                    )
                request.profile_id = profile.id
            
            # Create new session
            session = ChatSession(
                session_id=str(uuid.uuid4()),
                user_id=current_user.id,
                profile_id=request.profile_id,
                title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                is_active=True
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        
        # Get profile
        profile = db.query(Profile).filter(
            Profile.id == session.profile_id,
            Profile.user_id == current_user.id
        ).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Save user message
        user_message = Message(
            message_id=str(uuid.uuid4()),
            content=request.content,
            role="user",
            is_user_message=True,
            user_id=current_user.id,
            session_id=session.id,
            profile_id=profile.id
        )
        db.add(user_message)
        db.commit()
        
        # Get chat history for context
        history_messages = db.query(Message).filter(
            Message.session_id == session.id
        ).order_by(Message.created_at).all()
        
        # Prepare messages for LLM
        messages = []
        for msg in history_messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Generate AI response
        llm_response = await llm_service.generate_response(
            messages=messages,
            profile=profile
        )
        
        # Save AI response
        ai_message = Message(
            message_id=str(uuid.uuid4()),
            content=llm_response.content,
            role="assistant",
            is_user_message=False,
            tokens_used=llm_response.tokens_used,
            response_time=str(llm_response.response_time) if llm_response.response_time else None,
            user_id=current_user.id,
            session_id=session.id,
            profile_id=profile.id
        )
        db.add(ai_message)
        
        # Update session last activity
        session.last_activity = datetime.utcnow()
        
        db.commit()
        db.refresh(ai_message)
        
        return MessageResponse(
            message_id=ai_message.message_id,
            content=ai_message.content,
            role=ai_message.role,
            timestamp=ai_message.created_at,
            tokens_used=ai_message.tokens_used,
            response_time=float(ai_message.response_time) if ai_message.response_time else None
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's chat sessions.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List[SessionResponse]: List of user's sessions
    """
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.last_activity.desc()).all()
    
    return [
        SessionResponse(
            session_id=session.session_id,
            title=session.title,
            is_active=session.is_active,
            created_at=session.created_at,
            last_activity=session.last_activity,
            profile_id=session.profile_id
        )
        for session in sessions
    ]


@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get chat history for a specific session.
    
    Args:
        session_id: Session ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ChatHistoryResponse: Chat history with messages
        
    Raises:
        HTTPException: If session not found
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    messages = db.query(Message).filter(
        Message.session_id == session.id
    ).order_by(Message.created_at).all()
    
    return ChatHistoryResponse(
        session_id=session.session_id,
        title=session.title,
        messages=[
            MessageResponse(
                message_id=msg.message_id,
                content=msg.content,
                role=msg.role,
                timestamp=msg.created_at,
                tokens_used=msg.tokens_used,
                response_time=float(msg.response_time) if msg.response_time else None
            )
            for msg in messages
        ],
        created_at=session.created_at,
        last_activity=session.last_activity
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a chat session.
    
    Args:
        session_id: Session ID
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: If session not found
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db.delete(session)
    db.commit()
    
    return {"message": "Session deleted successfully"} 