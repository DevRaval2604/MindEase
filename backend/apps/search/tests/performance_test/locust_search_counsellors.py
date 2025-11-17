# apps/search/tests/perf/locust_search_counsellors.py
"""
Locust performance test for GET /api/search/counsellors/

Place under: apps/search/tests/perf/locust_search_counsellors.py

Env vars (optional):
- PERF_SEARCH_PATH        (default /api/search/counsellors/)
- PERF_QUERIES            (comma-separated search terms, default "anxiety,stress,trauma,cbt")
- PERF_SPEC_NAMES         (comma-separated specialization NAMES to filter by; default matches seeder)
- PERF_MIN_FEES           (comma-separated min fees options, default "0,100,300")
- PERF_MAX_FEES           (comma-separated max fees options, default "500,1000,1500")
- PERF_ORDERINGS          (comma-separated ordering options; default "fees_asc,fees_desc,name_asc,name_desc")
- PERF_PAGE_SIZES         (comma-separated page_size values, default "10,15,20")
- PERF_SHUFFLE            (1/0 default 1) shuffle param combos
- PERF_REUSE_PARAMS       (1/0 default 1) reuse param combos or consume once
"""

from locust import HttpUser, task, between, events
from queue import Queue, Empty
import os
import random
import logging

logger = logging.getLogger("locust.search")

SEARCH_PATH = os.getenv("PERF_SEARCH_PATH", "/api/search/counsellors/")
QUERIES = [s.strip() for s in os.getenv("PERF_QUERIES", "anxiety,stress,trauma,cbt").split(",") if s.strip()]
SPEC_NAMES = [s.strip() for s in os.getenv("PERF_SPEC_NAMES", "Anxiety,Depression,Stress Management,CBT").split(",") if s.strip()]
MIN_FEES = [s.strip() for s in os.getenv("PERF_MIN_FEES", "0,100,300").split(",") if s.strip()]
MAX_FEES = [s.strip() for s in os.getenv("PERF_MAX_FEES", "500,1000,1500").split(",") if s.strip()]
ORDERINGS = [s.strip() for s in os.getenv("PERF_ORDERINGS", "fees_asc,fees_desc,name_asc,name_desc").split(",") if s.strip()]
PAGE_SIZES = [int(s) for s in os.getenv("PERF_PAGE_SIZES", "10,15,20").split(",") if s.strip().isdigit()]
SHUFFLE = os.getenv("PERF_SHUFFLE", "1") != "0"
REUSE = os.getenv("PERF_REUSE_PARAMS", "1") == "1"

def build_param_combinations():
    combos = []
    # include simple combos: only ordering + pagination
    for page_size in PAGE_SIZES:
        combos.append({"page_size": page_size, "page": 1})
    # q only
    for q in QUERIES:
        for page_size in PAGE_SIZES:
            combos.append({"q": q, "page_size": page_size, "page": random.randint(1, 5)})
    # specialization only
    for s in SPEC_NAMES:
        for page_size in PAGE_SIZES:
            combos.append({"specialization": s, "page_size": page_size, "page": random.randint(1,5)})
    # fee ranges + ordering + specialization combos
    for min_fee in MIN_FEES:
        for max_fee in MAX_FEES:
            try:
                if float(min_fee) > float(max_fee):
                    continue
            except Exception:
                continue
            for ordering in ORDERINGS:
                for s in ([""] + SPEC_NAMES):
                    for page_size in PAGE_SIZES:
                        params = {}
                        if min_fee and float(min_fee) > 0:
                            params["min_fee"] = min_fee
                        if max_fee:
                            params["max_fee"] = max_fee
                        if ordering:
                            params["ordering"] = ordering
                        if s:
                            params["specialization"] = s
                        params["page_size"] = page_size
                        params["page"] = random.randint(1, 5)
                        combos.append(params)
    if SHUFFLE:
        random.shuffle(combos)
    # dedupe heuristically by turning dicts into tuple of sorted items
    seen = set()
    final = []
    for c in combos:
        key = tuple(sorted(c.items()))
        if key not in seen:
            seen.add(key)
            final.append(c)
    return final

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    params = build_param_combinations()
    q = Queue()
    for p in params:
        q.put(p)
    environment.search_param_list = params
    environment.search_param_q = q
    logger.info("Loaded %d search parameter combinations", len(params))

class CounsellorSearchUser(HttpUser):
    wait_time = between(0.05, 0.25)

    @task
    def search(self):
        if REUSE:
            params = random.choice(self.environment.search_param_list)
        else:
            q = getattr(self.environment, "search_param_q", None)
            if q is None:
                logger.error("No search_param_q available; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return
            try:
                params = q.get_nowait()
            except Empty:
                logger.info("Search parameter combos exhausted; stopping runner.")
                try:
                    self.environment.runner.quit()
                except Exception:
                    pass
                return

        with self.client.get(SEARCH_PATH, params=params, name="GET /search/counsellors", catch_response=True) as resp:
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    # expected paginated dict with "results" or a list
                    if isinstance(data, dict) and "results" in data:
                        resp.success()
                    elif isinstance(data, list):
                        resp.success()
                    else:
                        resp.failure("Unexpected response shape")
                except Exception as exc:
                    resp.failure(f"Invalid JSON: {exc}")
            else:
                resp.failure(f"status={resp.status_code} text={resp.text[:300]}")
