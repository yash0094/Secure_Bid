"""
FastAPI dependencies: per-request DB handle, bearer-token auth, role gates.
"""

from fastapi import Depends, Header, HTTPException

from . import db
from .auth import read_token


def get_db():
    return db


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def current_user_optional(authorization: str | None = Header(default=None)):
    payload = read_token(_bearer(authorization))
    if not payload:
        return None
    user = db.query_one(
        "SELECT id,email,company_name,role,email_verified,token_version "
        "FROM users WHERE id=?", (payload["uid"],))
    if not user:
        return None
    # A signature check alone can't see a logout or password reset that
    # happened after this token was issued -- the embedded version has to
    # still match the user's current one, or the token is revoked.
    if payload.get("tv", 0) != user["token_version"]:
        return None
    return user


def current_user(user=Depends(current_user_optional)):
    if not user:
        raise HTTPException(401, "Sign in to continue")
    return user


def require_role(*roles):
    def _dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Not permitted for this account type")
        return user
    return _dep
