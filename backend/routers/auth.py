"""Authentication endpoints — register, login, refresh, logout, me."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import select
import jwt

from core.config import config
from core.deps import CurrentUser, SessionDep
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from db.models import User, UserRole

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=128)


class UserOut(BaseModel):
    id: UUID
    username: str
    email: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    max_age = config.JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=config.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=not config.DEBUG,
        samesite="lax",
        max_age=max_age,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=config.REFRESH_COOKIE_NAME,
        path="/api/auth",
    )


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
    )


def _issue_tokens(response: Response, user: User) -> TokenResponse:
    access = create_access_token(user_id=user.id, role=user.role.value)
    refresh = create_refresh_token(user_id=user.id, role=user.role.value)
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, user=_user_out(user))


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    body: RegisterRequest,
    response: Response,
    session: SessionDep,
) -> TokenResponse:
    username = body.username.strip()
    email = str(body.email).lower().strip()

    existing = session.exec(
        select(User).where(
            (User.username == username) | (User.email == email)
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered",
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(body.password),
        role=UserRole.farmer,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _issue_tokens(response, user)


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    response: Response,
    session: SessionDep,
) -> TokenResponse:
    username = body.username.strip()
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return _issue_tokens(response, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_access(
    response: Response,
    session: SessionDep,
    agrosphere_refresh: Optional[str] = Cookie(
        default=None, alias="agrosphere_refresh"
    ),
) -> TokenResponse:
    if not agrosphere_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    try:
        payload = decode_refresh_token(agrosphere_refresh)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        user_id = UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = session.get(User, user_id)
    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return _issue_tokens(response, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return _user_out(user)
