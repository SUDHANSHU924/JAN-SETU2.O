from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

# Simple in-memory connection store mapping officer_id -> WebSocket
active_connections: Dict[str, WebSocket] = {}


@router.websocket("/ws/officer/{officer_id}")
async def officer_ws(websocket: WebSocket, officer_id: str):
    """Accept a WebSocket connection for a given officer_id and store it.

    This is a backend-only placeholder for real-time notifications. It keeps
    the connection alive and removes it on disconnect.
    """
    await websocket.accept()
    active_connections[officer_id] = websocket
    try:
        while True:
            # Keep the connection alive by receiving messages; ignore content
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Remove on disconnect
        if officer_id in active_connections:
            del active_connections[officer_id]


async def notify_officer(officer_id: str, message: dict) -> bool:
    """Send a JSON message to the officer if connected.

    Returns True if the officer was connected and the message was sent,
    otherwise False.
    """
    ws = active_connections.get(officer_id)
    if ws is None:
        return False
    try:
        await ws.send_json(message)
        return True
    except Exception:
        # If send fails, remove connection and return False
        if officer_id in active_connections:
            del active_connections[officer_id]
        return False
