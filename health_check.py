#!/usr/bin/env python3
"""
JanSetu System Health Check

This script verifies that all components are properly configured and ready to run.
Run this before starting the application.
"""

import os
import sys
import json
from pathlib import Path

def check_backend_env():
    """Check backend environment variables."""
    print("\n[BACKEND] Checking environment...")
    backend_env = Path("/workspaces/JANSETU/backend/.env")
    
    if not backend_env.exists():
        print("  ❌ backend/.env not found")
        return False
    
    with open(backend_env) as f:
        env_content = f.read()
    
    required_vars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY", "JWT_SECRET"]
    found_vars = []
    
    for var in required_vars:
        if var in env_content and f"{var}=" in env_content:
            found_vars.append(var)
            print(f"  ✅ {var}: Present")
        else:
            print(f"  ❌ {var}: Missing or empty")
    
    return len(found_vars) == len(required_vars)


def check_frontend_env():
    """Check frontend environment configuration."""
    print("\n[FRONTEND] Checking environment...")
    frontend_env = Path("/workspaces/JANSETU/frontend/.env.local")
    
    if not frontend_env.exists():
        print("  ⚠️  .env.local missing - creating with defaults...")
        frontend_env.write_text("VITE_API_BASE_URL=http://localhost:8000\nVITE_SUPABASE_URL=https://apxaknwrsemylziyxbpj.supabase.co\n")
        print("  ✅ Created frontend/.env.local")
        return True
    
    with open(frontend_env) as f:
        env_content = f.read()
        if "VITE_API_BASE_URL" in env_content:
            print("  ✅ VITE_API_BASE_URL: Configured")
            return True
        else:
            print("  ❌ VITE_API_BASE_URL: Missing")
            return False


def check_backend_structure():
    """Check that backend has required files."""
    print("\n[BACKEND STRUCTURE] Verifying...")
    backend_path = Path("/workspaces/JANSETU/backend/app")
    
    required_files = [
        "main.py",
        "config.py",
        "api/auth.py",
        "api/complaints.py",
        "api/locations.py",
        "db/supabase_client.py",
    ]
    
    all_exist = True
    for file in required_files:
        full_path = backend_path / file
        if full_path.exists():
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file}: Missing")
            all_exist = False
    
    return all_exist


def check_frontend_structure():
    """Check that frontend has required files."""
    print("\n[FRONTEND STRUCTURE] Verifying...")
    frontend_path = Path("/workspaces/JANSETU/frontend/src")
    
    required_dirs = [
        "apps/citizen",
        "apps/officer",
        "services",
        "store",
    ]
    
    all_exist = True
    for dir_name in required_dirs:
        full_path = frontend_path / dir_name
        if full_path.exists():
            print(f"  ✅ {dir_name}/")
        else:
            print(f"  ❌ {dir_name}/: Missing")
            all_exist = False
    
    return all_exist


def check_api_routes():
    """Check that critical API routes are defined."""
    print("\n[API ROUTES] Verifying...")
    
    backend_main = Path("/workspaces/JANSETU/backend/app/main.py")
    auth_routes = Path("/workspaces/JANSETU/backend/app/api/auth.py")
    
    with open(backend_main) as f:
        main_content = f.read()
    
    with open(auth_routes) as f:
        auth_content = f.read()
    
    checks = [
        ("CORS configured", "CORSMiddleware" in main_content),
        ("auth.router included", "auth.router" in main_content),
        ("auth.router_v1 included", "auth.router_v1" in main_content),
        ("officer-login endpoint", "officer_login_v1" in auth_content),
    ]
    
    all_ok = True
    for check_name, result in checks:
        if result:
            print(f"  ✅ {check_name}")
        else:
            print(f"  ❌ {check_name}")
            all_ok = False
    
    return all_ok


def print_summary(all_checks):
    """Print final summary."""
    print("\n" + "="*60)
    print("JANSETU HEALTH CHECK SUMMARY")
    print("="*60)
    
    if all(all_checks.values()):
        print("\n✅ All checks passed! System is ready to run.")
        print("\nTo start the system:")
        print("  1. On Replit: Click the 'Run' button (uses .replit configuration)")
        print("  2. Manually: Open 3 terminals:")
        print("     Terminal 1: cd backend && python -m uvicorn app.main:app --reload --port 8000")
        print("     Terminal 2: cd frontend && npm run dev")
        print("     Terminal 3: cd services/ai-engine && python main.py (optional)")
        print("\nTest credentials:")
        print("  Citizen:  9000000002 / Citizen@123")
        print("  Officer:  9876543210 / Commander@123")
        print("  Admin:    9000000001 / Admin@123")
        return True
    else:
        print("\n❌ Some checks failed. Please fix the issues above.")
        failed = [k for k, v in all_checks.items() if not v]
        print(f"\nFailed checks: {', '.join(failed)}")
        return False


def main():
    print("\n" + "="*60)
    print("🔍  JANSETU SYSTEM HEALTH CHECK")
    print("="*60)
    
    checks = {
        "backend_env": check_backend_env(),
        "frontend_env": check_frontend_env(),
        "backend_structure": check_backend_structure(),
        "frontend_structure": check_frontend_structure(),
        "api_routes": check_api_routes(),
    }
    
    success = print_summary(checks)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
