# apps/accounts/tests/perf/locust_profile.py
"""
Locust performance test for Profile API.

Place under: apps/accounts/tests/perf/locust_profile.py

Behavior:
 - Loads access tokens file (one line per token: <access_token>\\t<email>)
 - Performs GET /profile (read)
 - Optionally performs PATCH /profile (write) at a configurable ratio
 - Uses Authorization: Bearer <access_token> header (no cookies)

Environment variables:
 - PERF_PROFILE_TOKENS_FILE   (default: profile_tokens.txt)
 - PERF_PROFILE_PATH          (default: /api/accounts/profile/)
 - PERF_PATCH_RATIO           (float 0..1 default 0.1) fraction of requests that are PATCH
 - PERF_SHUFFLE               (1/0 default 1) whether to shuffle tokens on load
 - PERF_PATCH_FIRSTNAME_LIST  optional comma-separated first names to pick from for PATCH
"""

from locust import HttpUser, task, between, events
import os
import random
import logging
from queue import Queue, Empty

logger = logging.getLogger("locust.profile")

TOKENS_FILE = os.getenv("PERF_PROFILE_TOKENS_FILE", "profile_tokens.txt")
PROFILE_PATH = os.getenv("PERF_PROFILE_PATH", "/api/auth/profile/")
PATCH_RATIO = float(os.getenv("PERF_PATCH_RATIO", "0.1"))
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
FIRSTNAMES = os.getenv("PERF_PATCH_FIRSTNAME_LIST", "PerfTest,LoadUser,Auto").split(",") if os.getenv("PERF_PATCH_FIRSTNAME_LIST") else ["PerfTest"]

def load_tokens(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Tokens file not found: {path}")
    tokens = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t", 1)
            token = parts[0].strip()
            if token:
                tokens.append(token)
    if not tokens:
        raise ValueError("No tokens found in tokens file.")
    if SHUFFLE:
        random.shuffle(tokens)
    q = Queue()
    for t in tokens:
        q.put(t)
    logger.info("Loaded %d access tokens from %s (shuffle=%s)", len(tokens), path, SHUFFLE)
    return q

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    try:
        environment.tokens_queue = load_tokens(TOKENS_FILE)
    except Exception as exc:
        logger.exception("Failed to load tokens: %s", exc)
        raise

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    q = getattr(environment, "tokens_queue", None)
    if q:
        logger.info("Test stopped. Tokens remaining: %d", q.qsize())

class ProfileUser(HttpUser):
    wait_time = between(0.05, 0.2)

    def _pick_token(self):
        """
        In this design we re-use tokens by randomly picking from the initial list,
        but also support dequeueing them for one-shot flows. Here we will reuse tokens
        by sampling the queue contents. To keep it simple and safe we convert queue to list
        on-demand if needed.
        """
        q = getattr(self.environment, "tokens_queue", None)
        if q is None:
            return None
        # non-destructive random sample: pop then put back to preserve queue (simple approach)
        try:
            token = q.get_nowait()
            q.put(token)
            return token
        except Empty:
            return None

    @task
    def profile_op(self):
        token = self._pick_token()
        if not token:
            logger.info("No tokens available; stopping runner.")
            try:
                self.environment.runner.quit()
            except Exception:
                pass
            return

        headers = {"Authorization": f"Bearer {token}"}
        # choose GET or PATCH
        if random.random() < PATCH_RATIO:
            # PATCH payload: update first_name and bio (works for both client & counsellor)
            fname = random.choice(FIRSTNAMES).strip() or "Perf"
            payload = {
                "first_name": fname,
                "bio": f"load test {random.randint(0,99999)}"
            }
            with self.client.patch(PROFILE_PATH, json=payload, headers=headers, catch_response=True, name="PATCH /profile") as resp:
                if resp.status_code in (200, 204):
                    resp.success()
                else:
                    resp.failure(f"PATCH failed status={resp.status_code} body={resp.text[:300]}")
        else:
            with self.client.get(PROFILE_PATH, headers=headers, catch_response=True, name="GET /profile") as resp:
                if resp.status_code == 200:
                    resp.success()
                else:
                    resp.failure(f"GET failed status={resp.status_code} body={resp.text[:300]}")
