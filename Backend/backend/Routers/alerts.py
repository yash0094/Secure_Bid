"""
Alerts & saved searches (bidder's TenderKart-style notification centre).

    GET    /api/alerts                  alert feed
    POST   /api/alerts/{id}/read        mark read
    GET    /api/saved-searches          list saved searches
    POST   /api/saved-searches          save a search
    DELETE /api/saved-searches/{id}     remove a saved search
    POST   /api/saved-searches/{id}/run run it now, returns matching tenders
"""

import json

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..deps import current_user, require_role
from ..helpers import TODAY, tender_public

router = APIRouter(tags=["alerts"], dependencies=[Depends(require_role("bidder"))])


@router.get("/api/alerts")
def list_alerts(user=Depends(current_user)):
    rows = db.query("""SELECT * FROM alerts WHERE user_id=?
                       ORDER BY read ASC, created_at DESC LIMIT 50""", (user["id"],))
    return {"alerts": rows, "unread": sum(1 for r in rows if not r["read"])}


@router.post("/api/alerts/{aid}/read")
def read_alert(aid: int, user=Depends(current_user)):
    db.execute("UPDATE alerts SET read=1 WHERE id=? AND user_id=?", (aid, user["id"]))
    return {"ok": True}


@router.get("/api/saved-searches")
def list_saved_searches(user=Depends(current_user)):
    rows = db.query("SELECT * FROM saved_searches WHERE user_id=? ORDER BY created_at DESC",
                    (user["id"],))
    for r in rows:
        r["params"] = db.jloads(r["params"], {})
    return {"saved_searches": rows}


@router.post("/api/saved-searches", status_code=201)
def create_saved_search(body: dict, user=Depends(current_user)):
    name = body.get("name")
    if not name:
        raise HTTPException(400, "Missing required field: name")
    params = body.get("params") or {}
    sid = db.execute(
        "INSERT INTO saved_searches (user_id,name,params,created_at) VALUES (?,?,?,?)",
        (user["id"], name, json.dumps(params), TODAY.isoformat()))
    return {"id": sid, "name": name, "params": params}


@router.delete("/api/saved-searches/{sid}")
def delete_saved_search(sid: int, user=Depends(current_user)):
    db.execute("DELETE FROM saved_searches WHERE id=? AND user_id=?", (sid, user["id"]))
    return {"deleted": sid}


@router.post("/api/saved-searches/{sid}/run")
def run_saved_search(sid: int, user=Depends(current_user)):
    row = db.query_one("SELECT * FROM saved_searches WHERE id=? AND user_id=?",
                       (sid, user["id"]))
    if not row:
        raise HTTPException(404, "Not found")
    params = db.jloads(row["params"], {})
    where, sql_params = ["status='published'"], []
    if params.get("q"):
        where.append("(LOWER(title) LIKE ? OR LOWER(buyer) LIKE ?)")
        like = f"%{params['q'].lower()}%"
        sql_params += [like, like]
    for field, key in (("buyer", "buyer"), ("category", "category"),
                       ("buyer_state", "state"), ("portal", "portal")):
        if params.get(key):
            where.append(f"{field}=?")
            sql_params.append(params[key])
    where.append("julianday(closes_at) >= julianday(?)")
    sql_params.append(TODAY.isoformat())
    rows = db.query(f"SELECT * FROM tenders WHERE {' AND '.join(where)} "
                    f"ORDER BY closes_at LIMIT 50", sql_params)
    return {"results": [tender_public(r) for r in rows]}
