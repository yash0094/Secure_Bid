"""
Tender Caller (buyer / procuring entity) role: author tenders, evaluate bids,
award a winner. Awarding writes into awards/bids so the pricing, competitor
and collusion engines on the bidder side learn from real activity, not just
seed data.

    GET    /api/caller/tenders                 tenders this caller owns
    POST   /api/caller/tenders                 create a tender (draft)
    GET    /api/caller/tenders/{id}             detail
    PUT    /api/caller/tenders/{id}             edit / publish / close
    DELETE /api/caller/tenders/{id}             remove a draft
    GET    /api/caller/tenders/{id}/submissions bids submitted against it
    POST   /api/caller/tenders/{id}/submissions/{sid}/status  shortlist/reject
    POST   /api/caller/tenders/{id}/award        pick a winner
"""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..deps import current_user, require_role
from ..engine.eligibility import parse_eligibility
from ..helpers import TODAY, tender_public

router = APIRouter(tags=["caller"], dependencies=[Depends(require_role("tender_caller"))])


def _own_tender(tid, user_id):
    row = db.query_one("SELECT * FROM tenders WHERE id=? AND created_by_user_id=?",
                       (tid, user_id))
    if not row:
        raise HTTPException(404, "Not found")
    return row


@router.get("/api/caller/tenders")
def list_my_tenders(user=Depends(current_user)):
    rows = db.query("""SELECT t.*,
            (SELECT COUNT(*) FROM submissions s WHERE s.tender_id=t.id) AS submission_count
        FROM tenders t WHERE created_by_user_id=? ORDER BY t.id DESC""", (user["id"],))
    return {"tenders": [tender_public(r) | {"submission_count": r["submission_count"]}
                        for r in rows]}


@router.post("/api/caller/tenders", status_code=201)
def create_tender(body: dict, user=Depends(current_user)):
    for f in ("title", "category", "estimated_value", "closes_at"):
        if not body.get(f):
            raise HTTPException(400, f"Missing required field: {f}")

    raw_eligibility = body.get("raw_eligibility", "")
    eligibility_json = parse_eligibility(raw_eligibility) if raw_eligibility else {}
    value = float(body["estimated_value"])
    emd = float(body.get("emd") or value * 0.02)

    tid = db.execute("""
        INSERT INTO tenders (ref_no,title,buyer,buyer_state,category,portal,
            estimated_value,emd,tender_fee,published_at,closes_at,
            completion_months,description,raw_eligibility,eligibility_json,
            expected_bidders,created_by_user_id,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
        f"TC-{uuid.uuid4().hex[:8].upper()}", body["title"],
        body.get("buyer") or user["company_name"], body.get("buyer_state", ""),
        body["category"], body.get("portal", "Direct"), value, emd,
        float(body.get("tender_fee") or 0), TODAY.isoformat(), body["closes_at"],
        int(body.get("completion_months") or 6), body.get("description", ""),
        raw_eligibility, json.dumps(eligibility_json),
        int(body.get("expected_bidders") or 0), user["id"],
        body.get("status", "draft")))
    return tender_public(db.query_one("SELECT * FROM tenders WHERE id=?", (tid,)))


@router.get("/api/caller/tenders/{tid}")
def tender_detail(tid: int, user=Depends(current_user)):
    row = _own_tender(tid, user["id"])
    t = tender_public(row)
    t["submissions"] = db.query("""
        SELECT s.*, u.company_name FROM submissions s
        JOIN users u ON u.id = s.bidder_user_id
        WHERE s.tender_id=? ORDER BY s.amount ASC""", (tid,))
    return t


@router.put("/api/caller/tenders/{tid}")
def update_tender(tid: int, body: dict, user=Depends(current_user)):
    _own_tender(tid, user["id"])
    fields = ["title", "buyer", "buyer_state", "category", "portal",
              "estimated_value", "emd", "tender_fee", "closes_at",
              "completion_months", "description", "status"]
    sets, params = [], []
    for f in fields:
        if f in body:
            sets.append(f"{f}=?"); params.append(body[f])
    if "raw_eligibility" in body:
        sets.append("raw_eligibility=?"); params.append(body["raw_eligibility"])
        sets.append("eligibility_json=?")
        params.append(json.dumps(parse_eligibility(body["raw_eligibility"])
                                 if body["raw_eligibility"] else {}))
    if sets:
        params.append(tid)
        db.execute(f"UPDATE tenders SET {','.join(sets)} WHERE id=?", params)
    return tender_public(db.query_one("SELECT * FROM tenders WHERE id=?", (tid,)))


@router.delete("/api/caller/tenders/{tid}")
def delete_tender(tid: int, user=Depends(current_user)):
    row = _own_tender(tid, user["id"])
    if row["status"] != "draft":
        raise HTTPException(400, "Only draft tenders can be deleted")
    db.execute("DELETE FROM tenders WHERE id=?", (tid,))
    return {"deleted": tid}


@router.get("/api/caller/tenders/{tid}/submissions")
def list_submissions(tid: int, user=Depends(current_user)):
    _own_tender(tid, user["id"])
    return {"submissions": db.query("""
        SELECT s.*, u.company_name FROM submissions s
        JOIN users u ON u.id = s.bidder_user_id
        WHERE s.tender_id=? ORDER BY s.amount ASC""", (tid,))}


@router.post("/api/caller/tenders/{tid}/submissions/{sid}/status")
def set_submission_status(tid: int, sid: int, body: dict, user=Depends(current_user)):
    _own_tender(tid, user["id"])
    status = body.get("status")
    if status not in ("submitted", "shortlisted", "rejected"):
        raise HTTPException(400, "Unknown status")
    db.execute("UPDATE submissions SET status=? WHERE id=? AND tender_id=?",
              (status, sid, tid))
    return {"ok": True}


@router.post("/api/caller/tenders/{tid}/award")
def award_tender(tid: int, body: dict, user=Depends(current_user)):
    row = _own_tender(tid, user["id"])
    if row["status"] == "closed":
        raise HTTPException(400, "Tender already closed")
    subs = db.query("""SELECT s.*, u.company_name FROM submissions s
        JOIN users u ON u.id=s.bidder_user_id WHERE s.tender_id=? ORDER BY s.amount ASC""",
        (tid,))
    if not subs:
        raise HTTPException(400, "No submissions to award")

    winner_id = body.get("submission_id")
    ordered = sorted(subs, key=lambda s: s["amount"])
    winner = next((s for s in ordered if s["id"] == winner_id), ordered[0])

    # One award touches four tables (awards, bids, submissions, pipeline) plus
    # the tender itself -- a crash or error partway through must not leave a
    # tender marked open with some bidders already flipped to won/lost, or
    # vice versa. All of it commits together or none of it does.
    with db.transaction() as conn:
        award_id = db.execute("""
            INSERT INTO awards (ref_no,title,buyer,buyer_state,category,
                estimated_value,awarded_at,n_bidders,winner,winning_bid)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (row["ref_no"], row["title"], row["buyer"], row["buyer_state"], row["category"],
             row["estimated_value"], TODAY.isoformat(), len(ordered),
             winner["company_name"], winner["amount"]), conn=conn)

        for rank, s in enumerate(ordered, start=1):
            db.execute("INSERT INTO bids (award_id,bidder,amount,rank) VALUES (?,?,?,?)",
                      (award_id, s["company_name"], s["amount"], rank), conn=conn)
            new_status = "won" if s["id"] == winner["id"] else "lost"
            db.execute("UPDATE submissions SET status=? WHERE id=?",
                      (new_status, s["id"]), conn=conn)
            db.execute("""UPDATE pipeline SET status=?,updated_at=?
                         WHERE tender_id=? AND user_id=?""",
                      (new_status, TODAY.isoformat(), tid, s["bidder_user_id"]), conn=conn)

        db.execute("UPDATE tenders SET status='closed' WHERE id=?", (tid,), conn=conn)

    return {"award_id": award_id, "winner": winner["company_name"],
            "winning_bid": winner["amount"]}
