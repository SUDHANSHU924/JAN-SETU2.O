"""
Grievance Backend Application

This is a shared backend serving two frontend applications:
1. User/Citizen web app
2. Authority/Admin dashboard web app

Routes are organized by client type:
- /api/user -> User/Citizen facing endpoints
- /api/authority -> Authority/Admin facing endpoints

Role-based access control (RBAC) will be implemented for USER, AUTHORITY, and ADMIN roles.
"""
