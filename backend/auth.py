"""Auth utilities: bcrypt password hashing, JWT issue/verify, dependency injection."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=14),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])


def _extract_token(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return token


def make_current_user_dep(db: AsyncIOMotorDatabase):
    async def current_user(request: Request) -> dict:
        token = _extract_token(request)
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                raise HTTPException(status_code=401, detail="Invalid token type")
            user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            user.pop("password_hash", None)
            return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

    return current_user


def set_auth_cookies(response, access: str, refresh: str) -> None:
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 12, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 24 * 14, path="/",
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
