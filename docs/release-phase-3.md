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

The first serial software-rendering CI run still timed out after 40 minutes ([retained run](https://github.com/pok0yo/music-recommender/actions/runs/40822244853)). Its traces show frame/actionability stalls, delayed UI transitions and incomplete fixture rendering; increasing the job limit alone did not resolve them. The next configuration uses Chromium's software **WebGL fallback**, with GPU compositing disabled, rather than forcing the entire ANGLE driver through SwiftShader. It divides all tracked tests across three jobs with one worker each and a 20-minute per-job limit. Test-level sharding preserves every assertion and avoids a single oversized test file monopolizing one shard. Duplicate push/PR runs cancel by branch, and diagnostics are retained for one day. No animation assertion is disabled and no visitor rendering flag is changed.

`PLAYWRIGHT_SOFTWARE=1` reproduces the renderer configuration locally. See [Chromium's documented modes](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md) and [Playwright's test-level sharding behavior](https://playwright.dev/docs/test-sharding). Remote confirmation of the revised configuration remains pending.

The clean-source byte audit initially rejected Windows CRLF conversions. Checking committed Git blob hashes with LF equivalence only when it exactly reproduces the original blob confirms all 733 tracked files match, with 229 line-ending-only differences. This does not accept arbitrary source edits. See `evidence/release-phase-3-clean.json`.

## Browser timing and startup

`node scripts/measure-release-browser.mjs` profiles installed Chrome and Edge on the Ryzen AI 9 465 / Radeon 880M laptop, while forwarding the frontend's requests unchanged to the isolated real API. Animation remains enabled. Each scenario has five warm-ups. Starters are selected cyclically from the approved 32; shorter samples cover a subset.

| Scenario | Measured selections | Seed-to-results p95 |
| --- | ---: | ---: |
| Chrome 1440x900 | 100 | 395.984 ms |
| Chrome 390x844 viewport | 32 | 359.282 ms |
| Chrome 390x844, 4x CPU slowdown | 10 | 678.670 ms |
| Edge 1440x900 | 32 | 336.362 ms |

These samples meet the proposed two-second local target. Five-second frame samples have no intervals over 33.4 ms in the unthrottled scenarios. The CPU-throttled sample has one, with a maximum of 38.9 ms. No page errors are observed. Keyboard activation-to-results includes automation overhead, and frame scheduling is not a GPU-completion measurement. Viewport and CPU emulation are not physical phones. See `evidence/release-phase-3-browser.json`.

A separate fresh API process takes 18,817 ms from launch through model/catalog readiness, with the OS file cache warm. Its observed peak working set is 250,798,080 bytes; private committed memory is 827,871,232 bytes. PostgreSQL is separate. These Windows counters are not Linux container RSS or hosted cold-start guarantees. Readiness polling uses a one-second request timeout and 100 ms pauses, so startup timing includes polling/connection overhead. The temporary process is stopped after measurement. This startup delay must be considered when assessing sleeping free hosts in Phase 4. See `evidence/release-phase-3-cold.json`.

## Availability is separate from accuracy

A new read-only audit of the loaded frozen model and serving database confirms all 32 starters and all displayable seeds in the first three breadth-first rounds (32, 205 and 638 distinct seeds) return ten described recommendations. Round four is 1,537/1,539; round five is 2,749/2,905. The rounds follow displayable neighbors only, matching seeds a visitor can actually choose.

Across all 4,996 searchable recordings, 3,248 (65.01%) have ten displayable results; 48 have none. There are no unsupported serving seeds, but three model short lists and 6,576 omitted metadata positions across all lists. Original starter lists have 32 distinct rankings and 205 distinct recommended recordings, with mean pairwise Jaccard overlap 0.0211. These are availability/diversity measurements, not new recommendation-accuracy or enjoyment evidence. No metadata is acquired, no list is padded and the trained model is unchanged. See `evidence/release-phase-3-coverage.json`.

Safari, physical phones, a human screen-reader audit and deployed-network behavior remain unavailable or unmeasured. Phase 4 remains separately gated.
