# apps/accounts/tests/perf/locust_signup.py
"""
Locust performance test for signup API that creates both clients and counsellors.

Place under: apps/accounts/tests/perf/locust_signup.py

Environment variables (optional):
- PERF_SIGNUP_PATH (default: /api/accounts/signup/)
- PERF_EMAIL_DOMAIN (default: perf.local)
- COUNSELLOR_RATIO (float 0..1 default 0.2) -- fraction of attempts that try to create counsellors
- SPECIALIZATION_IDS (comma-separated ints, e.g. "1,2,3")
- AVAILABILITY_IDS (comma-separated ints, e.g. "5,6,7")
- PERF_SIGNUP_ATTEMPTS (int default 0 -> infinite attempts per simulated user)
"""

from locust import HttpUser, task, between
import uuid
import random
import string
import os
import itertools
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

# Configurable via environment
SIGNUP_PATH = os.getenv("PERF_SIGNUP_PATH", "/api/auth/signup/")
EMAIL_DOMAIN = os.getenv("PERF_EMAIL_DOMAIN", "perf.local")
COUNSELLOR_RATIO = float(os.getenv("COUNSELLOR_RATIO", "0.5"))
SPECIALIZATION_IDS = os.getenv("SPECIALIZATION_IDS", "1,2,3,4,5")
AVAILABILITY_IDS = os.getenv("AVAILABILITY_IDS", "1,2,3,4")
MAX_ATTEMPTS = int(os.getenv("PERF_SIGNUP_ATTEMPTS", "0"))  # 0 == infinite

def parse_id_list(s):
    if not s:
        return []
    try:
        return [int(x) for x in s.split(",") if x.strip()]
    except ValueError:
        logger.warning("SPECIALIZATION_IDS or AVAILABILITY_IDS includes non-integers. Ignoring.")
        return []

SPECIALIZATION_IDS_LIST = parse_id_list(SPECIALIZATION_IDS)
AVAILABILITY_IDS_LIST = parse_id_list(AVAILABILITY_IDS)

def rand_name(n=6):
    letters = string.ascii_lowercase
    return "".join(random.choices(letters, k=n))

def random_license(n=8):
    chars = string.ascii_uppercase + string.digits + "-/"
    return "".join(random.choices(chars, k=n))

def random_fees(min_val=50, max_val=1000):
    # return string to be JSON serializable (decimal-like)
    value = round(random.uniform(min_val, max_val), 2)
    # ensure two decimals
    return f"{value:.2f}"

class SignupUser(HttpUser):
    """
    Simulates repeated signups. Some fraction create counsellors (if specialization/availability IDs provided),
    the rest create clients.
    """
    wait_time = between(0.2, 0.8)
    max_attempts = MAX_ATTEMPTS
    _counter = itertools.count()

    @task
    def signup(self):
        # optional: stop after X attempts per simulated user
        if self.max_attempts and next(self._counter) >= self.max_attempts:
            # graceful stop if configured attempts reached
            try:
                self.environment.runner.quit()
            except Exception:
                pass
            return

        # decide account type
        make_counsellor = (random.random() < COUNSELLOR_RATIO)
        # but only make counsellor if we have required lookup ids
        if make_counsellor and (not SPECIALIZATION_IDS_LIST or not AVAILABILITY_IDS_LIST):
            # fallback to client if counsellor lookup data not provided
            make_counsellor = False
            logger.debug("Counsellor requested but no specialization/availability IDs supplied; creating client instead.")

        email = f"locust+{uuid.uuid4().hex[:12]}@{EMAIL_DOMAIN}"
        common = {
            "email": email,
            "password": "Perf@12345",
            "confirm_password": "Perf@12345",
            "first_name": rand_name(),
            "last_name": rand_name(),
            "agreed_terms": True
        }

        if make_counsellor:
            # prepare counsellor payload
            # pick 1-3 specializations and 1-3 availability slots randomly
            spec_count = min(len(SPECIALIZATION_IDS_LIST), random.randint(1, min(3, max(1, len(SPECIALIZATION_IDS_LIST)))))
            avail_count = min(len(AVAILABILITY_IDS_LIST), random.randint(1, min(3, max(1, len(AVAILABILITY_IDS_LIST)))))
            specs = random.sample(SPECIALIZATION_IDS_LIST, spec_count)
            avails = random.sample(AVAILABILITY_IDS_LIST, avail_count)
            payload = {
                **common,
                "account_type": "counsellor",
                "license_number": random_license(10),
                "specializations": specs,
                "fees_per_session": random_fees(100, 1000),
                "availability": avails,
            }
            name = "POST /auth/signup (counsellor)"
        else:
            # client payload (may include age_group optionally)
            payload = {
                **common,
                "account_type": "client",
            }
            name = "POST /auth/signup (client)"

        with self.client.post(SIGNUP_PATH, json=payload, catch_response=True, name=name) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            else:
                # mark failure — common causes: throttling (429), validation 400, server error 5xx
                resp.failure(f"status={resp.status_code} text={resp.text[:250]}")
