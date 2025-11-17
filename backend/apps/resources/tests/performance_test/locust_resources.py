# apps/resources/tests/perf/locust_resources.py
"""
Locust test for GET /api/resources/

Place under: apps/resources/tests/perf/locust_resources.py

Environment variables (optional):
- PERF_RES_PATH        (default /api/resources/)
- PERF_QUERIES         (comma separated search words, default: "stress,anxiety,cbt")
- PERF_TYPES           (comma separated types, default: "article,video,pdf")
- PERF_PAGE_SIZES      (comma separated page_size values, default: "9,12,15")
- PERF_SHUFFLE         (1/0 default 1) whether to shuffle query list
- PERF_REUSE_PARAMS    (1/0 default 1) reuse param combos (1) or consume once (0)
"""

from locust import HttpUser, task, between, events
from queue import Queue, Empty
import os
import random
import logging

logger = logging.getLogger("locust.resources")

# config
RES_PATH = os.getenv("PERF_RES_PATH", "/api/resources/")
QUERIES = [q.strip() for q in os.getenv("PERF_QUERIES", "stress,anxiety,cbt").split(",") if q.strip()]
TYPES = [t.strip() for t in os.getenv("PERF_TYPES", "article,video,pdf").split(",") if t.strip()]
PAGE_SIZES = [int(x) for x in os.getenv("PERF_PAGE_SIZES", "9,12,15").split(",") if x.strip().isdigit()]
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
REUSE = os.getenv("PERF_REUSE_PARAMS", "1") == "1"

def build_param_combinations():
    combos = []
    # include empty query and no-type combos
    combos.append({})
    for q in QUERIES:
        combos.append({"q": q})
    for t in TYPES:
        combos.append({"type": t})
    # combine q + type
    for q in QUERIES:
        for t in TYPES:
            combos.append({"q": q, "type": t})
    # add pagination variations
    final = []
    for c in combos:
        for ps in PAGE_SIZES:
            # random page number up to 5 pages to vary offsets
            page = random.randint(1, 5)
            params = dict(c)
            params["page_size"] = ps
            params["page"] = page
            final.append(params)
    if SHUFFLE:
        random.shuffle(final)
    return final

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    environment.res_param_list = build_param_combinations()
    environment.res_param_q = Queue()
    for p in environment.res_param_list:
        environment.res_param_q.put(p)
    logger.info("Loaded %d param combinations for /api/resources/", len(environment.res_param_list))

class ResourceUser(HttpUser):
    wait_time = between(0.05, 0.5)

    @task
    def get_resources(self):
        if REUSE:
            params = random.choice(self.environment.res_param_list)
        else:
            q = getattr(self.environment, "res_param_q", None)
            if q is None:
                logger.error("No param queue available; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            try:
                params = q.get_nowait()
            except Empty:
                logger.info("Param combinations exhausted; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return

        with self.client.get(RES_PATH, params=params, name="GET /api/resources", catch_response=True) as resp:
            if resp.status_code == 200:
                # optional: basic sanity check (list returned)
                try:
                    data = resp.json()
                    # If paginated, expect 'results' key; else a list
                    if isinstance(data, dict) and "results" in data:
                        # success
                        resp.success()
                    elif isinstance(data, list):
                        resp.success()
                    else:
                        resp.failure("Unexpected response shape")
                except Exception as exc:
                    resp.failure(f"Invalid JSON or unexpected content: {exc}")
            else:
                resp.failure(f"status={resp.status_code} text={resp.text[:250]}")
