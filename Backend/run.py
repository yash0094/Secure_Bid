#!/usr/bin/env python3
"""
SecureBid -- entry point.

    python3 run.py                 seed if needed, then serve on :8000
    python3 run.py --port 9000     different port
    python3 run.py --reseed        wipe and regenerate the demo data
    python3 run.py --seed-only     build the database and exit

Requires: fastapi, uvicorn (see requirements.txt). The frontend must be built
first (`cd frontend && npm install && npm run build`) for this to serve the
UI; the API alone works without that.
"""

import argparse
import os
import sys
import webbrowser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend import db, seed as seeder            # noqa: E402
from backend.engine import pricing                # noqa: E402

BANNER = r"""
  ____                           ____  _     _
 / ___|  ___  ___ _   _ _ __ ___| __ )(_) __| |
 \___ \ / _ \/ __| | | | '__/ _ \  _ \| |/ _` |
  ___) |  __/ (__| |_| | | |  __/ |_) | | (_| |
 |____/ \___|\___|\__,_|_|  \___|____/|_|\__,_|

 Tender discovery, procurement workflow & auction-theoretic bid pricing
"""


def main():
    _p = os.environ.get("PORT")
    ap = argparse.ArgumentParser(description="Run SecureBid")
    ap.add_argument("--port", type=int, default=int(_p) if _p and _p.isdigit() else 8000)
    ap.add_argument("--host", default="0.0.0.0" if _p else "127.0.0.1")
    ap.add_argument("--reseed", action="store_true",
                    help="delete the database and regenerate demo data")
    ap.add_argument("--seed-only", action="store_true")
    ap.add_argument("--open", action="store_true",
                    help="open a browser window once the server is up")
    args = ap.parse_args()

    if args.reseed and os.path.exists(db.DB_PATH):
        for suffix in ("", "-wal", "-shm"):
            p = db.DB_PATH + suffix
            if os.path.exists(p):
                os.remove(p)
        print("Removed existing database.")

    db.init_db()
    if not db.is_seeded():
        print("Generating demo corpus (this takes a few seconds)...")
        seeder.seed()
    pricing.clear_cache()

    if args.seed_only:
        return

    print(BANNER)
    counts = db.query_one("""
        SELECT (SELECT COUNT(*) FROM tenders) AS tenders,
               (SELECT COUNT(*) FROM awards)  AS awards,
               (SELECT COUNT(*) FROM bids)    AS bids""")
    print(f" {counts['tenders']} live tenders | {counts['awards']} historical "
          f"awards | {counts['bids']} recorded bids")
    print(f"\n  ->  http://{args.host}:{args.port}")
    print("  ->  demo logins:")
    print("        bidder    demo@securebid.in    / demo1234")
    print("        buyer     buyer@securebid.in   / demo1234")
    print("        official  official@securebid.in / demo1234")
    print("\n Ctrl-C to stop.\n")

    if args.open:
        webbrowser.open(f"http://{args.host}:{args.port}")

    import uvicorn
    uvicorn.run("backend.main:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
