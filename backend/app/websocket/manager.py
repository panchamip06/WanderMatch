import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Per-trip in-memory WebSocket connection and broadcast manager.
    Can be swapped for Redis-backed pub/sub in multi-instance scaling.
    """
    def __init__(self):
        # Maps trip_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Maps trip_id -> set of active user_ids
        self.trip_presence: Dict[str, Set[str]] = {}

    async def connect(self, trip_id: str, websocket: WebSocket, user_id: Optional[str] = None) -> None:
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = set()
            self.trip_presence[trip_id] = set()

        self.active_connections[trip_id].add(websocket)
        if user_id:
            self.trip_presence[trip_id].add(user_id)
            await self.broadcast(trip_id, {
                "type": "presence_update",
                "trip_id": trip_id,
                "active_users": list(self.trip_presence[trip_id]),
                "joined_user": user_id,
            })
        logger.info(f"WebSocket connected for trip {trip_id}. Total: {len(self.active_connections[trip_id])}")

    async def disconnect(self, trip_id: str, websocket: WebSocket, user_id: Optional[str] = None) -> None:
        if trip_id in self.active_connections:
            self.active_connections[trip_id].discard(websocket)
            if not self.active_connections[trip_id]:
                del self.active_connections[trip_id]

        if trip_id in self.trip_presence and user_id:
            self.trip_presence[trip_id].discard(user_id)
            await self.broadcast(trip_id, {
                "type": "presence_update",
                "trip_id": trip_id,
                "active_users": list(self.trip_presence.get(trip_id, [])),
                "left_user": user_id,
            })
        logger.info(f"WebSocket disconnected for trip {trip_id}.")

    async def broadcast(self, trip_id: str, message: Dict[str, Any]) -> None:
        """Broadcast a structured JSON event to all connected clients on this trip channel."""
        if trip_id not in self.active_connections:
            return

        dead_connections = set()
        payload = json.dumps(message)
        for connection in self.active_connections[trip_id]:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections[trip_id].discard(dead)

# Global singleton
ws_manager = ConnectionManager()
