# Public-release Phase 3 — integration and performance

Status: verification in progress. The user authorized integration fixes and measurements, not deployment or acquisition. The launch target remains open public access with free services only.

## Confirmed fixes

The original database query guard admitted four queries, while the agreed performance test uses five concurrent clients. A fifth client could repeatedly receive 503 while four queries were active. The isolated real-API baseline recorded 23 successful requests and 277 responses with status 503 across 300 measured requests. The guard now admits five queries and still rejects excess simultaneous work. A barrier-based regression test fails before the fix and passes after it, checking both admission and the overload bound. Production rate limiting remains unchanged.

The same five-client measurement after the fix returns 300/300 successful responses. Warm p95 results are 275.247 ms for starters, 227.480 ms for search and 340.514 ms for recommendations. Each endpoint has five warm-up requests and 100 measured requests; search cycles the original ten artists and recommendations cycle all 32 starters. The isolated loopback server uses the actual compatible model, database and checked-link release, with an elevated test-only rate limit so the normal 60-request limit does not invalidate the latency sample. This is local performance, not an internet or deployment result. Before/after evidence is in `evidence/release-phase-3-api-before.json` and `evidence/release-phase-3-api.json`.

To repeat, start a separate loopback API on port 8001 using the normal verified model/catalog/link and reader configuration, with `create_app(rate_limit=100000)` solely for the controlled load test. Run `.venv/Scripts/python.exe scripts/measure-release-api.py`. Do not expose this measurement service publicly. Ordinary rate limiting and safe failures are covered by the backend/browser tests.

## Clean-source and CI scope

An archive of committed source `2750ad9` was extracted outside the original checkout, installed with `npm ci --offline --no-audit --no-fund`, and built independently. No original uncommitted files, dataset, credentials or model binaries were in that source snapshot. Serving it with the existing compatible local API, all 62 tracked browser tests pass in local Chrome with one worker (9 minutes). Earlier larger local totals included untracked experimental tests; they are not the clean committed suite.

The clean Python source also starts against explicitly supplied existing model/catalog/link files and the read-only database account. These ignored release inputs are required; a source checkout alone cannot reconstruct the trained service. Fresh Python dependency installation is covered separately by the passing Linux backend/model workflow; the local clean-source startup reuses the installed Python environment.

Software rendering was reproduced locally using Chromium's documented SwiftShader configuration. The public 32-song flow and four homepage checks pass with one worker (6 tests, 1.9 minutes). An animated software-rendered click took about 5.5 seconds in the initial probe, compared with 1.4 seconds under reduced motion. This supports reducing CI graphics contention; it is not a mobile-device performance claim or proof of every remote failure's cause.

CI now uses an explicit software renderer and one worker, retains all assertions, allows 40 minutes for the complete suite, and uploads failure traces/screenshots/results even when tests fail. `PLAYWRIGHT_SOFTWARE=1` reproduces its renderer configuration locally without disabling animation assertions. Chromium documents the test-only software-rendering flags at https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md . They are not applied to visitor browsers.

Remote confirmation and browser performance measurements remain pending at this checkpoint. Safari, physical devices, a human screen-reader audit and deployed-network behavior remain unavailable or unmeasured. No new recommendation-quality evaluation is claimed.
