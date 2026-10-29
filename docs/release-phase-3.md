# Public-release Phase 3 — integration and performance

Status: complete in the stated environments. All 64 committed browser checks and 72 backend/model checks pass locally and in GitHub CI. The user authorized integration fixes and measurements, not deployment or acquisition. Phase 4 remains separately gated; the launch target is open public access with free services only.

## Confirmed fixes

The original database query guard admitted four queries, while the agreed performance test uses five concurrent clients. A fifth client could repeatedly receive 503 while four queries were active. The isolated real-API baseline recorded 23 successful requests and 277 responses with status 503 across 300 measured requests. The guard now admits five queries and still rejects excess simultaneous work. A barrier-based regression test fails before the fix and passes after it, checking both admission and the overload bound. Production rate limiting remains unchanged.

The same five-client measurement after the fix returns 300/300 successful responses. Warm p95 results are 275.247 ms for starters, 227.480 ms for search and 340.514 ms for recommendations. Each endpoint has five warm-up requests and 100 measured requests; search cycles the original ten artists and recommendations cycle all 32 starters. The isolated loopback server uses the actual compatible model, database and checked-link release, with an elevated test-only rate limit so the normal 60-request limit does not invalidate the latency sample. This is local performance, not an internet or deployment result. Before/after evidence is in `evidence/release-phase-3-api-before.json` and `evidence/release-phase-3-api.json`.

To repeat, start a separate loopback API on port 8001 using the normal verified model/catalog/link and reader configuration, with `create_app(rate_limit=100000)` solely for the controlled load test. Run `.venv/Scripts/python.exe scripts/measure-release-api.py`. Do not expose this measurement service publicly. Ordinary rate limiting and safe failures are covered by the backend/browser tests.

## Clean-source and CI scope

A clean archive of `ea8c9ef` was extracted outside the original checkout, installed with `npm ci --offline --no-audit --no-fund`, and built independently. All 64 committed browser tests pass in local Chrome with one worker (6.0 minutes), with no skipped or flaky tests. All 24 backend and 48 model tests also pass from the clean source folder. Earlier larger totals included untracked experimental tests and are not the committed suite.

The clean Python source starts against explicitly supplied existing model/catalog/link files and the read-only database account. These ignored inputs are required; a source checkout cannot reconstruct the trained service. Local Python checks reuse the installed environment. GitHub installs Python dependencies afresh and passes all 72 tests at `453443e`.

The [final Linux browser run](https://github.com/pok0yo/music-recommender/actions/runs/40933785213) at `453443e` passes all 64 tests across six jobs, with one worker each, zero skips, zero failures and zero flaky results. The partition is 11/11/11/11/10/10 and covers each committed test exactly once. Each job installs dependencies, builds and typechecks before testing. [Backend/model run](https://github.com/pok0yo/music-recommender/actions/runs/40933785179). Run identities, counts and report hashes are retained in `evidence/release-phase-3-ci.json`.

Software WebGL is detected at runtime and receives a 0.75 pixel-ratio cap, 64-pixel environment maps and 256-pixel reflection buffers. Hardware rendering keeps its previous sizes, materials and geometry. A regression checks the detected adapter, buffer budget and song controls. Idle and transfer phases now follow visible elapsed time; the numerical dial spring stays bounded. Hidden/offscreen pauses retain their existing behavior. Both disc faces, rings, hover interaction and reduced-motion alternatives remain tested.

CI uses Chromium's WebGL-only SwiftShader mode with GPU compositing disabled. `PLAYWRIGHT_SOFTWARE=1` reproduces that configuration locally; the unsafe SwiftShader opt-in is test-runner-only. Software behavior checks have a 120-second default and 30-second assertions; long multi-action/layout checks have specific three-to-six-minute budgets. Hardware budgets and the production API's eight-second timeout are unchanged. The 20-minute job limit remains. These behavior-test budgets do not establish product latency; use the separate measured samples below.

The rotation check samples the same rendered poses with clock fast-forward, avoiding thousands of unseen GPU frames. Quick re-entry uses a controlled clock to stay inside the 180 ms disposal interval. A DOM observer records the brief ripple insertion before a slow runner can miss its entire lifetime. All actions, assertions and animation features remain enabled. Initial serial and three-job configurations failed; the retained [40-minute run](https://github.com/pok0yo/music-recommender/actions/runs/40822244853) and subsequent traces motivated these corrections. Retaining software compositing was also tested and was slower on Linux. No application behavior changed between the final clean-source run and `453443e`; those later changes affect tests, CI and evidence.

Checking Git blob hashes with LF equivalence only when it exactly reproduces the committed blob confirms all 740 archived files match, with 236 line-ending-only differences. This does not accept arbitrary source edits. See `evidence/release-phase-3-clean.json`. For graphics modes and partitioning, see [Chromium documentation](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md) and [Playwright documentation](https://playwright.dev/docs/test-sharding).

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

The zero-displayable case now explicitly says song details are unavailable when the model found connections with missing metadata. A real API/UI check for Pink Floyd's "Breathe (in the Air)" confirms ten model results, ten metadata omissions, a disabled Discover action and successful search recovery, with no page errors. This is separate from the genuine no-connections state. See `evidence/release-phase-3-empty-state.json`.

The canonical homepage also passes the existing listening/feedback verifier against the actual active API, with no response interception. It checks 32 starters, search, provider links/searches, the checked-link pilot, dismissal/Undo, reseeding, history, the retained canvas and absent demo destinations. No page errors or unsolicited external requests occur. The active release contains 72 Spotify, 43 Apple Music and 15 YouTube Music links; nine starters have at least one checked link. Provider playback is not exercised. See `evidence/release-phase-3-real-journey.json`.

Safari, physical phones, a human screen-reader audit and deployed-network behavior remain unavailable or unmeasured. Phase 4 remains separately gated.
