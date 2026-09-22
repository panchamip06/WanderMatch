from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.app.core.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint confirming FastAPI orchestrator and database connectivity."""
    db_status = "error"
    total_trips = 0
    try:
        result = await db.execute(text("SELECT COUNT(*) FROM trips"))
        total_trips = result.scalar() or 0
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "service": "WanderMatch Single Orchestrator",
        "database": db_status,
        "sample_data": {
            "trips_count": total_trips
        }
    }
