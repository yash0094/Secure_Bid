"""
Tender discovery (bidder-facing, read-only over published tenders).

    GET  /api/filters             facet values for the filter bar
    GET  /api/tenders             search with filters + eligibility
    GET  /api/tenders/{id}        detail + parsed criteria + checklist
    POST /api/parse               run the clause parser on pasted text
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db
from ..deps import current_user_optional
from ..engine import pricing, eligibility
from ..helpers import TODAY, get_profile, tender_public

router = APIRouter(tags=["tenders"])


@router.get("/api/filters")
def filters():
    return {
        "buyers": [r["buyer"] for r in db.query(
            "SELECT DISTINCT buyer FROM tenders WHERE status='published' ORDER BY buyer")],
        "categories": [r["category"] for r in db.query(
            "SELECT DISTINCT category FROM tenders WHERE status='published' ORDER BY category")],
        "states": [r["buyer_state"] for r in db.query(
            "SELECT DISTINCT buyer_state FROM tenders WHERE status='published' ORDER BY buyer_state")],
        "portals": [r["portal"] for r in db.query(
            "SELECT DISTINCT portal FROM tenders WHERE status='published' ORDER BY portal")],
        "value_bands": [b[0] for b in pricing.VALUE_BANDS],
    }


def _qarg(request: Request, name, default=None, cast=None):
    v = request.query_params.get(name)
    if v is None or v == "":
        return default
    if cast:
        try:
            return cast(v)
        except (ValueError, TypeError):
            return default
    return v


def search_rows(request: Request):
    where, params = ["status='published'"], []
    q = _qarg(request, "q")
    if q:
        where.append("(LOWER(title) LIKE ? OR LOWER(buyer) LIKE ? "
                     "OR LOWER(ref_no) LIKE ? OR LOWER(description) LIKE ?)")
        like = f"%{q.lower()}%"
        params += [like, like, like, like]
    for field, arg in (("buyer", "buyer"), ("category", "category"),
                       ("buyer_state", "state"), ("portal", "portal")):
        v = _qarg(request, arg)
        if v:
            where.append(f"{field}=?")
            params.append(v)
    mn = _qarg(request, "min_value", cast=float)
    mx = _qarg(request, "max_value", cast=float)
    if mn:
        where.append("estimated_value >= ?")
        params.append(mn)
    if mx:
        where.append("estimated_value <= ?")
        params.append(mx)
    within = _qarg(request, "closing_within", cast=int)
    if within:
        where.append("julianday(closes_at) - julianday(?) <= ?")
        params += [TODAY.isoformat(), within]
    if _qarg(request, "open_only", "1") == "1":
        where.append("julianday(closes_at) >= julianday(?)")
        params.append(TODAY.isoformat())

    sort = _qarg(request, "sort", "closing")
    order = {
        "closing": "closes_at ASC",
        "value_desc": "estimated_value DESC",
        "value_asc": "estimated_value ASC",
        "newest": "published_at DESC",
    }.get(sort, "closes_at ASC")

    return db.query(
        f"SELECT * FROM tenders WHERE {' AND '.join(where)} ORDER BY {order}",
        params)


@router.get("/api/tenders")
def search_tenders(request: Request, user=Depends(current_user_optional)):
    profile = get_profile(user["id"]) if user and user["role"] == "bidder" else {}
    rows = search_rows(request)

    eligible_only = _qarg(request, "eligible_only") == "1"
    rank_by_profit = _qarg(request, "sort") == "expected_profit"
    cost_ratio = _qarg(request, "cost_ratio", 0.82, float)

    out = []
    for r in rows:
        t = tender_public(r)
        if profile:
            t["match"] = eligibility.match(profile, t["eligibility"], t)
            if eligible_only and t["match"]["verdict"] == "not_eligible":
                continue
        if rank_by_profit:
            t["score"] = pricing.quick_score(
                t["buyer"], t["category"], t["estimated_value"], cost_ratio)
        out.append(t)

    if rank_by_profit:
        out.sort(key=lambda t: -((t.get("score") or {}).get("expected_profit") or 0))

    page = _qarg(request, "page", 1, int)
    size = min(_qarg(request, "page_size", 20, int), 100)
    start = (page - 1) * size
    return {"total": len(out), "page": page, "page_size": size,
            "results": out[start:start + size]}


@router.get("/api/tenders/{tender_id}")
def tender_detail(tender_id: int, user=Depends(current_user_optional)):
    row = db.query_one("SELECT * FROM tenders WHERE id=?", (tender_id,))
    if not row:
        raise HTTPException(404, "Tender not found")
    t = tender_public(row)

    if user and user["role"] == "bidder":
        profile = get_profile(user["id"])
        t["match"] = eligibility.match(profile, t["eligibility"], t)
        t["checklist"] = eligibility.document_checklist(t["eligibility"], profile)
        t["pipeline"] = db.query_one(
            "SELECT * FROM pipeline WHERE user_id=? AND tender_id=?",
            (user["id"], tender_id))

    t["comparables"] = db.query("""
        SELECT ref_no,title,awarded_at,estimated_value,winning_bid,n_bidders,winner,
               winning_bid*1.0/estimated_value AS l1_ratio
        FROM awards WHERE buyer=? AND category=?
        ORDER BY awarded_at DESC LIMIT 8""", (t["buyer"], t["category"]))
    return t


@router.post("/api/parse")
def parse_clause(body: dict, user=Depends(current_user_optional)):
    text = body.get("text")
    if not text:
        raise HTTPException(400, "Missing required field: text")
    parsed = eligibility.parse_eligibility(text)
    out = {"parsed": parsed}
    if user and user["role"] == "bidder":
        out["match"] = eligibility.match(get_profile(user["id"]), parsed)
    return out
