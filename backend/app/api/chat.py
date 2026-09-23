"""
Phase 5 — Trip Chat API endpoints.

Design §6 (trip_chat_messages), §5A (unanimous Trip Chat override):

  POST /api/trips/{trip_id}/chat  — send message; broadcast chat_message
  GET  /api/trips/{trip_id}/chat  — list messages (chronological)

is_unanimous_override = True signals that the message constitutes unanimous group
agreement, which per design §5A immediately overrides/terminates any active AI
consensus process.  The API stores the flag; enforcement is UI/client-driven.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional
from backend.app.models.ps11 import User, Trip
from backend.app.models.additive import TripChatMessage
from backend.app.schemas.branch import ChatMessageRequest, ChatMessageOut
from backend.app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/trips/{trip_id}/chat", tags=["Trip Chat"])


@router.post("", response_model=ChatMessageOut, status_code=201)
async def send_message(
    trip_id: str,
    req: ChatMessageRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a Trip Chat message.

    If is_unanimous_override=True the message signals unanimous group agreement
    (design §5A row 7/Mode A and §5A Mode NA step — unanimous chat override).
    The flag is persisted and broadcast; enforcement is on the client.
    """
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Message body cannot be empty")

    res_trip = await db.execute(select(Trip).where(Trip.trip_id == trip_id))
    if not res_trip.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Trip not found")

    user_id = current_user.user_id if current_user else "usr_0f22b1"
    now_iso = datetime.now(timezone.utc).isoformat()
    message_id = f"msg_{uuid.uuid4().hex[:8]}"

    msg = TripChatMessage(
        message_id=message_id,
        trip_id=trip_id,
        user_id=user_id,
        body=req.body,
        is_unanimous_override=req.is_unanimous_override,
        sent_at=now_iso,
    )
    db.add(msg)
    await db.commit()

    payload = {
        "type": "chat_message",
        "trip_id": trip_id,
        "message_id": message_id,
        "user_id": user_id,
        "body": req.body,
        "is_unanimous_override": req.is_unanimous_override,
        "sent_at": now_iso,
    }
    await ws_manager.broadcast(trip_id, payload)

    return ChatMessageOut(
        message_id=message_id,
        trip_id=trip_id,
        user_id=user_id,
        body=req.body,
        is_unanimous_override=req.is_unanimous_override,
        sent_at=now_iso,
    )


@router.get("", response_model=List[ChatMessageOut])
async def list_messages(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all Trip Chat messages for this trip in chronological order."""
    res = await db.execute(
        select(TripChatMessage)
        .where(TripChatMessage.trip_id == trip_id)
        .order_by(TripChatMessage.sent_at)
    )
    messages = res.scalars().all()
    return [
        ChatMessageOut(
            message_id=m.message_id,
            trip_id=m.trip_id,
            user_id=m.user_id,
            body=m.body,
            is_unanimous_override=m.is_unanimous_override,
            sent_at=m.sent_at,
        )
        for m in messages
    ]
