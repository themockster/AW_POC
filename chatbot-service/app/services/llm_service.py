"""
LLM Service for managing different language model providers.

This module provides a unified interface for interacting with different
LLM providers including LM Studio, Azure OpenAI, and other providers.
"""

import json
import time
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
import httpx
from pydantic import BaseModel
from app.config import get_settings
from app.models.profile import Profile

# Get settings
settings = get_settings()


class LLMRequest(BaseModel):
    """Request model for LLM calls."""
    
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    max_tokens: int = 1000
    system_instructions: Optional[str] = None


class LLMResponse(BaseModel):
    """Response model for LLM calls."""
    
    content: str
    tokens_used: Optional[int] = None
    response_time: Optional[float] = None
    provider: str
    model: Optional[str] = None


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    async def generate_response(self, request: LLMRequest) -> LLMResponse:
        """Generate a response from the LLM provider."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available."""
        pass


class LMStudioProvider(LLMProvider):
    """LM Studio LLM provider implementation."""
    
    def __init__(self):
        self.base_url = settings.llm.lm_studio_url
        self.timeout = settings.llm.lm_studio_timeout
    
    async def generate_response(self, request: LLMRequest) -> LLMResponse:
        """Generate response using LM Studio."""
        start_time = time.time()
        
        # Prepare messages
        messages = []
        if request.system_instructions:
            messages.append({
                "role": "system",
                "content": request.system_instructions
            })
        messages.extend(request.messages)
        
        # Prepare request payload
        payload = {
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                tokens_used = data.get("usage", {}).get("total_tokens")
                
                response_time = time.time() - start_time
                
                return LLMResponse(
                    content=content,
                    tokens_used=tokens_used,
                    response_time=response_time,
                    provider="lm_studio",
                    model=data.get("model")
                )
                
        except httpx.RequestError as e:
            raise Exception(f"LM Studio request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"LM Studio error: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if LM Studio is available."""
        try:
            response = httpx.get(f"{self.base_url}/v1/models", timeout=5)
            return response.status_code == 200
        except:
            return False


class AzureOpenAIProvider(LLMProvider):
    """Azure OpenAI LLM provider implementation."""
    
    def __init__(self):
        self.endpoint = settings.llm.azure_openai_endpoint
        self.api_key = settings.llm.azure_openai_api_key
        self.deployment = settings.llm.azure_openai_deployment
        
        if not all([self.endpoint, self.api_key, self.deployment]):
            raise ValueError("Azure OpenAI configuration incomplete")
    
    async def generate_response(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Azure OpenAI."""
        start_time = time.time()
        
        # Prepare messages
        messages = []
        if request.system_instructions:
            messages.append({
                "role": "system",
                "content": request.system_instructions
            })
        messages.extend(request.messages)
        
        # Prepare request payload
        payload = {
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
        
        headers = {
            "Content-Type": "application/json",
            "api-key": self.api_key
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.endpoint}/openai/deployments/{self.deployment}/chat/completions?api-version=2023-05-15",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                tokens_used = data.get("usage", {}).get("total_tokens")
                
                response_time = time.time() - start_time
                
                return LLMResponse(
                    content=content,
                    tokens_used=tokens_used,
                    response_time=response_time,
                    provider="azure_openai",
                    model=self.deployment
                )
                
        except httpx.RequestError as e:
            raise Exception(f"Azure OpenAI request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"Azure OpenAI error: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Azure OpenAI is available."""
        return bool(self.endpoint and self.api_key and self.deployment)


class LLMService:
    """Main LLM service that manages different providers."""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available LLM providers."""
        # Initialize LM Studio provider
        try:
            self.providers["lm_studio"] = LMStudioProvider()
        except Exception as e:
            print(f"Failed to initialize LM Studio provider: {e}")
        
        # Initialize Azure OpenAI provider
        try:
            self.providers["azure_openai"] = AzureOpenAIProvider()
        except Exception as e:
            print(f"Failed to initialize Azure OpenAI provider: {e}")
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        profile: Profile,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> LLMResponse:
        """
        Generate a response using the specified profile's LLM provider.
        
        Args:
            messages: List of message dictionaries
            profile: Profile containing LLM configuration
            temperature: Override temperature setting
            max_tokens: Override max tokens setting
            
        Returns:
            LLMResponse: Generated response
            
        Raises:
            Exception: If LLM generation fails
        """
        # Get provider
        provider_name = profile.llm_provider
        if provider_name not in self.providers:
            raise Exception(f"LLM provider '{provider_name}' not available")
        
        provider = self.providers[provider_name]
        
        # Check if provider is available
        if not provider.is_available():
            raise Exception(f"LLM provider '{provider_name}' is not available")
        
        # Prepare request
        request = LLMRequest(
            messages=messages,
            temperature=float(temperature or profile.temperature),
            max_tokens=max_tokens or profile.max_tokens,
            system_instructions=profile.system_instructions
        )
        
        # Generate response
        return await provider.generate_response(request)
    
    def get_available_providers(self) -> List[str]:
        """Get list of available LLM providers."""
        return [
            name for name, provider in self.providers.items()
            if provider.is_available()
        ]
    
    def is_provider_available(self, provider_name: str) -> bool:
        """Check if a specific provider is available."""
        if provider_name not in self.providers:
            return False
        return self.providers[provider_name].is_available() 