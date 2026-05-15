"""
User/Citizen Portal API Routes

This router handles all endpoints for the citizen/user-facing application.
Includes endpoints for:
- Viewing grievances
- Filing new grievances
- Tracking grievance status
- User profile management

Protected routes will use role-based access control (RBAC) with USER role.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def user_health_check():
    """
    Health check endpoint for user portal API.
    
    Returns:
        dict: Status message confirming the user API is running.
    """
    return {"message": "User portal API is running"}


# TODO: Add user endpoints
# - GET /grievances -> List user's grievances
# - POST /grievances -> File new grievance
# - GET /grievances/{id} -> Get grievance details
# - PATCH /grievances/{id} -> Update grievance
# - GET /profile -> Get user profile
# - PUT /profile -> Update user profile
