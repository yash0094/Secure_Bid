"""Shared helpers used across routers."""

from datetime import datetime, date

from . import db

TODAY = date(2026, 9, 17)      # fixed "today" so the seeded demo stays coherent


def get_profile(user_id):
    p = db.query_one("SELECT * FROM profiles WHERE user_id=?", (user_id,))
    if not p:
        return {}
    for k in ("certifications", "states", "categories"):
        p[k] = db.jloads(p.get(k), [])
    return p


def get_org_profile(user_id):
    return db.query_one("SELECT * FROM org_profiles WHERE user_id=?", (user_id,)) or {}


def days_left(closes_at):
    try:
        d = datetime.strptime(closes_at, "%Y-%m-%d").date()
        return (d - TODAY).days
    except (ValueError, TypeError):
        return None


def tender_public(row):
    row = dict(row)
    row["eligibility"] = db.jloads(row.pop("eligibility_json", "{}"), {})
    row["days_left"] = days_left(row["closes_at"])
    return row
