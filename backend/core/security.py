"""Password hashing and JWT helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import bcrypt
import jwt

from core.config import config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
        "utf-8"
    )


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def _encode(payload: dict[str, Any], secret: str) -> str:
    return jwt.encode(payload, secret, algorithm=config.JWT_ALGORITHM)


def create_access_token(*, user_id: UUID, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=config.JWT_ACCESS_EXPIRE_MINUTES
    )
    return _encode(
        {
            "sub": str(user_id),
            "role": role,
            "type": "access",
            "exp": expire,
        },
        config.JWT_SECRET,
    )


def create_refresh_token(*, user_id: UUID, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=config.JWT_REFRESH_EXPIRE_DAYS
    )
    return _encode(
        {
            "sub": str(user_id),
            "role": role,
            "type": "refresh",
            "exp": expire,
        },
        config.JWT_REFRESH_SECRET,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        config.JWT_SECRET,
        algorithms=[config.JWT_ALGORITHM],
    )


def decode_refresh_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        config.JWT_REFRESH_SECRET,
        algorithms=[config.JWT_ALGORITHM],
    )


def try_decode_access_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = decode_access_token(token)
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None
