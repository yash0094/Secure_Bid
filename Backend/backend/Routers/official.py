"""
Government Official role: read-only, cross-department oversight. No bidding,
no tender authoring -- system-wide visibility over every tender caller.

    GET /api/official/overview   spend analytics across all tenders/awards
    GET /api/official/tenders    registry of every tender (any caller, any status)
    GET /api/official/screens    system-wide collusion screens, ranked
"""

from collections import defaultdict

from fastapi import APIRouter, Depends, Request

from .. import db
from ..deps import require_role
from ..engine import cartel
from ..helpers import tender_public

router = APIRouter(tags=["official"], dependencies=[Depends(require_role("official"))])


@router.get("/api/official/overview")
def overview():
    totals = db.query_one("""
        SELECT (SELECT COUNT(*) FROM tenders) AS tenders,
               (SELECT COUNT(*) FROM tenders WHERE status='published') AS published,
               (SELECT COUNT(*) FROM tenders WHERE status='closed') AS closed,
               (SELECT COUNT(*) FROM awards) AS awards,
               (SELECT COALESCE(SUM(estimated_value),0) FROM tenders) AS pipeline_value,
               (SELECT COALESCE(SUM(winning_bid),0) FROM awards) AS awarded_value""")

    by_state = db.query("""
        SELECT buyer_state, COUNT(*) AS tenders, SUM(estimated_value) AS value
        FROM tenders GROUP BY buyer_state ORDER BY value DESC""")

    by_category = db.query("""
        SELECT category, COUNT(*) AS tenders, SUM(estimated_value) AS value
        FROM tenders GROUP BY category ORDER BY value DESC LIMIT 12""")

    by_month = defaultdict(float)
    for r in db.query("SELECT awarded_at, winning_bid FROM awards"):
        by_month[r["awarded_at"][:7]] += r["winning_bid"] or 0
    award_trend = [{"month": m, "value": v} for m, v in sorted(by_month.items())][-12:]

    top_callers = db.query("""
        SELECT u.company_name, COUNT(*) AS tenders, SUM(t.estimated_value) AS value
        FROM tenders t JOIN users u ON u.id = t.created_by_user_id
        GROUP BY u.id ORDER BY value DESC LIMIT 10""")

    return {
        "totals": totals, "by_state": by_state, "by_category": by_category,
        "award_trend": award_trend, "top_callers": top_callers,
    }


@router.get("/api/official/tenders")
def registry(request: Request):
    where, params = ["1=1"], []
    status = request.query_params.get("status")
    if status:
        where.append("t.status=?"); params.append(status)
    state = request.query_params.get("state")
    if state:
        where.append("t.buyer_state=?"); params.append(state)
    rows = db.query(f"""
        SELECT t.*, u.company_name AS caller_name
        FROM tenders t LEFT JOIN users u ON u.id = t.created_by_user_id
        WHERE {' AND '.join(where)} ORDER BY t.id DESC LIMIT 200""", params)
    return {"tenders": [tender_public(r) | {"caller_name": r["caller_name"]} for r in rows]}


@router.get("/api/official/screens")
def screens(request: Request):
    limit = int(request.query_params.get("limit", 20))
    return {"buckets": cartel.rank_buckets(limit)}
