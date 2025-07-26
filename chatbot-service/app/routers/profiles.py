"""
Profiles router for managing chatbot personalities and configurations.

This module provides endpoints for creating, updating, and managing
chatbot profiles with different personalities and system instructions.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile

router = APIRouter()


class ProfileCreate(BaseModel):
    """Profile creation model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    system_instructions: str = Field(..., min_length=1)
    llm_provider: str = Field(default="lm_studio")
    llm_model: Optional[str] = None
    temperature: str = Field(default="0.7")
    max_tokens: int = Field(default=1000, ge=1, le=4000)
    is_default: bool = Field(default=False)


class ProfileUpdate(BaseModel):
    """Profile update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    system_instructions: Optional[str] = Field(None, min_length=1)
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[str] = None
    max_tokens: Optional[int] = Field(None, ge=1, le=4000)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class ProfileResponse(BaseModel):
    """Profile response model."""
    id: int
    name: str
    description: Optional[str]
    system_instructions: str
    llm_provider: str
    llm_model: Optional[str]
    temperature: str
    max_tokens: int
    is_default: bool
    is_active: bool
    created_at: str
    updated_at: str


@router.post("/", response_model=ProfileResponse)
async def create_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new chatbot profile.
    
    Args:
        profile_data: Profile creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProfileResponse: Created profile
        
    Raises:
        HTTPException: If profile creation fails
    """
    # Check if profile name already exists for this user
    existing_profile = db.query(Profile).filter(
        Profile.name == profile_data.name,
        Profile.user_id == current_user.id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile name already exists"
        )
    
    # If this is set as default, unset other defaults
    if profile_data.is_default:
        db.query(Profile).filter(
            Profile.user_id == current_user.id,
            Profile.is_default == True
        ).update({"is_default": False})
    
    # Create new profile
    profile = Profile(
        user_id=current_user.id,
        **profile_data.dict()
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse(
        id=profile.id,
        name=profile.name,
        description=profile.description,
        system_instructions=profile.system_instructions,
        llm_provider=profile.llm_provider,
        llm_model=profile.llm_model,
        temperature=profile.temperature,
        max_tokens=profile.max_tokens,
        is_default=profile.is_default,
        is_active=profile.is_active,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat()
    )


@router.get("/", response_model=List[ProfileResponse])
async def get_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all profiles for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List[ProfileResponse]: List of user's profiles
    """
    profiles = db.query(Profile).filter(
        Profile.user_id == current_user.id
    ).order_by(Profile.is_default.desc(), Profile.name).all()
    
    return [
        ProfileResponse(
            id=profile.id,
            name=profile.name,
            description=profile.description,
            system_instructions=profile.system_instructions,
            llm_provider=profile.llm_provider,
            llm_model=profile.llm_model,
            temperature=profile.temperature,
            max_tokens=profile.max_tokens,
            is_default=profile.is_default,
            is_active=profile.is_active,
            created_at=profile.created_at.isoformat(),
            updated_at=profile.updated_at.isoformat()
        )
        for profile in profiles
    ]


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific profile by ID.
    
    Args:
        profile_id: Profile ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProfileResponse: Profile details
        
    Raises:
        HTTPException: If profile not found
    """
    profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ProfileResponse(
        id=profile.id,
        name=profile.name,
        description=profile.description,
        system_instructions=profile.system_instructions,
        llm_provider=profile.llm_provider,
        llm_model=profile.llm_model,
        temperature=profile.temperature,
        max_tokens=profile.max_tokens,
        is_default=profile.is_default,
        is_active=profile.is_active,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat()
    )


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: int,
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a profile.
    
    Args:
        profile_id: Profile ID
        profile_data: Profile update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        ProfileResponse: Updated profile
        
    Raises:
        HTTPException: If profile not found or update fails
    """
    profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Check if name change conflicts with existing profile
    if profile_data.name and profile_data.name != profile.name:
        existing_profile = db.query(Profile).filter(
            Profile.name == profile_data.name,
            Profile.user_id == current_user.id,
            Profile.id != profile_id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile name already exists"
            )
    
    # If setting as default, unset other defaults
    if profile_data.is_default:
        db.query(Profile).filter(
            Profile.user_id == current_user.id,
            Profile.is_default == True,
            Profile.id != profile_id
        ).update({"is_default": False})
    
    # Update profile fields
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse(
        id=profile.id,
        name=profile.name,
        description=profile.description,
        system_instructions=profile.system_instructions,
        llm_provider=profile.llm_provider,
        llm_model=profile.llm_model,
        temperature=profile.temperature,
        max_tokens=profile.max_tokens,
        is_default=profile.is_default,
        is_active=profile.is_active,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat()
    )


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a profile.
    
    Args:
        profile_id: Profile ID
        current_user: Current authenticated user
        db: Database session
        
    Raises:
        HTTPException: If profile not found
    """
    profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Don't allow deletion of the last profile
    profile_count = db.query(Profile).filter(
        Profile.user_id == current_user.id
    ).count()
    
    if profile_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last profile"
        )
    
    db.delete(profile)
    db.commit()
    
    return {"message": "Profile deleted successfully"} 