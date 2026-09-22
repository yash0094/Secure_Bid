"""GET /api/export/tenders -- CSV of the current search."""

from fastapi import APIRouter, Depends, Request

from ..deps import require_role
from .tenders import search_rows

router = APIRouter(tags=["export"], dependencies=[Depends(require_role("bidder"))])


def _csv(v):
    s = "" if v is None else str(v)
    return '"' + s.replace('"', '""') + '"' if any(c in s for c in ',"\n') else s


@router.get("/api/export/tenders")
def export_tenders(request: Request):
    rows = search_rows(request)
    cols = ["ref_no", "title", "buyer", "buyer_state", "category", "portal",
            "estimated_value", "emd", "published_at", "closes_at"]
    lines = [",".join(cols)]
    for r in rows:
        lines.append(",".join(_csv(r[c]) for c in cols))
    return {"filename": "tenders.csv", "csv": "\n".join(lines), "rows": len(rows)}
