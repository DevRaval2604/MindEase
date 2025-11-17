# apps/accounts/tests/perf/locust_resend_verification.py
"""
Locust performance test for POST /api/auth/resend-verification/

Environment variables (optional):
- PERF_RESEND_FILE   (default: resend_emails.txt)
- PERF_RESEND_PATH   (default: /api/auth/resend-verification/)
- PERF_SHUFFLE       (default: "1")  (set "0" to disable shuffle)
- PERF_NONEXIST_RATIO (optional float 0..1 additional on-the-fly non-existing email ratio per request)
"""

from locust import HttpUser, task, between, events
from queue import Queue, Empty
import os
import random
import logging
import uuid

logger = logging.getLogger("locust.resend")

EMAILS_FILE = os.getenv("PERF_RESEND_FILE", "resend_emails.txt")
RESEND_PATH = os.getenv("PERF_RESEND_PATH", "/api/auth/resend-verification/")
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
NONEXIST_RATIO = float(os.getenv("PERF_NONEXIST_RATIO", "0") or 0.0)

def load_emails(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Emails file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        lines = [ln.strip() for ln in fh if ln.strip()]
    if SHUFFLE:
        random.shuffle(lines)
    q = Queue()
    for l in lines:
        q.put(l)
    logger.info("Loaded %d emails from %s", q.qsize(), path)
    return q

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    try:
        environment.emails_queue = load_emails(EMAILS_FILE)
    except Exception as exc:
        logger.exception("Failed loading emails file: %s", exc)
        raise

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    q = getattr(environment, "emails_queue", None)
    if q is not None:
        logger.info("Test finished. Emails remaining: %d", q.qsize())

class ResendUser(HttpUser):
    wait_time = between(0.1, 0.5)  # tune to control per-user pacing

    @task
    def resend(self):
        q = getattr(self.environment, "emails_queue", None)
        if q is None:
            logger.error("No emails queue available on environment; stopping runner.")
            try:
                self.environment.runner.quit()
            except Exception:
                pass
            return

        # Decide whether to use a queued email or generate a random non-existing email
        use_nonexist = random.random() < NONEXIST_RATIO
        if use_nonexist:
            email = f"nonexist+{uuid.uuid4().hex[:10]}@perf.local"
        else:
            try:
                email = q.get_nowait()
            except Empty:
                # No queued emails — optionally stop or loop
                logger.info("Emails exhausted. Stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return

        payload = {"email": email}
        with self.client.post(RESEND_PATH, json=payload, catch_response=True, name="POST /auth/resend-verification") as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 429:
                # Mark throttles clearly so you can see them in reports
                resp.failure(f"THROTTLED: {resp.status_code} text={resp.text[:200]}")
            else:
                resp.failure(f"status={resp.status_code} text={resp.text[:200]}")
