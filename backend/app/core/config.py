import os
from typing import List
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_default_sqlite_path() -> str:
    root = Path(__file__).resolve().parent.parent.parent.parent
    candidates = [
        root / "data" / "data" / "PS-11.db",
        root / "data" / "PS-11.db",
        root / "WanderMatch" / "data" / "PS-11.db",
    ]
    for c in candidates:
        if c.exists():
            return c.as_posix()
    return (root / "data" / "data" / "PS-11.db").as_posix()

default_db_path = get_default_sqlite_path()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENV: str = "development"
    DEBUG: bool = True

    # Database URLs (PostgreSQL is system of record; falls back to local PS-11.db for dev)
    DATABASE_URL: str = Field(
        default_factory=lambda: f"sqlite+aiosqlite:///{default_db_path}"
    )
    SYNC_DATABASE_URL: str = Field(
        default_factory=lambda: f"sqlite:///{default_db_path}"
    )

    # FastAPI Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    # Firebase Auth (Identity Only)
    FIREBASE_PROJECT_ID: str = "wandermatch-ps11"
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_AUTH_MOCK: bool = True

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_URL: str = ""

    # LLM API
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

settings = Settings()
