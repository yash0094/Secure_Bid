"""POST /api/portfolio/optimise -- EMD-constrained bid selection."""

from fastapi import APIRouter, Depends

from .. import db
from ..deps import current_user, require_role
from ..engine import pricing, eligibility, portfolio
from ..helpers import TODAY, get_profile, tender_public

router = APIRouter(tags=["portfolio"], dependencies=[Depends(require_role("bidder"))])


@router.post("/api/portfolio/optimise")
def optimise_portfolio(body: dict, user=Depends(current_user)):
    profile = get_profile(user["id"])
    capital = body.get("capital")
    capital = float(capital) if capital is not None else (
        profile.get("working_capital_cr") or 0.25) * 10_000_000
    max_bids = int(body.get("max_bids", 6))
    cost_ratio = float(body.get("cost_ratio", 0.82))
    horizon = int(body.get("horizon_days", 45))
    eligible_only = bool(body.get("eligible_only", True))

    rows = db.query("""
        SELECT * FROM tenders
        WHERE status='published'
          AND julianday(closes_at) >= julianday(?)
          AND julianday(closes_at) - julianday(?) <= ?
        ORDER BY closes_at""", (TODAY.isoformat(), TODAY.isoformat(), horizon))

    candidates = []
    for r in rows:
        t = tender_public(r)
        if eligible_only and profile:
            m = eligibility.match(profile, t["eligibility"], t)
            if m["verdict"] == "not_eligible":
                continue
        score = pricing.quick_score(t["buyer"], t["category"],
                                    t["estimated_value"], cost_ratio)
        if not score or score["expected_profit"] <= 0:
            continue
        candidates.append({
            "id": t["id"], "title": t["title"], "buyer": t["buyer"],
            "closes_at": t["closes_at"], "emd": t["emd"],
            "estimated_value": t["estimated_value"],
            "recommended_bid": score["bid"], "win_prob": score["win_prob"],
            "expected_profit": score["expected_profit"],
        })

    candidates.sort(
        key=lambda c: -(c["expected_profit"] / c["emd"] if c["emd"] else 1e18))
    result = portfolio.optimise(candidates[:40], capital, max_bids)
    result["considered"] = len(candidates)
    return result
