#!/usr/bin/env python3
"""
API-level tests for the parts of SecureBid that sit above the pure engine
code already covered by run_tests.py: role gating, token revocation,
email verification / password reset, and the award flow's atomicity.

Uses FastAPI's TestClient against a throwaway SQLite database (never the
real dev one) so this is safe to run any time, including in CI.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Must happen before backend.db (or anything importing it) is loaded --
# DB_PATH is read from this env var at import time.
TEST_DB = tempfile.mktemp(suffix=".db")
os.environ["SECUREBID_DB_PATH"] = TEST_DB
os.environ.setdefault("SECUREBID_SECRET", "test-secret-not-for-prod")

from fastapi.testclient import TestClient      # noqa: E402
from backend.main import app                    # noqa: E402
from backend.auth import make_action_token      # noqa: E402


def register(client, role, email, password="demo1234", company="Test Co", **extra):
    payload = {"email": email, "password": password, "company_name": company, "role": role}
    payload.update(extra)
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def login(client, email, password="demo1234"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


class SecureBidApiTests(unittest.TestCase):
    """One shared app/client for the whole module -- the FastAPI lifespan
    (startup event) seeds the throwaway database once here, and every test
    uses its own unique emails so tests don't interfere with each other."""

    @classmethod
    def setUpClass(cls):
        cls._cm = TestClient(app)
        cls.client = cls._cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._cm.__exit__(None, None, None)
        for suffix in ("", "-wal", "-shm"):
            try:
                os.remove(TEST_DB + suffix)
            except OSError:
                pass

    # --------------------------------------------------------- role gating

    def test_register_account_starts_unverified(self):
        data = register(self.client, "bidder", "unverified@test.com")
        self.assertFalse(data["user"]["email_verified"])

    def test_bidder_cannot_reach_caller_endpoints(self):
        data = register(self.client, "bidder", "gate-bidder@test.com")
        r = self.client.get("/api/caller/tenders", headers=auth(data["token"]))
        self.assertEqual(r.status_code, 403)

    def test_caller_cannot_reach_bidder_pipeline(self):
        data = register(self.client, "tender_caller", "gate-caller@test.com",
                        org_profile={"org_name": "Test Dept"})
        r = self.client.get("/api/pipeline", headers=auth(data["token"]))
        self.assertEqual(r.status_code, 403)

    def test_official_cannot_reach_caller_or_bidder_endpoints(self):
        data = register(self.client, "official", "gate-official@test.com",
                        org_profile={"org_name": "Oversight Dept"})
        h = auth(data["token"])
        self.assertEqual(self.client.get("/api/caller/tenders", headers=h).status_code, 403)
        self.assertEqual(self.client.get("/api/pipeline", headers=h).status_code, 403)
        self.assertEqual(self.client.get("/api/official/overview", headers=h).status_code, 200)

    # ------------------------------------------------------ token revocation

    def test_logout_revokes_the_token_that_was_used_to_log_out(self):
        data = register(self.client, "bidder", "revoke@test.com")
        h = auth(data["token"])
        self.assertEqual(self.client.get("/api/me", headers=h).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout", headers=h).status_code, 200)
        self.assertEqual(self.client.get("/api/me", headers=h).status_code, 401)

    def test_logging_in_again_revokes_the_previous_session(self):
        """Only one active session per account -- signing in a second time
        (another tab, another device) must silently kill the first token
        rather than letting both work at once."""
        register(self.client, "bidder", "single-session@test.com")
        token_a = login(self.client, "single-session@test.com")["token"]
        self.assertEqual(self.client.get("/api/me", headers=auth(token_a)).status_code, 200)

        token_b = login(self.client, "single-session@test.com")["token"]
        self.assertEqual(self.client.get("/api/me", headers=auth(token_a)).status_code, 401)
        self.assertEqual(self.client.get("/api/me", headers=auth(token_b)).status_code, 200)

    def test_logout_also_revokes_the_session_it_was_called_with(self):
        register(self.client, "bidder", "revoke-multi@test.com")
        token = login(self.client, "revoke-multi@test.com")["token"]
        self.client.post("/api/auth/logout", headers=auth(token))
        self.assertEqual(self.client.get("/api/me", headers=auth(token)).status_code, 401)

    # ------------------------------------------------- verification / reset

    def test_email_verification_flow(self):
        data = register(self.client, "bidder", "verify@test.com")
        token = make_action_token("verify_email", data["user"]["id"])
        r = self.client.get("/api/auth/verify-email", params={"token": token})
        self.assertEqual(r.status_code, 200)
        me = login(self.client, "verify@test.com")
        self.assertTrue(me["user"]["email_verified"])

    def test_verify_email_rejects_garbage_token(self):
        r = self.client.get("/api/auth/verify-email", params={"token": "not-a-real-token"})
        self.assertEqual(r.status_code, 400)

    def test_password_reset_sets_new_password_and_revokes_old_sessions(self):
        data = register(self.client, "bidder", "reset@test.com")
        old_token = data["token"]
        reset_token = make_action_token("reset_password", data["user"]["id"])

        r = self.client.post("/api/auth/reset-password",
                             json={"token": reset_token, "password": "brand-new-pass1"})
        self.assertEqual(r.status_code, 200)

        self.assertEqual(self.client.get("/api/me", headers=auth(old_token)).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login",
            json={"email": "reset@test.com", "password": "demo1234"}).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login",
            json={"email": "reset@test.com", "password": "brand-new-pass1"}).status_code, 200)

    def test_a_verify_email_token_cannot_be_used_to_reset_a_password(self):
        """Purpose-scoping: an action token minted for one purpose must be
        refused for another, even though the signature is otherwise valid."""
        data = register(self.client, "bidder", "cross-purpose@test.com")
        verify_token = make_action_token("verify_email", data["user"]["id"])
        r = self.client.post("/api/auth/reset-password",
                             json={"token": verify_token, "password": "whatever12"})
        self.assertEqual(r.status_code, 400)

    def test_password_reset_request_does_not_reveal_whether_email_exists(self):
        register(self.client, "bidder", "reset-enum-check@test.com")
        r1 = self.client.post("/api/auth/request-password-reset",
                              json={"email": "no-such-account@test.com"})
        r2 = self.client.post("/api/auth/request-password-reset",
                              json={"email": "reset-enum-check@test.com"})
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json(), r2.json())

    # -------------------------------------------------------- award flow

    def test_award_flow_updates_awards_bids_submissions_and_pipeline_together(self):
        caller = register(self.client, "tender_caller", "award-caller@test.com",
                          company="Award Test Dept",
                          org_profile={"org_name": "Award Test Dept"})
        bidder = register(self.client, "bidder", "award-bidder@test.com",
                          company="Award Test Bidder Co")
        ch, bh = auth(caller["token"]), auth(bidder["token"])

        created = self.client.post("/api/caller/tenders", headers=ch, json={
            "title": "Test culvert works", "category": "Civil Works",
            "estimated_value": 5000000, "closes_at": "2027-01-01",
            "status": "published",
        }).json()
        tid = created["id"]

        # bidder submits by moving their pipeline card to "submitted"
        r = self.client.post("/api/pipeline", headers=bh,
                             json={"tender_id": tid, "status": "submitted", "our_bid": 4800000})
        self.assertEqual(r.status_code, 200)

        subs = self.client.get(f"/api/caller/tenders/{tid}/submissions", headers=ch).json()
        self.assertEqual(len(subs["submissions"]), 1)
        sub_id = subs["submissions"][0]["id"]

        award = self.client.post(f"/api/caller/tenders/{tid}/award", headers=ch,
                                 json={"submission_id": sub_id})
        self.assertEqual(award.status_code, 200, award.text)

        # tender closed
        detail = self.client.get(f"/api/caller/tenders/{tid}", headers=ch).json()
        self.assertEqual(detail["status"], "closed")

        # submission flipped to won
        subs_after = self.client.get(f"/api/caller/tenders/{tid}/submissions", headers=ch).json()
        self.assertEqual(subs_after["submissions"][0]["status"], "won")

        # bidder's pipeline card flipped to won too, in the same operation
        pipe = self.client.get("/api/pipeline", headers=bh).json()["pipeline"]
        card = next(p for p in pipe if p["tender_id"] == tid)
        self.assertEqual(card["status"], "won")

    def test_awarding_twice_does_not_duplicate_history(self):
        """A second award call on an already-closed tender must not silently
        create a second awards/bids row -- the tender is closed, so it should
        be rejected outright rather than left to the caller to notice."""
        caller = register(self.client, "tender_caller", "award-caller2@test.com",
                          org_profile={"org_name": "Award Test Dept 2"})
        bidder = register(self.client, "bidder", "award-bidder2@test.com")
        ch, bh = auth(caller["token"]), auth(bidder["token"])

        tid = self.client.post("/api/caller/tenders", headers=ch, json={
            "title": "Test road patch works", "category": "Road Works",
            "estimated_value": 2000000, "closes_at": "2027-01-01", "status": "published",
        }).json()["id"]
        self.client.post("/api/pipeline", headers=bh,
                         json={"tender_id": tid, "status": "submitted", "our_bid": 1900000})
        sub_id = self.client.get(f"/api/caller/tenders/{tid}/submissions",
                                 headers=ch).json()["submissions"][0]["id"]

        first = self.client.post(f"/api/caller/tenders/{tid}/award", headers=ch,
                                 json={"submission_id": sub_id})
        self.assertEqual(first.status_code, 200)

        second = self.client.post(f"/api/caller/tenders/{tid}/award", headers=ch,
                                  json={"submission_id": sub_id})
        self.assertEqual(second.status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
