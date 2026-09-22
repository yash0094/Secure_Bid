"""
    POST /api/pricing/recommend   the BidVector recommendation
    GET  /api/bucket/ratios       the sample the pricing model fitted
    POST /api/pricing/evaluate    what-if on a bid you type in
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db
from ..deps import require_role
from ..engine import pricing

# Bid-price recommendations are proprietary to the signed-in bidder who asked
# for them, not something an unauthenticated caller should be able to probe.
router = APIRouter(tags=["pricing"], dependencies=[Depends(require_role("bidder"))])


def _tender_or_fields(body: dict):
    tid = body.get("tender_id")
    if tid:
        row = db.query_one("SELECT * FROM tenders WHERE id=?", (int(tid),))
        if not row:
            raise HTTPException(404, "Tender not found")
        return row["buyer"], row["category"], row["estimated_value"], row
    if not body.get("buyer") or not body.get("category") or not body.get("estimated_value"):
        raise HTTPException(400, "Provide tender_id, or buyer/category/estimated_value")
    return body["buyer"], body["category"], float(body["estimated_value"]), None


@router.post("/api/pricing/recommend")
def pricing_recommend(body: dict):
    buyer, category, value, row = _tender_or_fields(body)
    cost = body.get("cost")
    cost = float(cost) if cost is not None else value * float(body.get("cost_ratio", 0.82))
    target = float(body.get("target_margin_pct", 8.0))
    result = pricing.recommend(buyer, category, value, cost, target)
    if row:
        result["tender"]["id"] = row["id"]
        result["tender"]["title"] = row["title"]
        result["tender"]["emd"] = row["emd"]
        result["tender"]["closes_at"] = row["closes_at"]
    return result


@router.get("/api/bucket/ratios")
def bucket_ratios(request: Request):
    buyer = request.query_params.get("buyer")
    category = request.query_params.get("category")
    value = float(request.query_params.get("value") or 0)
    model = pricing.get_model(buyer, category, value or 1)
    return {
        "bucket": model.bucket, "prior": model.prior_label, "ratios": model.ratios,
        "prior_ratios": model.prior_ratios[:1500], "l1_ratios": model.l1_ratios,
        "n_tenders": model.n_tenders, "shrinkage_weight": model.G.weight,
    }


@router.post("/api/pricing/evaluate")
def pricing_evaluate(body: dict):
    buyer, category, value, _row = _tender_or_fields(body)
    cost = body.get("cost")
    cost = float(cost) if cost is not None else value * 0.82
    if "bid" not in body:
        raise HTTPException(400, "Missing required field: bid")
    return pricing.evaluate_bid(buyer, category, value, cost, float(body["bid"]))
