# Signup API Performance Tests (accounts app)

Files:
- `locust_signup.py` — Locust load test (recommended).
- `test_signup_benchmark.py` — pytest-benchmark microbenchmark (single-threaded).

## Pre-test setup (important)
1. **Use a dedicated perf DB**. Never run these tests against production.
2. **Set PERF settings**: make sure `config/perf.py` is active and:
   - `EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"`
   - `PASSWORD_HASHERS` is set according to your goal:
     - for realistic CPU tests: use PBKDF2 (default)
     - for very fast throughput experiments: temporarily use MD5 (NOT production realistic)
3. **Throttling**: signup may be rate-limited by DRF throttle. In `config/perf.py` raise signup throttle during perf runs:
   ```py
   REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["signup"] = "10000/min"
