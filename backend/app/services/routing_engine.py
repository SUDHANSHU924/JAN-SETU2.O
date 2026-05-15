"""Main routing pipeline that processes classified grievances end-to-end."""

from datetime import datetime


async def run_routing_engine(grievance_id: str, data: dict) -> dict:
    """
    Complete end-to-end grievance routing pipeline.
    
    Takes a classified grievance (with AI category, priority, sentiment)
    and routes it through:
    - GPS → Ward mapping
    - Tracking token generation
    - SLA calculation
    - Officer assignment
    - Packet assembly
    - Supabase persistence
    - WebSocket dispatch to officer
    - SMS notification to citizen
    
    Each step is wrapped in try/except so failures don't block subsequent steps.
    
    Args:
        grievance_id: UUID string from Supabase
        data: Grievance data dict with keys:
            - description, category, priority, sentiment
            - citizen_name, citizen_phone
            - lat, lng
            - media_urls (list)
            - auth_score (float, optional)
    
    Returns:
        dict: Complete assembled grievance packet
    """
    packet = {}
    
    # Step 1 — Get ward from GPS coordinates
    print(f"[ROUTING ENGINE] Processing grievance {grievance_id}")
    print("[STEP 1] Getting ward from GPS coordinates...")
    try:
        from app.services.geo_mapper import get_ward_from_coordinates, get_zone_room
        
        ward = get_ward_from_coordinates(data.get("lat", 0), data.get("lng", 0))
        zone_room = get_zone_room(ward)
        print(f"  ✓ Ward: {ward}, Room: {zone_room}")
    except Exception as e:
        print(f"  ✗ Failed to map GPS to ward: {str(e)}")
        ward = "Ward 00 - General Zone"
        zone_room = "zone:general"
    
    # Step 2 — Generate tracking token
    print("[STEP 2] Generating tracking token...")
    try:
        from app.services.token_generator import generate_tracking_token
        
        token = generate_tracking_token(data.get("category", "General"), ward)
        print(f"  ✓ Token: {token}")
    except Exception as e:
        print(f"  ✗ Failed to generate token: {str(e)}")
        token = f"FALLBACK-{grievance_id[:8]}"
    
    # Step 3 — Calculate SLA
    print("[STEP 3] Calculating SLA deadline...")
    try:
        from app.services.sla_service import calculate_sla, calculate_sla_deadline
        
        sla_days = calculate_sla(data.get("category", "General"), data.get("priority", "MEDIUM"))
        sla_deadline = calculate_sla_deadline(data.get("category", "General"), data.get("priority", "MEDIUM"))
        print(f"  ✓ SLA: {sla_days} days, Deadline: {sla_deadline.isoformat()}")
    except Exception as e:
        print(f"  ✗ Failed to calculate SLA: {str(e)}")
        sla_days = 10.0
        sla_deadline = datetime.utcnow()
    
    # Step 4 — Assign officer
    print("[STEP 4] Assigning least-loaded officer...")
    try:
        from app.services.officer_service import assign_least_loaded_officer
        
        officer_id = await assign_least_loaded_officer(data.get("category", "General"), ward)
        print(f"  ✓ Assigned to: {officer_id}")
    except Exception as e:
        print(f"  ✗ Failed to assign officer: {str(e)}")
        officer_id = None
    
    # Step 5 — Assemble complete packet
    print("[STEP 5] Assembling grievance packet...")
    try:
        packet = {
            "tracking_token": token,
            "citizen": {
                "name": data.get("citizen_name", "Unknown"),
                "phone": data.get("citizen_phone", ""),
                "trust_level": "trusted" if data.get("auth_score", 0) > 70 else "new"
            },
            "complaint": {
                "text": data.get("description", ""),
                "category": data.get("category", "General"),
                "priority": data.get("priority", "MEDIUM"),
                "sentiment": data.get("sentiment", "Neutral"),
                "media_urls": data.get("media_urls", [])
            },
            "auth_score": data.get("auth_score", 0.0),
            "sla_days": sla_days,
            "sla_deadline": sla_deadline.isoformat(),
            "location": {
                "ward": ward,
                "zone_room": zone_room,
                "lat": data.get("lat"),
                "lng": data.get("lng")
            },
            "assigned_officer": officer_id,
            "status": "routed"
        }
        print(f"  ✓ Packet assembled (token={token}, officer={officer_id})")
    except Exception as e:
        print(f"  ✗ Failed to assemble packet: {str(e)}")
        packet = {"error": str(e), "grievance_id": grievance_id}
    
    # Step 6 — Save to Supabase
    print("[STEP 6] Persisting to Supabase...")
    try:
        from app.db.supabase_client import supabase
        
        update_payload = {
            "tracking_token": packet["tracking_token"],
            "category": packet["complaint"]["category"],
            "priority": packet["complaint"]["priority"].lower(),
            "status": "assigned" if packet.get("assigned_officer") else "submitted",
            "sla_days": packet["sla_days"],
            "sla_deadline": packet["sla_deadline"],
            "auth_score": packet["auth_score"],
        }
        assigned_officer = packet.get("assigned_officer")
        if assigned_officer:
            update_payload["officer_id"] = assigned_officer
        supabase.table("complaints").update(update_payload).eq("complaint_id", grievance_id).execute()
        print(f"  ✓ Complaint {grievance_id} updated in Supabase")
    except Exception as e:
        print(f"  ✗ Failed to save to Supabase: {str(e)}")
    
    # Step 7 — WebSocket dispatch to officer
    print("[STEP 7] Dispatching to officer via WebSocket...")
    try:
        from app.api.ws import notify_officer
        
        dispatch_result = await notify_officer(
            officer_id,
            {"event": "complaint:new", "data": packet}
        )
        print(f"  ✓ WebSocket notification sent (result: {dispatch_result})")
    except Exception as e:
        print(f"  ✗ Failed to dispatch via WebSocket: {str(e)}")
    
    # Step 8 — SMS notification to citizen
    print("[STEP 8] Sending SMS notification to citizen...")
    try:
        from app.services.sms_service import notify_citizen_complaint_accepted
        
        sms_result = await notify_citizen_complaint_accepted(
            data.get("citizen_phone", ""),
            token,
            sla_days
        )
        print(f"  ✓ SMS sent (result: {sms_result})")
    except Exception as e:
        print(f"  ✗ Failed to send SMS: {str(e)}")
    
    # Step 9 — Return assembled packet
    print(f"[ROUTING ENGINE] Completed for grievance {grievance_id}\n")
    return packet


if __name__ == "__main__":
    # Self-test: verify structure works (mock data)
    import asyncio
    
    async def test():
        print("Testing routing engine with mock data...\n")
        
        mock_data = {
            "description": "Pothole on Main Street",
            "category": "Roads",
            "priority": "HIGH",
            "sentiment": "Angry",
            "citizen_name": "Raj Kumar",
            "citizen_phone": "+919876543210",
            "lat": 19.12,
            "lng": 72.85,
            "media_urls": ["https://example.com/photo1.jpg"],
            "auth_score": 75.0
        }
        
        # Use a test UUID string
        result = await run_routing_engine("550e8400-e29b-41d4-a716-446655440000", mock_data)
        
        print("\n=== Final Packet ===")
        import json
        print(json.dumps(result, indent=2, default=str))
        
        # Verify key fields
        assert "tracking_token" in result, "Missing tracking_token"
        assert "citizen" in result, "Missing citizen"
        assert "complaint" in result, "Missing complaint"
        assert "assigned_officer" in result, "Missing assigned_officer"
        assert result["status"] == "routed", "Status should be 'routed'"
        
        print("\nrouting_engine.py self-test passed")
    
    asyncio.run(test())
