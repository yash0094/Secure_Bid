"""
Competitor intelligence and collusion screens. Available to bidders (their own
market) and officials (system-wide, via the /api/official/* router instead).

    GET /api/competitors             who bids in a bucket and how
    GET /api/competitors/{name}      one firm's bidding behaviour
    GET /api/screens                 collusion screens for a bucket
    GET /api/screens/ranked          buckets ranked by screen flags
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db
from ..deps import require_role
from ..engine import cartel, stats as st

router = APIRouter(tags=["intel"], dependencies=[Depends(require_role("bidder"))])


@router.get("/api/competitors")
def competitors(request: Request):
    where, params = ["1=1"], []
    buyer = request.query_params.get("buyer")
    category = request.query_params.get("category")
    if buyer:
        where.append("a.buyer=?"); params.append(buyer)
    if category:
        where.append("a.category=?"); params.append(category)
    rows = db.query(f"""
        SELECT b.bidder,
               COUNT(*)                                      AS bids,
               SUM(CASE WHEN b.rank=1 THEN 1 ELSE 0 END)     AS wins,
               AVG(b.amount*1.0/a.estimated_value)           AS avg_ratio,
               MIN(b.amount*1.0/a.estimated_value)           AS min_ratio,
               SUM(CASE WHEN b.rank=1 THEN a.estimated_value ELSE 0 END) AS won_value
        FROM bids b JOIN awards a ON a.id=b.award_id
        WHERE {' AND '.join(where)}
        GROUP BY b.bidder HAVING bids >= 3
        ORDER BY wins DESC, bids DESC LIMIT 25""", params)
    for r in rows:
        r["hit_rate"] = r["wins"] / r["bids"] if r["bids"] else 0
    return {"competitors": rows}


@router.get("/api/competitors/{name}")
def competitor_detail(name: str):
    rows = db.query("""
        SELECT a.ref_no,a.title,a.buyer,a.category,a.awarded_at,
               a.estimated_value,a.n_bidders,a.winner,
               b.amount,b.rank, b.amount*1.0/a.estimated_value AS ratio
        FROM bids b JOIN awards a ON a.id=b.award_id
        WHERE b.bidder=? ORDER BY a.awarded_at DESC LIMIT 60""", (name,))
    if not rows:
        raise HTTPException(404, "No bidding history for that firm")
    wins = [r for r in rows if r["rank"] == 1]
    ratios = sorted(r["ratio"] for r in rows)
    by_cat = {}
    for r in rows:
        c = by_cat.setdefault(r["category"], {"bids": 0, "wins": 0})
        c["bids"] += 1
        c["wins"] += 1 if r["rank"] == 1 else 0
    return {
        "bidder": name, "bids": len(rows), "wins": len(wins),
        "hit_rate": len(wins) / len(rows),
        "median_ratio": st.quantile(ratios, 0.5),
        "p10_ratio": st.quantile(ratios, 0.10),
        "categories": [{"category": k, **v} for k, v in sorted(
            by_cat.items(), key=lambda kv: -kv[1]["bids"])],
        "history": rows[:25],
    }


@router.get("/api/screens")
def screens(request: Request):
    return cartel.run_screens(request.query_params.get("buyer"),
                              request.query_params.get("category"))


@router.get("/api/screens/ranked")
def screens_ranked(request: Request):
    limit = int(request.query_params.get("limit", 12))
    return {"buckets": cartel.rank_buckets(limit)}
