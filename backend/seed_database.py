#!/usr/bin/env python3
"""
Seed JanSetu test data into Supabase database.

Run this script to ensure test users and sample data exist for development.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend directory to Python path so we can import app modules
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
env_file = backend_dir / ".env"
if env_file.exists():
    import dotenv
    dotenv.load_dotenv(env_file)

from app.db.supabase_client import supabase
from app.db.local_store import get_store_data


async def seed_database():
    """Seed all tables with test data."""
    
    print("[SEED] Starting database seeding...")
    
    try:
        # Get seed data
        store = get_store_data()
        
        # 1. Seed Users
        print("\n[USERS] Checking users table...")
        existing_users = supabase.table("users").select("phone").execute()
        existing_phones = {u.get("phone") for u in (existing_users.data or [])}
        
        users_to_add = []
        for user in store.get("users", []):
            if user.get("phone") not in existing_phones:
                # Remove fields that might not exist in the Supabase schema
                user_data = {
                    "phone": user.get("phone"),
                    "email": user.get("email"),
                    "name": user.get("name"),
                    "password_hash": user.get("password_hash"),
                    "role": user.get("role"),
                    "trust_score": user.get("trust_score"),
                    "trust_level": user.get("trust_level"),
                    "is_verified": user.get("is_verified"),
                    "created_at": user.get("created_at"),
                }
                # Only add ward_id if it's set
                if user.get("assigned_ward_id"):
                    user_data["ward_id"] = user.get("assigned_ward_id")
                
                users_to_add.append(user_data)
                print(f"  → Will add: {user.get('name')} ({user.get('phone')})")
        
        if users_to_add:
            result = supabase.table("users").insert(users_to_add).execute()
            print(f"  ✅ Added {len(result.data or [])} users")
        else:
            print(f"  ℹ️  All {len(existing_phones)} test users already exist")
        
        # 2. Seed Locations (States, Districts, Areas, Wards)
        print("\n[LOCATIONS] Seeding location hierarchy...")
        
        location_tables = [
            ("states", "state_id", store.get("states", [])),
            ("districts", "district_id", store.get("districts", [])),
            ("areas", "area_id", store.get("areas", [])),
            ("wards", "ward_id", store.get("wards", [])),
        ]
        
        for table_name, pk_col, table_data in location_tables:
            try:
                existing = supabase.table(table_name).select(pk_col).limit(1).execute()
                if not existing.data:
                    result = supabase.table(table_name).insert(table_data).execute()
                    print(f"  ✅ {table_name}: Added {len(result.data or [])} records")
                else:
                    print(f"  ℹ️  {table_name}: Already has data")
            except Exception as e:
                print(f"  ⚠️  {table_name}: Skipped - {str(e)[:60]}")
        
        # 3. Seed Complaints
        print("\n[COMPLAINTS] Checking complaints table...")
        existing_complaints = supabase.table("complaints").select("complaint_id").execute()
        existing_ids = {c.get("complaint_id") for c in (existing_complaints.data or [])}
        
        complaints_to_add = []
        for complaint in store.get("complaints", []):
            if complaint.get("complaint_id") not in existing_ids:
                # Only include essential complaint fields
                complaint_data = {
                    "complaint_id": complaint.get("complaint_id"),
                    "tracking_token": complaint.get("tracking_token"),
                    "text_original": complaint.get("text_original"),
                    "category": complaint.get("category"),
                    "status": complaint.get("status"),
                    "priority": complaint.get("priority"),
                    "citizen_id": complaint.get("citizen_id"),
                    "citizen_name": complaint.get("citizen_name"),
                    "citizen_phone": complaint.get("citizen_phone"),
                    "gps_latitude": complaint.get("gps_latitude"),
                    "gps_longitude": complaint.get("gps_longitude"),
                    "address": complaint.get("address"),
                    "created_at": complaint.get("created_at"),
                }
                complaints_to_add.append(complaint_data)
                print(f"  → Will add complaint: {complaint.get('tracking_token')}")
        
        if complaints_to_add:
            try:
                result = supabase.table("complaints").insert(complaints_to_add).execute()
                print(f"  ✅ Added {len(result.data or [])} complaints")
            except Exception as e:
                print(f"  ⚠️  Complaints: Skipped - {str(e)[:80]}")
        else:
            print(f"  ℹ️  All test complaints already exist")
        
        # 4. Seed Officer Profiles
        print("\n[OFFICERS] Checking officer_profiles table...")
        existing_officers = supabase.table("officer_profiles").select("officer_id").execute()
        existing_officer_ids = {o.get("officer_id") for o in (existing_officers.data or [])}
        
        # Create officer profiles from users with role='officer'
        officers_to_add = []
        for user in store.get("users", []):
            if user.get("role") in ("officer", "admin") and user.get("user_id") not in existing_officer_ids:
                officer_profile = {
                    "officer_id": user.get("user_id"),
                    "user_id": user.get("user_id"),
                    "phone": user.get("phone"),
                    "name": user.get("name"),
                    "designation": "Senior Officer" if user.get("role") == "admin" else "Officer",
                    "state_id": 1,
                    "district_id": 1,
                    "area_id": 1,
                }
                if user.get("assigned_ward_id"):
                    officer_profile["ward_id"] = user.get("assigned_ward_id")
                
                officers_to_add.append(officer_profile)
                print(f"  → Will add officer: {user.get('name')}")
        
        if officers_to_add:
            try:
                result = supabase.table("officer_profiles").insert(officers_to_add).execute()
                print(f"  ✅ Added {len(result.data or [])} officer profiles")
            except Exception as e:
                print(f"  ⚠️  Officer profiles: Skipped - {str(e)[:80]}")
        else:
            print(f"  ℹ️  Officer profiles already exist")
        
        print("\n[SEED] ✅ Database seeding completed!")
        print("\n[TEST CREDENTIALS]")
        print("  Citizen:  9000000002 / Citizen@123")
        print("  Officer:  9876543210 / Commander@123")
        print("  Admin:    9000000001 / Admin@123")
        
        return True
        
    except Exception as e:
        print(f"\n[SEED] ❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main entry point."""
    print("="*60)
    print("🌱  JANSETU DATABASE SEEDING")
    print("="*60)
    
    result = asyncio.run(seed_database())
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
