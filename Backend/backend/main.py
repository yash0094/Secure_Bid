"""
SecureBid -- FastAPI application entry point.

Mounts every router, serves the built frontend (frontend/dist) as static
files with SPA fallback, and initialises/seeds the database on startup.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db, seed as seeder
from .engine import pricing
from .routers import (auth, tenders, pricing as pricing_router, pipeline,
                      portfolio, intel, dashboard, alerts, export, caller, official)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

app = FastAPI(title="SecureBid API")

# The frontend is served by this same app (mounted below) and the Vite dev
# server proxies /api server-side, so the browser never makes a cross-origin
# request in the documented setup -- CORS isn't actually needed by default.
# It's opt-in via env var for anyone running the frontend from a separate
# origin (e.g. a standalone Vite dev server without the proxy).
_allowed_origins = [o.strip() for o in
                   os.environ.get("SECUREBID_ALLOWED_ORIGINS", "").split(",") if o.strip()]
if _allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for r in (auth.router, tenders.router, pricing_router.router, pipeline.router,
         portfolio.router, intel.router, dashboard.router, alerts.router,
         export.router, caller.router, official.router):
    app.include_router(r)


@app.on_event("startup")
def _startup():
    db.init_db()
    if not db.is_seeded():
        seeder.seed()
    pricing.clear_cache()


if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
              name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
