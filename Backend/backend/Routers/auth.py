"""
Auth for all three roles: bidder (public), tender_caller (buyer), official.

    POST /api/auth/register              create account (+ bidder profile or org profile)
    POST /api/auth/login                 bearer token
    POST /api/auth/logout                revoke every token issued for this account
    GET  /api/me                         account + profile
    PUT  /api/profile                    update bidder company profile
    PUT  /api/org-profile                update tender_caller / official org profile
    POST /api/auth/request-verification  (re)send the email-verification link
    GET  /api/auth/verify-email          consume a verification link
    POST /api/auth/request-password-reset  send a reset link if the email exists
    POST /api/auth/reset-password        consume a reset link, set a new password
    POST /api/auth/google                 sign in / register a bidder with a Google ID token
"""

import json
import os
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from .. import db
from ..auth import (hash_password, verify_password, make_token,
                    make_action_token, read_action_token)
from ..deps import current_user
from ..helpers import TODAY, get_profile, get_org_profile
from ..mailer import send_mail

router = APIRouter(tags=["auth"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

ROLES = ("bidder", "tender_caller", "official")


def _public_user(row):
    return {"id": row["id"], "email": row["email"], "company_name": row["company_name"],
            "role": row["role"], "email_verified": bool(row["email_verified"])}


def _issue_verification_email(user_id, email):
    token = make_action_token("verify_email", user_id)
    link = f"/verify-email?token={token}"
    send_mail(email, "Verify your SecureBid account",
             f"Confirm your email by visiting: {link}\nThis link expires in 1 hour.")


class BidderProfileIn(BaseModel):
    udyam_no: Optional[str] = ""
    msme_class: Optional[str] = "Micro"
    bidder_class: Optional[str] = "Class II"
    turnover_cr: Optional[float] = 0
    experience_years: Optional[float] = 0
    max_similar_work_cr: Optional[float] = 0
    certifications: Optional[list] = None
    states: Optional[list] = None
    categories: Optional[list] = None
    working_capital_cr: Optional[float] = 0.25
    overhead_pct: Optional[float] = 12
    target_margin_pct: Optional[float] = 8


class OrgProfileIn(BaseModel):
    org_name: Optional[str] = ""
    department: Optional[str] = ""
    state: Optional[str] = ""
    designation: Optional[str] = ""


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    role: str = "bidder"
    profile: Optional[BidderProfileIn] = None
    org_profile: Optional[OrgProfileIn] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/api/auth/register", status_code=201)
def register(body: RegisterIn):
    if body.role not in ROLES:
        raise HTTPException(400, "Unknown account type")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    email = body.email.strip().lower()
    if db.query_one("SELECT id FROM users WHERE email=?", (email,)):
        raise HTTPException(409, "An account with that email already exists")

    uid = db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at) "
        "VALUES (?,?,?,?,?)",
        (email, hash_password(body.password), body.company_name, body.role,
         TODAY.isoformat()))

    if body.role == "bidder":
        p = body.profile or BidderProfileIn()
        db.execute("""
            INSERT INTO profiles (user_id,udyam_no,msme_class,bidder_class,
                turnover_cr,experience_years,max_similar_work_cr,certifications,
                states,categories,working_capital_cr,overhead_pct,target_margin_pct)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid, p.udyam_no, p.msme_class, p.bidder_class,
            float(p.turnover_cr or 0), float(p.experience_years or 0),
            float(p.max_similar_work_cr or 0),
            json.dumps(p.certifications or ["GST", "PAN"]),
            json.dumps(p.states or []), json.dumps(p.categories or []),
            float(p.working_capital_cr or 0.25), float(p.overhead_pct or 12),
            float(p.target_margin_pct or 8)))
    else:
        o = body.org_profile or OrgProfileIn()
        db.execute("""
            INSERT INTO org_profiles (user_id,role,org_name,department,state,designation)
            VALUES (?,?,?,?,?,?)""",
            (uid, body.role, o.org_name, o.department, o.state, o.designation))

    _issue_verification_email(uid, email)
    row = db.query_one("SELECT * FROM users WHERE id=?", (uid,))
    return {"token": make_token(uid, email, row["token_version"]),
            "user": _public_user(row)}


@router.get("/api/config")
def public_config():
    """Lets the frontend know at runtime (not build time) whether Google
    sign-in is usable, so it can hide the button entirely rather than show
    one that would fail -- no GOOGLE_CLIENT_ID configured means no button.
    The client ID itself is not a secret (it's embedded in every Google
    sign-in button on the web); only a client *secret* would need to stay
    server-side, and this flow never uses one."""
    return {"google_client_id": GOOGLE_CLIENT_ID}


@router.post("/api/auth/google")
def google_sign_in(body: dict):
    """Real Google sign-in: verifies the ID token Google itself issued
    against Google's public keys (via the `google-auth` library) -- this is
    not a mock. Requires GOOGLE_CLIENT_ID to be set in the environment to a
    real OAuth 2.0 Web Client ID from https://console.cloud.google.com
    (APIs & Services > Credentials), with this app's origin registered as an
    authorized JavaScript origin. Without it, this endpoint is disabled."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google sign-in is not configured on this server")

    credential = body.get("credential")
    if not credential:
        raise HTTPException(400, "Missing required field: credential")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
        idinfo = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(401, "Google sign-in failed: invalid or expired credential")

    if not idinfo.get("email_verified", False):
        raise HTTPException(401, "Google account email is not verified")

    email = idinfo["email"].strip().lower()
    user = db.query_one("SELECT * FROM users WHERE email=?", (email,))

    if user and user["role"] != "bidder":
        raise HTTPException(409, f"This email is registered as a {user['role']} account -- "
                                 f"sign in from that portal instead")

    if not user:
        # Google already proved this person owns the email, so the account is
        # created pre-verified. The random password lets them set a real one
        # later via "Forgot password?" if they ever want email/password login too.
        uid = db.execute(
            "INSERT INTO users (email,password_hash,company_name,role,created_at,email_verified) "
            "VALUES (?,?,?,?,?,1)",
            (email, hash_password(secrets.token_urlsafe(32)),
             idinfo.get("name") or email.split("@")[0], "bidder", TODAY.isoformat()))
        db.execute("""
            INSERT INTO profiles (user_id,udyam_no,msme_class,bidder_class,turnover_cr,
                experience_years,max_similar_work_cr,certifications,states,categories,
                working_capital_cr,overhead_pct,target_margin_pct)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, "", "Micro", "Class II", 0, 0, 0,
             json.dumps(["GST", "PAN"]), json.dumps([]), json.dumps([]), 0.25, 12.0, 8.0))
        user = db.query_one("SELECT * FROM users WHERE id=?", (uid,))

    new_version = user["token_version"] + 1
    db.execute("UPDATE users SET token_version=? WHERE id=?", (new_version, user["id"]))
    return {"token": make_token(user["id"], user["email"], new_version),
            "user": _public_user(user)}


@router.post("/api/auth/login")
def login(body: LoginIn):
    """Only one active session per account: logging in bumps token_version,
    which immediately invalidates whatever token an earlier login issued
    (see deps.current_user_optional). Signing in on a second device or tab
    silently signs the first one out rather than letting both run at once."""
    email = body.email.strip().lower()
    user = db.query_one("SELECT * FROM users WHERE email=?", (email,))
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email or password is incorrect")
    new_version = user["token_version"] + 1
    db.execute("UPDATE users SET token_version=? WHERE id=?", (new_version, user["id"]))
    return {"token": make_token(user["id"], user["email"], new_version),
            "user": _public_user(user)}


@router.post("/api/auth/logout")
def logout(user=Depends(current_user)):
    """Bumps token_version, which invalidates every outstanding token for this
    account -- there's no per-session table, so this is "sign out everywhere"
    rather than just this device. Simple and correct; a finer-grained
    per-session revocation list would be the next step if that's ever needed."""
    db.execute("UPDATE users SET token_version = token_version + 1 WHERE id=?",
              (user["id"],))
    return {"ok": True}


@router.get("/api/me")
def me(user=Depends(current_user)):
    if user["role"] == "bidder":
        return {"user": _public_user(user), "profile": get_profile(user["id"])}
    return {"user": _public_user(user), "org_profile": get_org_profile(user["id"])}


@router.put("/api/profile")
def update_profile(body: dict, user=Depends(current_user)):
    if user["role"] != "bidder":
        raise HTTPException(403, "Only bidder accounts have a company profile")
    fields = ["udyam_no", "msme_class", "bidder_class", "turnover_cr",
              "experience_years", "max_similar_work_cr", "working_capital_cr",
              "overhead_pct", "target_margin_pct"]
    sets, params = [], []
    for f in fields:
        if f in body:
            sets.append(f"{f}=?")
            params.append(body[f])
    for f in ["certifications", "states", "categories"]:
        if f in body:
            sets.append(f"{f}=?")
            params.append(json.dumps(body[f]))
    if body.get("company_name"):
        db.execute("UPDATE users SET company_name=? WHERE id=?",
                   (body["company_name"], user["id"]))
    if sets:
        params.append(user["id"])
        db.execute(f"UPDATE profiles SET {','.join(sets)} WHERE user_id=?", params)
    return {"profile": get_profile(user["id"])}


@router.put("/api/org-profile")
def update_org_profile(body: dict, user=Depends(current_user)):
    if user["role"] not in ("tender_caller", "official"):
        raise HTTPException(403, "Only buyer/official accounts have an org profile")
    fields = ["org_name", "department", "state", "designation"]
    sets, params = [], []
    for f in fields:
        if f in body:
            sets.append(f"{f}=?")
            params.append(body[f])
    if body.get("company_name"):
        db.execute("UPDATE users SET company_name=? WHERE id=?",
                   (body["company_name"], user["id"]))
    if sets:
        params.append(user["id"])
        db.execute(f"UPDATE org_profiles SET {','.join(sets)} WHERE user_id=?", params)
    return {"org_profile": get_org_profile(user["id"])}


# ------------------------------------------------- verification / reset

@router.post("/api/auth/request-verification")
def request_verification(user=Depends(current_user)):
    if user["email_verified"]:
        return {"ok": True, "already_verified": True}
    _issue_verification_email(user["id"], user["email"])
    return {"ok": True}


@router.get("/api/auth/verify-email")
def verify_email(token: str):
    payload = read_action_token(token, "verify_email")
    if not payload:
        raise HTTPException(400, "This verification link is invalid or has expired")
    db.execute("UPDATE users SET email_verified=1 WHERE id=?", (payload["uid"],))
    return {"ok": True}


class RequestResetIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str


@router.post("/api/auth/request-password-reset")
def request_password_reset(body: RequestResetIn):
    email = body.email.strip().lower()
    user = db.query_one("SELECT id,email FROM users WHERE email=?", (email,))
    if user:
        token = make_action_token("reset_password", user["id"])
        link = f"/reset-password?token={token}"
        send_mail(user["email"], "Reset your SecureBid password",
                 f"Reset your password by visiting: {link}\nThis link expires in 1 hour. "
                 f"If you didn't request this, ignore this email.")
    # Same response whether or not the email exists -- otherwise this endpoint
    # becomes a way to enumerate registered accounts.
    return {"ok": True}


@router.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordIn):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    payload = read_action_token(body.token, "reset_password")
    if not payload:
        raise HTTPException(400, "This reset link is invalid or has expired")
    # Bumping token_version here too: a password reset should also sign out
    # every session started with the old (possibly compromised) password.
    db.execute("""UPDATE users SET password_hash=?, token_version=token_version+1
                 WHERE id=?""", (hash_password(body.password), payload["uid"]))
    return {"ok": True}


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/api/auth/change-password")
def change_password(body: ChangePasswordIn, user=Depends(current_user)):
    if len(body.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    row = db.query_one("SELECT password_hash FROM users WHERE id=?", (user["id"],))
    if not verify_password(body.current_password, row["password_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    # Same one-active-session bump as login/reset: the token this request was
    # made with must keep working, so we hand back a freshly signed one built
    # on the new version rather than just invalidating everything.
    new_version = user["token_version"] + 1
    db.execute("UPDATE users SET password_hash=?, token_version=? WHERE id=?",
              (hash_password(body.new_password), new_version, user["id"]))
    return {"token": make_token(user["id"], user["email"], new_version)}
