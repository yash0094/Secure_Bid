"""
    GET /api/dashboard          headline metrics + ranked opportunity list
    GET /api/analytics/overview spend analytics: trends, capital, categories
"""

from collections import defaultdict

from fastapi import APIRouter, Depends, Request

from .. import db
from ..deps import current_user, require_role
from ..engine import pricing, eligibility
from ..helpers import TODAY, get_profile, tender_public

router = APIRouter(tags=["dashboard"], dependencies=[Depends(require_role("bidder"))])


@router.get("/api/dashboard")
def dashboard(request: Request, user=Depends(current_user)):
    profile = get_profile(user["id"])
    cost_ratio = float(request.query_params.get("cost_ratio", 0.82))

    pipe = db.query("""
        SELECT p.*, t.title,t.buyer,t.category,t.estimated_value,t.emd,t.closes_at
        FROM pipeline p JOIN tenders t ON t.id=p.tender_id
        WHERE p.user_id=?""", (user["id"],))

    emd_locked = sum(p["emd_paid"] or 0 for p in pipe if p["status"] in ("submitted",))
    capital = (profile.get("working_capital_cr") or 0) * 10_000_000

    live_ev = 0.0
    for p in pipe:
        if p["status"] != "submitted" or not p["our_bid"]:
            continue
        ev = pricing.evaluate_bid(p["buyer"], p["category"], p["estimated_value"],
                                  p["cost_est"] or p["estimated_value"] * cost_ratio,
                                  p["our_bid"])
        live_ev += ev["expected_profit"]

    decided = [p for p in pipe if p["status"] in ("won", "lost")]
    win_rate = (sum(1 for p in decided if p["status"] == "won") / len(decided)
                if decided else None)

    rows = db.query("""
        SELECT * FROM tenders
        WHERE status='published' AND julianday(closes_at) >= julianday(?)
        ORDER BY closes_at LIMIT 120""", (TODAY.isoformat(),))
    opportunities, screened_out = [], 0
    for r in rows:
        t = tender_public(r)
        m = eligibility.match(profile, t["eligibility"], t)
        if m["verdict"] == "not_eligible":
            screened_out += 1
            continue
        score = pricing.quick_score(t["buyer"], t["category"], t["estimated_value"], cost_ratio)
        if not score:
            continue
        opportunities.append({
            "id": t["id"], "title": t["title"], "buyer": t["buyer"],
            "category": t["category"], "estimated_value": t["estimated_value"],
            "emd": t["emd"], "closes_at": t["closes_at"], "days_left": t["days_left"],
            "match": m["verdict"], "match_score": m["score"], "gaps": len(m["blockers"]),
            **score,
        })
    opportunities.sort(key=lambda o: -o["expected_profit"])

    return {
        "company": user["company_name"],
        "metrics": {
            "emd_locked": emd_locked, "working_capital": capital,
            "capital_utilisation": (emd_locked / capital) if capital else 0,
            "expected_value_live": live_ev, "win_rate": win_rate,
            "decided_count": len(decided),
            "active_bids": sum(1 for p in pipe if p["status"] in ("preparing", "submitted")),
            "screened_out": screened_out, "hours_saved": round(screened_out * 1.3),
        },
        "opportunities": opportunities[:15],
        "closing_soon": sorted(
            [p for p in pipe if p["status"] in ("preparing", "watching")],
            key=lambda p: p["closes_at"])[:5],
        "cost_ratio_assumption": cost_ratio,
    }


@router.get("/api/analytics/overview")
def analytics_overview(user=Depends(current_user)):
    profile = get_profile(user["id"])
    capital = (profile.get("working_capital_cr") or 0) * 10_000_000

    pipe = db.query("""
        SELECT p.*, t.category, t.buyer_state, t.estimated_value
        FROM pipeline p JOIN tenders t ON t.id=p.tender_id
        WHERE p.user_id=?""", (user["id"],))

    emd_deployed = sum(p["emd_paid"] or 0 for p in pipe
                       if p["status"] in ("submitted", "won"))

    # Win-rate trend by month (using updated_at as the decision month).
    by_month = defaultdict(lambda: {"won": 0, "lost": 0})
    for p in pipe:
        if p["status"] in ("won", "lost") and p.get("updated_at"):
            month = p["updated_at"][:7]
            by_month[month][p["status"]] += 1
    trend = [{"month": m, "won": v["won"], "lost": v["lost"],
              "win_rate": v["won"] / (v["won"] + v["lost"]) if (v["won"] + v["lost"]) else 0}
             for m, v in sorted(by_month.items())]

    by_category = defaultdict(lambda: {"bids": 0, "won": 0, "value": 0.0, "realized_margin": 0.0})
    for p in pipe:
        c = by_category[p["category"]]
        if p["status"] in ("submitted", "won", "lost"):
            c["bids"] += 1
        if p["status"] == "won":
            c["won"] += 1
            c["value"] += p["estimated_value"] or 0
            if p.get("our_bid") and p.get("cost_est"):
                c["realized_margin"] += p["our_bid"] - p["cost_est"]
    categories = [{"category": k, **v} for k, v in
                  sorted(by_category.items(), key=lambda kv: -kv[1]["value"])]

    decided = [p for p in pipe if p["status"] in ("won", "lost")]
    realized_margin = sum(
        (p["our_bid"] - p["cost_est"]) for p in pipe
        if p["status"] == "won" and p.get("our_bid") and p.get("cost_est"))

    return {
        "capital": {
            "working_capital": capital, "deployed": emd_deployed,
            "available": max(capital - emd_deployed, 0),
            "utilisation": (emd_deployed / capital) if capital else 0,
        },
        "win_rate_trend": trend,
        "categories": categories,
        "summary": {
            "total_bids": sum(1 for p in pipe if p["status"] in ("submitted", "won", "lost")),
            "wins": sum(1 for p in decided if p["status"] == "won"),
            "win_rate": (sum(1 for p in decided if p["status"] == "won") / len(decided)
                        if decided else None),
            "realized_margin": realized_margin,
        },
    }
