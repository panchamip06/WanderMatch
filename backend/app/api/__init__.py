from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.auth import router as auth_router
from backend.app.api.trips import router as trips_router
from backend.app.api.proposals import router as proposals_router
from backend.app.api.votes import router as votes_router
from backend.app.api.reference import router as reference_router
from backend.app.api.consensus import router as consensus_router
from backend.app.api.branches import router as branches_router
from backend.app.api.chat import router as chat_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(trips_router)
api_router.include_router(proposals_router)
api_router.include_router(votes_router)
api_router.include_router(reference_router)
api_router.include_router(consensus_router)
api_router.include_router(branches_router)
api_router.include_router(chat_router)

__all__ = ["api_router"]
