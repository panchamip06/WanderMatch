import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.services.auth.firebase import init_firebase
from backend.app.api import api_router
from backend.app.websocket.router import router as ws_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("wandermatch")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for database initialization and services."""
    logger.info("Initializing WanderMatch Single Orchestrator Backend...")
    try:
        init_firebase()
        await init_db()
        logger.info("Additive tables verified/initialized in database.")
    except Exception as e:
        logger.error(f"Startup error during database initialization: {e}")
    yield
    logger.info("Shutting down WanderMatch Backend.")

app = FastAPI(
    title="WanderMatch API",
    description="WanderMatch - Social & Group Travel Planning with AI Consensus Planner (PS-11)",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API and WebSocket routes
app.include_router(api_router)
app.include_router(ws_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
