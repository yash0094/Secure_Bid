"""
Bidder's pipeline: watchlist -> preparing -> submitted -> won/lost, plus the
prep checklist (Kanban cards) and post-award milestones (Awards & Contracts).

    GET    /api/pipeline                       your bids and their status
    POST   /api/pipeline                       add/update a tender in the pipeline
    DELETE /api/pipeline/{id}                  remove
    GET    /api/pipeline/{id}/checklist        prep checklist items
    POST   /api/pipeline/{id}/checklist        add an item
    PUT    /api/pipeline/{id}/checklist/{cid}  toggle/edit an item
    DELETE /api/pipeline/{id}/checklist/{cid}  remove an item
    GET    /api/pipeline/{id}/milestones       delivery milestones (won bids)
    POST   /api/pipeline/{id}/milestones       add a milestone
    PUT    /api/pipeline/{id}/milestones/{mid} edit a milestone
    POST   /api/pipeline/{id}/emd-release      mark EMD released/held
"""

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..deps import current_user, require_role
from ..helpers import TODAY, days_left

router = APIRouter(tags=["pipeline"], dependencies=[Depends(require_role("bidder"))])

STATUSES = ("watching", "preparing", "submitted", "won", "lost", "dropped")


def _own_pipeline(pid, user_id):
    row = db.query_one("SELECT * FROM pipeline WHERE id=? AND user_id=?", (pid, user_id))
    if not row:
        raise HTTPException(404, "Not found")
    return row


@router.get("/api/pipeline")
def list_pipeline(user=Depends(current_user)):
    rows = db.query("""
        SELECT p.*, t.title, t.buyer, t.category, t.estimated_value, t.emd,
               t.closes_at, t.ref_no
        FROM pipeline p JOIN tenders t ON t.id = p.tender_id
        WHERE p.user_id=? ORDER BY t.closes_at""", (user["id"],))
    for r in rows:
        r["days_left"] = days_left(r["closes_at"])
        if r.get("our_bid") and r.get("cost_est"):
            r["margin"] = r["our_bid"] - r["cost_est"]
    return {"pipeline": rows}


@router.post("/api/pipeline")
def upsert_pipeline(body: dict, user=Depends(current_user)):
    tid = body.get("tender_id")
    if not tid:
        raise HTTPException(400, "Missing required field: tender_id")
    tid = int(tid)
    status = body.get("status", "watching")
    if status not in STATUSES:
        raise HTTPException(400, "Unknown status")
    tender = db.query_one("SELECT id FROM tenders WHERE id=?", (tid,))
    if not tender:
        raise HTTPException(404, "Tender not found")

    existing = db.query_one(
        "SELECT * FROM pipeline WHERE user_id=? AND tender_id=?", (user["id"], tid))
    fields = {
        "status": status,
        "our_bid": body.get("our_bid", existing["our_bid"] if existing else None),
        "cost_est": body.get("cost_est", existing["cost_est"] if existing else None),
        "emd_paid": body.get("emd_paid", existing["emd_paid"] if existing else 0) or 0,
        "notes": body.get("notes", existing["notes"] if existing else ""),
        "updated_at": TODAY.isoformat(),
    }
    if existing:
        db.execute("""UPDATE pipeline SET status=?,our_bid=?,cost_est=?,emd_paid=?,
                      notes=?,updated_at=? WHERE id=?""",
                   (fields["status"], fields["our_bid"], fields["cost_est"],
                    fields["emd_paid"], fields["notes"], fields["updated_at"],
                    existing["id"]))
        pid = existing["id"]
    else:
        pid = db.execute("""INSERT INTO pipeline
            (user_id,tender_id,status,our_bid,cost_est,emd_paid,notes,updated_at)
            VALUES (?,?,?,?,?,?,?,?)""",
                         (user["id"], tid, fields["status"], fields["our_bid"],
                          fields["cost_est"], fields["emd_paid"],
                          fields["notes"], fields["updated_at"]))

    # Keep the tender caller's evaluation view in sync with the bidder's pipeline.
    if status == "submitted" and fields["our_bid"]:
        db.execute("""
            INSERT INTO submissions (tender_id,bidder_user_id,amount,status,submitted_at)
            VALUES (?,?,?,'submitted',?)
            ON CONFLICT(tender_id,bidder_user_id)
            DO UPDATE SET amount=excluded.amount, submitted_at=excluded.submitted_at""",
            (tid, user["id"], fields["our_bid"], TODAY.isoformat()))

    return {"id": pid, **fields}


@router.delete("/api/pipeline/{pid}")
def delete_pipeline(pid: int, user=Depends(current_user)):
    db.execute("DELETE FROM pipeline WHERE id=? AND user_id=?", (pid, user["id"]))
    return {"deleted": pid}


# --------------------------------------------------------------- checklist

@router.get("/api/pipeline/{pid}/checklist")
def list_checklist(pid: int, user=Depends(current_user)):
    _own_pipeline(pid, user["id"])
    return {"checklist": db.query(
        "SELECT * FROM pipeline_checklist_items WHERE pipeline_id=? ORDER BY position",
        (pid,))}


@router.post("/api/pipeline/{pid}/checklist", status_code=201)
def add_checklist_item(pid: int, body: dict, user=Depends(current_user)):
    _own_pipeline(pid, user["id"])
    label = body.get("label")
    if not label:
        raise HTTPException(400, "Missing required field: label")
    pos = db.query_one(
        "SELECT COALESCE(MAX(position),-1)+1 AS n FROM pipeline_checklist_items WHERE pipeline_id=?",
        (pid,))["n"]
    cid = db.execute(
        "INSERT INTO pipeline_checklist_items (pipeline_id,label,done,position) VALUES (?,?,0,?)",
        (pid, label, pos))
    return {"id": cid, "label": label, "done": 0, "position": pos}


@router.put("/api/pipeline/{pid}/checklist/{cid}")
def update_checklist_item(pid: int, cid: int, body: dict, user=Depends(current_user)):
    _own_pipeline(pid, user["id"])
    sets, params = [], []
    if "label" in body:
        sets.append("label=?"); params.append(body["label"])
    if "done" in body:
        sets.append("done=?"); params.append(1 if body["done"] else 0)
    if sets:
        params += [pid, cid]
        db.execute(f"UPDATE pipeline_checklist_items SET {','.join(sets)} "
                   f"WHERE pipeline_id=? AND id=?", params)
    return {"ok": True}


@router.delete("/api/pipeline/{pid}/checklist/{cid}")
def delete_checklist_item(pid: int, cid: int, user=Depends(current_user)):
    _own_pipeline(pid, user["id"])
    db.execute("DELETE FROM pipeline_checklist_items WHERE pipeline_id=? AND id=?", (pid, cid))
    return {"deleted": cid}


# -------------------------------------------------------------- milestones

@router.get("/api/pipeline/{pid}/milestones")
def list_milestones(pid: int, user=Depends(current_user)):
    _own_pipeline(pid, user["id"])
    return {"milestones": db.query(
        "SELECT * FROM milestones WHERE pipeline_id=? ORDER BY due_date", (pid,))}


@router.post("/api/pipeline/{pid}/milestones", status_code=201)
def add_milestone(pid: int, body: dict, user=Depends(current_user)):
    row = _own_pipeline(pid, user["id"])
    if row["status"] != "won":
        raise HTTPException(400, "Milestones are for awarded (won) tenders")
    title = body.get("title")
    if not title:
        raise HTTPException(400, "Missing required field: title")
    mid = db.execute("""
        INSERT INTO milestones (pipeline_id,title,due_date,status,notes,created_at)
        VALUES (?,?,?,?,?,?)""",
        (pid, title, body.get("due_date"), body.get("status", "pending"),
         body.get("notes", ""), TODAY.isoformat()))
    return {"id": mid}


@router.put("/api/pipeline/{pid}/milestones/{mid}")
def update_milestone(pid: int, mid: int, body: dict, user=Depends(current_user)):
    _own_pipeline(pid, user["id"])
    sets, params = [], []
    for f in ("title", "due_date", "status", "notes"):
        if f in body:
            sets.append(f"{f}=?"); params.append(body[f])
    if sets:
        params += [pid, mid]
        db.execute(f"UPDATE milestones SET {','.join(sets)} WHERE pipeline_id=? AND id=?", params)
    return {"ok": True}


@router.post("/api/pipeline/{pid}/emd-release")
def set_emd_release(pid: int, body: dict, user=Depends(current_user)):
    row = _own_pipeline(pid, user["id"])
    status = body.get("status", "released")
    if status not in ("held", "released"):
        raise HTTPException(400, "Unknown status")
    db.execute("UPDATE pipeline SET emd_release_status=?,emd_release_date=? WHERE id=?",
               (status, TODAY.isoformat() if status == "released" else None, pid))
    return {"id": pid, "emd_release_status": status}
