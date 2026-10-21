# Stage 9: five app structures, awaiting selection

The user approved the glass/chrome material world and asked for five different forms of the application, rather than theme swaps. Discover and About are implemented in each. This is the comparison milestone; no structure has been selected, no final `/discover` route is promoted, and Stage 10/deployment remain gated.

## Compare the structures

| Version | Structure | Consequential tradeoff |
|---|---|---|
| v1 Blue Horizon | Search/seed rail beside results | Keeps context visible; narrower result area on desktop |
| v2 Disc Study | Centered choose/explore sequence | Clear progression; less simultaneous context |
| v3 Pearl Orbit | Persistent catalog dock beside results | Fast switching between starters; more vertical content on phones |
| v4 Capsule Current | Top command band and wide track ledger | Suits scanning titles/artists; less persistent seed context |
| v5 Cobalt Signal | Result list beside evidence inspector | More space to inspect evidence; phones need an explicit focus jump/return |

My provisional recommendation is v1 for a balanced first release, or v3 if repeatedly switching starting songs matters most. These are design judgments, not usability-study results. The user owns selection. All five folders, comparison routes and evidence should remain after selection.

The Stage 4 rubric is applied qualitatively; no numeric usability scores were measured:

| Criterion | Weight | Comparison judgment from renders and interactions |
|---|---|---|
| Task clarity | 30% | v1 keeps the seed/result relationship visible; v2 gives the clearest sequence; v3 favors repeated exploration |
| Accessibility and states | 25% | All share state handling and pass the scoped automated checks; v5 adds focus-management complexity. Any newly found accessibility failure blocks selection |
| Aesthetic fit and distinctiveness | 20% | All retain the approved material world; v4's ledger and v5's inspector differ most from a standard split console |
| Responsiveness and long content | 15% | All pass the width/content matrix; v3's persistent starters and v5's inspector increase phone scrolling |
| Maintenance cost | 10% | v1/v2 use ordinary shared flows; v5 owns additional selection and focus behavior |

Weighting clarity and resilient state handling most heavily supports the provisional v1 recommendation. This comparison does not assert that users prefer it.

Shared Manrope typography, cobalt actions, pearl reading regions and icy chrome enclosure edges hold the material world together. Only the header uses backdrop blur. Initial hero fills retain the recorded ratios and positions in DESIGN.md; they are solid CSS, hidden from assistive technology, and removed in working states. No hero image, decorative fake control, audio player or image request is shipped.

## Run locally

1. Install the exact frontend dependencies with `npm ci` using Node 24.
2. Build with `npm run build`, then serve with `npm run start` on `http://127.0.0.1:3000`.
3. Open `/variants/v1?mode=demo&fixture=entry` through `/variants/v5?mode=demo&fixture=entry`. About is `/variants/vN/about?mode=demo&fixture=entry`. The comparison toolbar changes structure, data mode and scenario without shrinking the app into a thumbnail.

Demonstration mode requires no backend and is visibly labeled. Remove `mode=demo` for the real local API. Follow docs/stage-8-backend.md to start the existing project database and API; for a frontend using 127.0.0.1, set `ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000` before starting the API. NEXT_PUBLIC_API_URL defaults to `http://127.0.0.1:8000`; changing it requires a frontend rebuild. Do not publish credentials from ignored local connection files.

The frontend validates real responses, cancels obsolete requests, rejects mismatched/malformed data and never substitutes fixtures on real API failure. Search is explicit. Selecting a seed updates browser history; Change song returns focus to search. Missing metadata preserves model rank gaps. Details explains shared training listeners without implying audio similarity or enjoyment probability. Listening links remain unavailable. No accounts, feedback persistence or additional model work were added.

## Verification and its limits

- Production build and TypeScript checks pass. The browser suite has 19 tests: shared contract guards; five keyboard search/reseed/history flows; five matrices across 15 scenarios and five widths (375 observations); 25 About width visits; 30 axe scans; picker typing; abort races; real-adapter outage, timeout and rate-limit behavior; distinct structure behavior; reduced motion, forced colors, enlarged text and focus checks.
- One final-run attempt hit a Windows EBUSY lock while closing a trace inside OneDrive, with 18 tests passing. Local trace artifacts now use the operating-system temporary directory; the JSON summary remains in ignored test-results/. The final rerun is recorded separately rather than hiding the failed attempt.
- Tests use deterministic demo fixtures or explicitly mocked adapter responses. They do not establish model usefulness or live-service availability. `docs/evidence/stage-9-checks.json` records the final local result; CI runs the same suite against its own production server.
- A separate actual-data check used the local PostgreSQL/API/frozen model in v1 and v5, without route mocking. Tiffany search and CLOUDS returned ten real recommendations with zero metadata omissions. See `docs/evidence/stage-9-real-smoke.json`; this one seed does not establish catalog-wide frontend coverage.
- Thirty full-page captures cover entry/results/About at 1440x900 and 390x844. The manifest records actual fonts, page width and placeholder geometry. The fresh finish reviewer viewed all initial captures, requested the v5 initial/reseeded focus-return correction, then scored the correction against refreshed evidence. The review report states its exact scope.
- The unsuppressed Taste inspection retains style FAIL/WARN findings. Chrome gradients, enclosure shadows, short large entry headings and explicit empty hero reservations are deliberate approved exceptions, documented in `stage-9-style-inspection.json`; this is not a zero-failure style-check claim. Impeccable's local engine was unavailable, so its detector did not run. Its craft floor and independent screenshot review were applied directly.
- Physical phones, screen readers, actual browser zoom, human usability, deployed latency and full accessibility conformance remain unverified. Width reflow and doubled text are browser simulations. No recommendation metric was remeasured or invented during this frontend milestone. Eleven frozen Stage 8 source hashes were checked unchanged.

## Before / after / why

| Before | After | Why |
|---|---|---|
| Five typography/theme directions | Five different task/result arrangements in one world | Compares app structure rather than cosmetic preference |
| Conventional flat preview shell | Shared selective chrome lips and translucent header | Carries the approved material identity without artwork |
| One repeated result composition | Guided flow, persistent dock, ledger and separate inspector | Makes the structure choices consequential |
| V5 return depended on a previous Details click | Connected originating button, otherwise first current Details button | Initial and reseeded inspector returns both work |
| Tick-based rate wait | Elapsed-time deadline and explicit retry | Background throttling does not prolong the rate window |

No arbitrary animation quota was applied. Pointer feedback is brief; keyboard actions are immediate; reduced motion removes transitions. The comparison picker stays in document flow because a floating overlay covered task controls during earlier render review.

## Files and next gate

App routes live in app/, shared behavior in components/ and lib/, and presentation in v1/ through v5/. Tests are tests/frontend/discovery.spec.ts; scripts/capture-previews.mjs records comparison captures and scripts/smoke-real-frontend.mjs verifies the optional real local integration. Screenshot PNGs are documentation evidence, not app assets; their origin and commands are in the capture manifest. Manrope is self-hosted with its OFL license and package/license hashes recorded separately.

Next required input: choose v1, v2, v3, v4 or v5, with any specific changes. Only then finish the selected Discover/About frontend. Do not infer Stage 10 or deployment authorization from a structure selection.
