"""
API routers for the Chatbot Service.

This module contains all the FastAPI routers for different
API endpoints including authentication, chat, profiles, and health checks.
"""

from . import auth, health

__all__ = [
    "auth",
    "health"
] 