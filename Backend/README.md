# SecureBid

**New to the app? See [docs/MANUAL.md](docs/MANUAL.md)** for a full walkthrough of
every screen, role by role, with screenshots.

SecureBid is a procurement platform for Indian public tenders that serves **three
independent roles** from one application:

- **Bidder / Contractor (public)** — discover tenders, get an auction-theoretic bid
  price recommendation, run an EMD-constrained portfolio optimiser, track a bid
  pipeline (Kanban board with prep checklists and post-award milestones), see
  competitor intelligence and OECD-style collusion screens, run the offline
  eligibility clause parser, and get alerts from saved searches.
- **Tender Caller (buyer / procuring entity)** — author and publish tenders
  (with automatic eligibility-clause parsing), evaluate submitted bids, and
  award a winner. Awarding a tender writes into the historical awards/bids
  data that the bidder-side pricing, competitor and collusion engines learn from.
- **Government Official** — read-only, cross-department oversight: spend
  analytics, an award-value trend, a full tender registry, and system-wide
  collusion screens across every tender caller.

Each role signs in through its own colour-coded login page (`/login` blue,
`/login/buyer` teal, `/login/official` violet) and gets its own mobile-app-style
navigation: four core features fixed to a bottom bar, everything else behind a
slide-out menu — see [docs/MANUAL.md](docs/MANUAL.md) for the full map.

It is a self-contained app with its own FastAPI backend, SQLite database, and
React frontend — no dependency on SAP Ariba, TenderKart, or any other
third-party API. The one optional exception is Google Sign-In (§ below),
which calls Google's own servers to verify a credential when configured;
without that configuration the app makes no external calls at all.

## Architecture

- **Backend**: FastAPI (Python 3.9+), SQLite. The auction-pricing engine, EMD
  knapsack optimiser, eligibility parser and OECD collusion screens
  (`backend/engine/`) are pure-Python, dependency-free statistics code.
- **Frontend**: React + TypeScript, built with Vite, styled with Tailwind CSS,
  charts via Recharts, data fetching via TanStack Query.
- **Auth**: PBKDF2-SHA256 password hashing + HMAC-signed bearer tokens (one
  week TTL). Set `SECUREBID_SECRET` in production. Tokens carry a version
  number checked against the account's current one on every request, so
  logout and password reset revoke *every* outstanding token immediately
  (there's no session table to track devices individually — it's sign-out-
  everywhere, not per-device). Email verification and password reset links
  are sent through `backend/mailer.py`, which sends real mail via SMTP if
  `SMTP_HOST` (+ `SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`) is set,
  and otherwise logs the message (and link) to the server console — useful
  for local development without mail credentials on hand.
- **CORS** is off by default (the frontend is served by this same app, and
  the Vite dev proxy keeps requests same-origin, so it isn't needed). Set
  `SECUREBID_ALLOWED_ORIGINS` (comma-separated) only if you're serving the
  frontend from a different origin than the API.
- **Google Sign-In** (Bidder portal only, in addition to email/password) is
  real, not a demo — but it's off until you configure it, since it needs a
  credential only you can create. Steps:
  1. In [Google Cloud Console](https://console.cloud.google.com), go to
     **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
     choose **Web application**, and add this app's URL (e.g.
     `http://localhost:8000`, or your real domain in production) as an
     **Authorized JavaScript origin**. No redirect URI or client secret is
     needed for this flow.
  2. Set `GOOGLE_CLIENT_ID` in the server's environment to that client ID
     and restart. The frontend picks it up at runtime from `GET /api/config`
     — no rebuild required.
  3. The "Continue with Google" button appears automatically on the Bidder
     sign-in page once configured; it's simply absent otherwise. The backend
     (`backend/routers/auth.py`, `POST /api/auth/google`) verifies the ID
     token against Google's public keys via the `google-auth` package before
     creating or signing in a bidder account — it never trusts the frontend's
     word for who signed in.

## Run locally

```bash
# 1. Backend deps
pip install -r requirements.txt

# 2. Build the frontend
cd frontend
npm install
npm run build
cd ..

# 3. Run (seeds a demo database on first launch)
python run.py
```

Then open `http://localhost:8000`. Demo logins:

| Role            | Email                      | Password  |
|-----------------|-----------------------------|-----------|
| Bidder          | `demo@securebid.in`         | `demo1234` |
| Tender Caller   | `buyer@securebid.in`        | `demo1234` |
| Government Official | `official@securebid.in` | `demo1234` |

Options: `python run.py --port 9000`, `--reseed` (wipe and regenerate demo
data), `--seed-only` (build the DB and exit), `--open` (launch a browser).

For frontend-only iteration, run `npm run dev` inside `frontend/` (proxies
`/api` to `http://127.0.0.1:8000` — start the backend separately with
`python run.py`).

## Tests

```bash
python tests/run_tests.py
```

Runs 62 tests in one go: the original 49 covering statistics, auction maths,
the knapsack optimiser and the eligibility parser (stdlib only), plus 13 API
tests (`tests/test_api.py`, needs `httpx` — already in `requirements.txt`)
covering role gating, token revocation, the email verification/password
reset flow, and that awarding a tender updates awards/bids/submissions/
pipeline atomically (or not at all). The API tests run against a throwaway
SQLite database, never your real one.

## Deploying

A `Dockerfile` is included (multi-stage: builds the frontend, then runs the
FastAPI app with the built assets baked in). Any platform that builds from a
Dockerfile (Render, Railway, Fly.io, etc.) works out of the box:

```bash
docker build -t securebid .
docker run -p 8000:8000 -e SECUREBID_SECRET=<a-long-random-secret> securebid
```

Set `SECUREBID_SECRET` to a long random value and put the app behind HTTPS
before using it with real data — the default secret is for local development
only. `PORT` is read from the environment if set (most PaaS platforms set
this automatically).

The demo data generator (`backend/seed.py`) is for the runnable demo; a real
deployment would replace it with your actual tender/award ingestion.
