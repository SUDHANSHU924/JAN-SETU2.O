"""SMS notification service with Twilio integration (ready to switch from mock)."""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

# Read Twilio credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "").strip()

# Enable Twilio only if all credentials are present
TWILIO_ENABLED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER)

if not TWILIO_ENABLED:
    logger.warning(
        "Twilio credentials not fully configured. SMS will run in mock mode. "
        "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to enable real SMS."
    )


async def send_sms(to_number: str, message: str) -> dict:
    """
    Send an SMS message via Twilio or mock response if not configured.
    
    Args:
        to_number: Recipient phone number (E.164 format recommended, e.g., "+91XXXXXXXXXX")
        message: SMS message body (max 160 characters recommended)
    
    Returns:
        dict: {"success": True, "sid": "message_sid"} or {"success": True, "mock": True}
              or {"success": False, "error": "error_message"}
    """
    if not TWILIO_ENABLED:
        # Mock mode: log the message instead of sending
        logger.info(f"[SMS MOCK] To: {to_number} | Message: {message}")
        return {"success": True, "mock": True}
    
    try:
        # Real Twilio API call
        async with httpx.AsyncClient() as client:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
            payload = {
                "To": to_number,
                "From": TWILIO_FROM_NUMBER,
                "Body": message,
            }
            
            response = await client.post(
                url,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                data=payload,
            )
            
            if response.status_code in (200, 201):
                # Extract MessageSid from response JSON
                response_data = response.json()
                message_sid = response_data.get("sid")
                logger.info(f"SMS sent successfully to {to_number} (SID: {message_sid})")
                return {"success": True, "sid": message_sid}
            else:
                error_msg = f"Twilio API returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}
    
    except Exception as e:
        logger.error(f"Failed to send SMS to {to_number}: {str(e)}")
        return {"success": False, "error": str(e)}


async def notify_citizen_complaint_accepted(
    to_number: str, token: str, sla_days: float
) -> dict:
    """
    Send SMS notification to citizen when complaint is accepted.
    
    Args:
        to_number: Citizen phone number
        token: Complaint tracking token (e.g., "JS-WTR-WARD05-2026-4421")
        sla_days: SLA resolution time in days
    
    Returns:
        dict: Result of send_sms operation
    """
    message = (
        f"Your complaint {token} has been accepted. "
        f"Expected resolution: {sla_days} days. "
        f"Track at grievance-portal.gov.in"
    )
    return await send_sms(to_number, message)


if __name__ == "__main__":
    # Self-test: verify mock mode works
    import asyncio
    
    async def test():
        print("Testing SMS service in mock mode...")
        result = await send_sms("+919876543210", "Test message")
        print(f"send_sms result: {result}")
        assert result["success"] and result.get("mock"), "Mock SMS should succeed with mock=True"
        
        result2 = await notify_citizen_complaint_accepted(
            "+919876543210", "JS-WTR-WARD05-2026-4421", 3.0
        )
        print(f"notify_citizen_complaint_accepted result: {result2}")
        assert result2["success"] and result2.get("mock"), "Notification should succeed in mock mode"
        
        print("sms_service.py self-test passed")
    
    asyncio.run(test())
