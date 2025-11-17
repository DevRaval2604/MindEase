# apps/accounts/tests/perf/locust_logout.py
"""
Locust performance test for POST /api/auth/logout/

Files:
 - Tokens file (default 'logout_tokens.txt') should contain lines: <refresh_token>\\t<email>

Env vars:
 - PERF_LOGOUT_TOKENS_FILE  (default logout_tokens.txt)
 - PERF_LOGOUT_PATH         (default /api/auth/logout/)
 - PERF_SHUFFLE             (1/0 default 1) shuffle tokens on load
 - PERF_REUSE_TOKENS        (1/0 default 0) 1 => reuse tokens randomly, 0 => consume once
 - PERF_ALL_RATIO           (float 0..1 default 0.0) fraction of requests that include {"all": true}
"""

from locust import HttpUser, task, between, events
from queue import Queue, Empty
import os
import random
import logging

logger = logging.getLogger("locust.logout")

TOKENS_FILE = os.getenv("PERF_LOGOUT_TOKENS_FILE", "logout_tokens.txt")
LOGOUT_PATH = os.getenv("PERF_LOGOUT_PATH", "/api/auth/logout/")
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
REUSE = os.getenv("PERF_REUSE_TOKENS", "0") == "1"
ALL_RATIO = float(os.getenv("PERF_ALL_RATIO", "0.0") or 0.0)

def load_tokens(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Tokens file not found: {path}")
    lines = []
    with open(path, "r", encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            parts = ln.split("\t", 1)
            token = parts[0].strip()
            if token:
                lines.append(token)
    if not lines:
        raise ValueError("No tokens found in tokens file.")
    if SHUFFLE:
        random.shuffle(lines)
    q = Queue()
    for t in lines:
        q.put(t)
    logger.info("Loaded %d refresh tokens from %s (shuffle=%s)", len(lines), path, SHUFFLE)
    return q, lines

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    try:
        q, lines = load_tokens(TOKENS_FILE)
        environment.logout_queue = q
        environment.logout_tokens_list = lines  # for reuse mode
    except Exception as exc:
        logger.exception("Failed to load logout tokens: %s", exc)
        raise

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    q = getattr(environment, "logout_queue", None)
    if q is not None:
        logger.info("Test stopped. Tokens remaining: %d", q.qsize())

class LogoutUser(HttpUser):
    wait_time = between(0.02, 0.2)

    @task
    def do_logout(self):
        # choose token
        if REUSE:
            tokens = getattr(self.environment, "logout_tokens_list", None)
            if not tokens:
                logger.error("No logout tokens list available; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            token = random.choice(tokens)
        else:
            q = getattr(self.environment, "logout_queue", None)
            if q is None:
                logger.error("No logout_queue available; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            try:
                token = q.get_nowait()
            except Empty:
                logger.info("Logout tokens exhausted; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return

        payload = {"refresh": token}
        # sometimes include {"all": true} to exercise 'logout from all sessions'
        if random.random() < ALL_RATIO:
            payload["all"] = True

        with self.client.post(LOGOUT_PATH, json=payload, catch_response=True, name="POST /auth/logout") as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                # mark as failure to observe error patterns
                resp.failure(f"status={resp.status_code} text={resp.text[:250]}")
