from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.app.core.config import settings

# Engine configuration
# Note: For SQLite async, SQLite needs connect_args check_same_thread=False
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db() -> None:
    """Initialize additive tables in the database if they do not exist."""
    from backend.app.models import additive  # Ensure additive models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Additive column migration: add ai_round_number to proposal_timers if absent.
        # SQLite does not support ADD COLUMN IF NOT EXISTS, so we probe via PRAGMA.
        await conn.run_sync(_migrate_proposal_timers)


def _migrate_proposal_timers(sync_conn) -> None:
    """Add ai_round_number to proposal_timers if the column does not already exist."""
    cursor = sync_conn.execute(
        __import__("sqlalchemy").text("PRAGMA table_info(proposal_timers)")
    )
    columns = {row[1] for row in cursor}  # row[1] is column name in PRAGMA result
    if "ai_round_number" not in columns:
        sync_conn.execute(
            __import__("sqlalchemy").text(
                "ALTER TABLE proposal_timers ADD COLUMN ai_round_number INTEGER NOT NULL DEFAULT 0"
            )
        )
