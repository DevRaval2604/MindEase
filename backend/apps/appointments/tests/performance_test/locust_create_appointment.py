# apps/appointments/tests/perf/locust_create_appointment.py
"""
Locust test for POST /api/appointments/create/

Env vars (optional):
 - PERF_APPT_TOKENS_FILE     (default appt_client_tokens.txt)
 - PERF_APPT_COUNSELLORS     (default appt_counsellors.txt)
 - PERF_APPT_PATH            (default /api/appointments/create/)
 - PERF_SHUFFLE              (1/0 default 1)  shuffle tokens/counsellors on load
 - PERF_REUSE_TOKENS         (1/0 default 0)  0: consume token once, 1: reuse tokens randomly
 - PERF_MIN_DAYS             (int default 1)  min days into future for appointment_date
 - PERF_MAX_DAYS             (int default 14) max days into future
 - PERF_RATE_LIMIT_WAIT      (float default 0.05) wait between requests per user
"""
from locust import HttpUser, task, between, events
from queue import Queue, Empty
from datetime import datetime, timedelta
import os
import random
import logging

logger = logging.getLogger("locust.appt")

TOKENS_FILE = os.getenv("PERF_APPT_TOKENS_FILE", "appt_client_tokens.txt")
COUNSELLORS_FILE = os.getenv("PERF_APPT_COUNSELLORS", "appt_counsellors.txt")
APPT_PATH = os.getenv("PERF_APPT_PATH", "/api/appointments/create/")
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
REUSE = os.getenv("PERF_REUSE_TOKENS", "0") == "1"
MIN_DAYS = int(os.getenv("PERF_MIN_DAYS", "1"))
MAX_DAYS = int(os.getenv("PERF_MAX_DAYS", "14"))

def load_tokens(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Tokens file not found: {path}")
    tokens = []
    with open(path, "r", encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            parts = ln.split("\t")
            token = parts[0].strip()
            if token:
                tokens.append(token)
    if SHUFFLE:
        random.shuffle(tokens)
    q = Queue()
    for t in tokens:
        q.put(t)
    logger.info("Loaded %d access tokens", len(tokens))
    return q, tokens

def load_counsellors(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Counsellors file not found: {path}")
    ids = []
    with open(path, "r", encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            ids.append(int(ln))
    if SHUFFLE:
        random.shuffle(ids)
    logger.info("Loaded %d counsellor ids", len(ids))
    return ids

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    q, list_tokens = load_tokens(TOKENS_FILE)
    environment.appt_token_q = q
    environment.appt_tokens_list = list_tokens
    environment.appt_counsellors = load_counsellors(COUNSELLORS_FILE)

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    q = getattr(environment, "appt_token_q", None)
    if q:
        logger.info("Test stopped. Tokens remaining: %d", q.qsize())

def make_iso_utc_future(days_min=1, days_max=14):
    # produce ISO8601 UTC time e.g. 2025-11-20T10:30:00Z
    days = random.randint(days_min, days_max)
    hour = random.randint(9, 17)
    minute = random.choice([0, 0, 30])  # bias to 0, sometimes 30
    dt = datetime.utcnow() + timedelta(days=days)
    dt = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return dt.isoformat() + "Z"

class CreateAppointmentUser(HttpUser):
    # tiny wait so we can tune RPS
    wait_time = between(0.02, 0.1)

    @task
    def create_appointment(self):
        # pick token
        if REUSE:
            tokens = getattr(self.environment, "appt_tokens_list", None)
            if not tokens:
                logger.error("No tokens list; stopping")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            token = random.choice(tokens)
        else:
            q = getattr(self.environment, "appt_token_q", None)
            if q is None:
                logger.error("No token queue; stopping")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            try:
                token = q.get_nowait()
            except Empty:
                logger.info("Tokens exhausted; stopping runner")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return

        # pick counsellor id
        couns = getattr(self.environment, "appt_counsellors", [])
        if not couns:
            logger.error("No counsellors loaded; stopping")
            try:
                self.environment.runner.quit()
            except Exception:
                pass
            return
        counsellor_id = random.choice(couns)

        payload = {
            "counsellor_id": counsellor_id,
            "appointment_date": make_iso_utc_future(MIN_DAYS, MAX_DAYS),
            "duration_minutes": random.choice([30, 45, 60]),
            "notes": f"Perf booking {random.randint(1,999999)}"
        }

        headers = {"Authorization": f"Bearer {token}"}
        with self.client.post(APPT_PATH, json=payload, headers=headers, catch_response=True, name="POST /appointments/create/") as resp:
            # Expect 201 CREATED
            if resp.status_code == 201:
                resp.success()
            else:
                # collect failure info
                resp.failure(f"status={resp.status_code} body={resp.text[:400]}")
