import os
import logging
from typing import Optional, Dict, Any
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app = None

def init_firebase() -> None:
    """Initialize Firebase Admin SDK if configured."""
    global _firebase_app
    if settings.FIREBASE_AUTH_MOCK:
        logger.info("Firebase Auth running in MOCK mode (FIREBASE_AUTH_MOCK=True)")
        return

    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        try:
            import firebase_admin
            from firebase_admin import credentials
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized successfully with credentials.")
        except Exception as e:
            logger.warning(f"Failed to initialize Firebase Admin SDK: {e}. Falling back to mock/dev mode.")
    else:
        logger.info("No Firebase credentials provided. Running in dev mock mode.")

def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a Firebase ID Token.
    Returns decoded token dictionary containing 'uid', 'email', etc.
    """
    # Check for dev mock token format: "mock:<user_id>" or general mock mode
    if token.startswith("mock:"):
        uid = token.split("mock:", 1)[1]
        return {
            "uid": uid,
            "email": f"{uid}@example.invalid",
            "name": f"User {uid}",
            "auth_time": 1700000000,
        }

    if settings.FIREBASE_AUTH_MOCK or _firebase_app is None:
        # Development fallback: treat token itself as UID if alphanumeric/prefixed
        uid = token if token.startswith("usr_") else f"usr_{token[:8]}"
        return {
            "uid": uid,
            "email": f"{uid}@example.invalid",
            "name": f"User {uid}",
            "auth_time": 1700000000,
        }

    # Live verification using firebase_admin
    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        raise ValueError(f"Invalid Firebase ID token: {str(e)}")
