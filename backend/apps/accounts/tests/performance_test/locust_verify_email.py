# apps/accounts/tests/perf/locust_verify_email.py
"""
Locust verify-email performance test.

Place file at: apps/accounts/tests/performance_test/locust_verify_email.py

Env vars (optional):
- PERF_VERIFY_TOKENS_FILE  (default: verify_tokens.txt)
- PERF_VERIFY_PATH         (default: /api/auth/verify-email/)
- PERF_VERIFY_SHUFFLE      (default: "1")  (set "0" to disable shuffle)
"""

from locust import HttpUser, task, between, events
from queue import Queue, Empty
import os
import random
import logging

logger = logging.getLogger("locust.verify")

TOKENS_FILE = os.getenv("PERF_VERIFY_TOKENS_FILE", "verify_tokens.txt")
VERIFY_PATH = os.getenv("PERF_VERIFY_PATH", "/api/auth/verify-email/")
SHUFFLE = os.getenv("PERF_VERIFY_SHUFFLE", "1") != "0"

# Shared queue stored on the environment (one per Locust process)
def load_tokens(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Tokens file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        # each line may be "rawtoken\temail" or just "rawtoken"
        lines = [ln.strip().split("\t", 1)[0].strip() for ln in fh if ln.strip()]
    if SHUFFLE:
        random.shuffle(lines)
    q = Queue()
    for raw in lines:
        q.put(raw)
    logger.info("Loaded %d tokens from %s", q.qsize(), path)
    return q

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Load tokens into environment.tokens_queue when the test starts.
    This runs in each Locust process; for single-process runs this is fine.
    For distributed runs you may want to run Locust single-process or provide per-worker token files.
    """
    try:
        environment.tokens_queue = load_tokens(TOKENS_FILE)
    except Exception as exc:
        # If tokens can't be loaded, we log and raise to prevent silent test start
        logger.exception("Failed to load tokens file: %s", exc)
        raise

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    logger.info("Test stopped. Tokens left: %s", getattr(environment, "tokens_queue").qsize() if getattr(environment, "tokens_queue", None) else "N/A")

class VerifyEmailUser(HttpUser):
    wait_time = between(0.01, 0.05)   # tune to control request pace per simulated user

    @task
    def post_verify(self):
        q = getattr(self.environment, "tokens_queue", None)
        if q is None:
            # No queue loaded (shouldn't happen because we raise on test_start) — stop quickly
            logger.error("No tokens queue available on environment; stopping runner.")
            try:
                self.environment.runner.quit()
            except Exception:
                pass
            return

        try:
            token = q.get_nowait()
        except Empty:
            # tokens exhausted -> stop test gracefully
            logger.info("Tokens exhausted. Stopping runner.")
            try:
                self.environment.runner.quit()
            except Exception:
                pass
            return

        payload = {"token": token}
        with self.client.post(VERIFY_PATH, json=payload, catch_response=True, name="POST /auth/verify-email") as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                # Mark failure so Locust will show counts; include small snippet for debugging
                resp.failure(f"status={resp.status_code} text={resp.text[:200]}")

