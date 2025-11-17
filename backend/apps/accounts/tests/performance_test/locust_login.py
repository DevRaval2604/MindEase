# apps/accounts/tests/perf/locust_login_only.py
"""
Locust performance test that ONLY exercises the login endpoint.

Place under: apps/accounts/tests/perf/locust_login_only.py

Behavior:
- Loads credentials file (email<TAB>password per line) at test start.
- Two modes:
    * ONE_TIME (default): each credential is used once (consumed from a queue). When exhausted the test stops.
    * REUSE: credentials are reused (random pick) so the run can continue indefinitely.
- Posts to the login endpoint only and records success/failure.
- Configurable paths & behavior via environment variables.

Env vars:
- PERF_LOGIN_FILE      path to credentials file (default: login_users.txt)
- PERF_LOGIN_PATH      login endpoint path (default: /api/auth/login/)
- PERF_SHUFFLE         "1"/"0" shuffle credentials on load (default "1")
- PERF_REUSE_CREDENTIALS   "1"/"0" reuse creds instead of consuming (default "0")
- PERF_FAIL_ON_4XX     "1"/"0" treat 4xx as failures (default "1")
"""

from locust import HttpUser, task, between, events
from queue import Queue, Empty
import os
import random
import logging

logger = logging.getLogger("locust.login_only")

# Configuration via environment
CRED_FILE = os.getenv("PERF_LOGIN_FILE", "login_users.txt")
LOGIN_PATH = os.getenv("PERF_LOGIN_PATH", "/api/auth/login/")
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
REUSE_CREDS = os.getenv("PERF_REUSE_CREDENTIALS", "0") == "1"
FAIL_ON_4XX = os.getenv("PERF_FAIL_ON_4XX", "1") == "1"

def load_credentials(path):
    """
    Returns (queue, list) where queue is a FIFO Queue of credentials (for one-time mode)
    and list is a Python list of tuples (email, password) used for reuse mode.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Credentials file not found: {path}")

    creds = []
    with open(path, "r", encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            parts = ln.split("\t")
            if len(parts) >= 2:
                creds.append((parts[0].strip(), parts[1].strip()))
            else:
                logger.warning("Skipping malformed credentials line: %s", ln)

    if not creds:
        raise ValueError("No valid credentials found in file.")

    if SHUFFLE:
        random.shuffle(creds)

    q = Queue()
    for c in creds:
        q.put(c)
    logger.info("Loaded %d credentials from %s (shuffle=%s)", len(creds), path, SHUFFLE)
    return q, creds

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Loads credentials into the environment.
    This runs once per Locust process (single-process or worker process).
    """
    try:
        q, creds = load_credentials(CRED_FILE)
        environment.login_queue = q          # used in ONE_TIME mode
        environment.login_creds_list = creds # used in REUSE mode
    except Exception as exc:
        logger.exception("Failed to load credentials: %s", exc)
        # Raise to stop test startup and make the failure obvious
        raise

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    q = getattr(environment, "login_queue", None)
    if q is not None:
        remaining = q.qsize()
        logger.info("Test stopped. Credentials remaining in queue: %d", remaining)

class LoginOnlyUser(HttpUser):
    """
    Simulated user that performs only login requests.
    """
    # tune wait_time to control per-user pacing
    wait_time = between(0.05, 0.2)

    @task
    def login_only(self):
        """
        For ONE_TIME mode: dequeue a credential and use it once.
        For REUSE mode: pick a random credential from the loaded list and use it.
        """
        if REUSE_CREDS:
            creds = getattr(self.environment, "login_creds_list", None)
            if not creds:
                logger.error("No credentials list available on environment; stopping.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            email, password = random.choice(creds)
        else:
            q = getattr(self.environment, "login_queue", None)
            if q is None:
                logger.error("No login_queue available on environment; stopping.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            try:
                email, password = q.get_nowait()
            except Empty:
                logger.info("Credentials exhausted. Stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return

        payload = {"email": email, "password": password}
        # POST login only
        with self.client.post(LOGIN_PATH, json=payload, catch_response=True, name="POST /auth/login") as resp:
            status = resp.status_code
            if status == 200:
                resp.success()
            else:
                # treat 4xx as failure by default (use FAIL_ON_4XX to change)
                if 400 <= status < 500 and not FAIL_ON_4XX:
                    resp.success()
                else:
                    # include part of response body for debugging
                    resp.failure(f"status={status} text={resp.text[:300]}")
