"""
Outbound mail for email verification and password reset.

Sends real mail via SMTP when SMTP_HOST is configured; otherwise falls back
to logging the message to the server console (the same pattern Django's
console email backend uses for local development). This means the
verification/reset *flow* is fully real and testable end-to-end even without
mail credentials on hand -- only the transport is stubbed.
"""

import os
import smtplib
import ssl
from email.message import EmailMessage

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM = os.environ.get("SMTP_FROM", "no-reply@securebid.in")


def send_mail(to, subject, body):
    if not SMTP_HOST:
        print(f"\n[mailer] No SMTP_HOST configured -- logging instead of sending.\n"
              f"[mailer] To: {to}\n[mailer] Subject: {subject}\n[mailer] {body}\n")
        return

    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls(context=context)
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD or "")
        server.send_message(msg)
