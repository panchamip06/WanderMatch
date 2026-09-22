import json
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.app.websocket.manager import ws_manager

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/trips/{trip_id}")
async def trip_websocket_endpoint(
    websocket: WebSocket,
    trip_id: str,
    user_id: Optional[str] = Query(None)
):
    """
    Live real-time WebSocket channel for a specific trip.
    Transports proposal updates, vote events, chat, consensus states, and presence.
    """
    await ws_manager.connect(trip_id, websocket, user_id=user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Clients can send ping or chat messages over websocket
            try:
                msg = json.loads(data)
                # Echo/broadcast incoming client events (e.g. typing, instant chat)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                else:
                    await ws_manager.broadcast(trip_id, msg)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(trip_id, websocket, user_id=user_id)
