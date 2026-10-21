# Stage 9: five app structures, awaiting selection

## Centered hero follow-up

The user requested removal of the pause button and moving the model down to the center. The decorative hero is now vertically centered in the upper panel's right column using its existing enclosure as the positioning reference. The 590px wide model still crosses the right lip on wide desktop; narrow screens retain task/starters before the model. Removing the control also removes its focus stop and the no-longer-needed floating-hero prop/branch.

| Before | After | Why |
|---|---|---|
| High, top-overlapping sculpture | Model centered vertically in the upper hero panel | Applies the user's lower placement request |
| Automatic idle rotation with Pause/Resume | No button; still idle, rotation/tilt/shine only during mouse hover | Keeps the requested interaction without unattended motion requiring a visible pause control |

Reduced motion, touch scrolling, WebGL fallback and working-state cleanup remain. Build, typecheck and six targeted hero/artwork tests pass. Eight alpha-geometry widths now assert vertical centering and search clearance rather than top overlap. Thirty new captures cover entry/tilt/fallback/results/About at the six established viewports in `docs/evidence/stage-9-orbital-centered-captures.json`; previous hero evidence below is historical. The scene geometry and fallback pixels are unchanged; the direct export provenance was refreshed for the revised integration. A further10 affected hero/artwork/button tests pass using local Chrome with SwiftShader software graphics (two workers,1.5min). The previous `ff8dfb8` GitHub run ended with25 passes and8 graphics-related timeouts; their exact cause is unproven. The current local software run is distinct from remote Linux confirmation. No new dependency, model experiment, live backend verification or deployment. Physical-device/Safari/screen-reader and measured performance limits remain.

## Interactive Orbital Disc hero (previous checkpoint)

The user approved a larger free-standing model for the Orbital Disc demo, with slow rotation, pointer-responsive tilt/shine and overlap across the tray edge. Open `/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry`. This is a real locally authored Three.js scene, replacing only this candidate's circular raster enclosure. The other three raster artwork demos, original flat comparison routes, factual copy and discovery behavior remain available. This iteration is reviewable exploration; it does not select final artwork, promote the root route, start Stage 10 or deploy the application.

| Before | After | Why |
|---|---|---|
| Small circular image reservation | Larger annular 3D disc, polished chrome orbits and mirrored sphere | Gives the hero the requested depth and free-standing silhouette |
| Hero contained by its slot | Top/right overlap on wide desktop; top overlap at medium widths; model follows starters on phones | Preserves the border-crossing gesture while keeping search and navigation clear |
| Static generated artwork | Eased mouse tilt, shifting light/reflections and slow disc rotation; native Pause/Resume | Adds the requested interaction with explicit motion control |

`components/orbital-scene.ts` authors geometry, procedural spectrum/thin-film maps and local sky/studio reflection environments. No remote model, image or environment service runs in the browser. Three.js 0.186.1 and its development types were added; its MIT notice is retained in `public/third-party/three/LICENSE`. The optional scene module loads only when the Orbital hero mounts. DPR is capped at1.5, and recurring frames stop when paused, hidden or offscreen. Reduced motion keeps a still pose and disables pointer-driven movement; touch scrolling is ordinary. Working states/About remove and dispose the scene. Import/WebGL initialization failures and context loss retain a transparent static render of the exact authored scene. `preserveDrawingBuffer` enables direct export and reproducible pixel checks, with a possible GPU cost that has not been benchmarked.

The 2000x1600 RGBA fallback is a direct renderer export, not an AI image or a cutout of supplied references. Its content hash and scene-source hashes are in `docs/art-direction/orbital-disc-model.json`. `node scripts/capture-orbital-hero.mjs --export-fallback` regenerates that artifact and manifest after a scene change; `node scripts/capture-orbital-hero.mjs` captures entry, tilt, paused, fallback, results and About. The final manifest contains36 captures at1440x900,390x844,550x766,569x792,1253x705 and1305x792. The in-app browser changed width during inspection; both observed narrow/wide classes are included. The responsive override extends through1359px to avoid horizontal overflow between medium and wide layouts.

Production build, typecheck and the final33-test Chrome regression pass. Four new hero tests inspect real WebGL alpha bounds at320,390,550,569,768,1024,1253 and1440px; assert overlap, notice/search clearance and no clipping/overflow; inspect changing/frozen pixels, reduced motion, offscreen suspension, context-loss/no-WebGL fallback, keyboard order and removal/remounting. Existing artwork tests retain all four candidate flows, and existing button/real-mode/API-guard tests still pass. The1305px width has capture/overflow evidence rather than an additional alpha-geometry assertion. Source cleanup/visibility handling is reviewed, not a hardware memory-leak or battery measurement. See `docs/evidence/stage-9-orbital-hero-checks.json`, `stage-9-orbital-hero-captures.json` and `stage-9-orbital-hero-review.md` for exact scope. Earlier checkpoint counts below remain historical.

No new recommendation experiment, catalog import or live backend test occurred. Physical devices, Safari, screen readers, battery, measured FPS and perceived smoothness remain unverified. The Impeccable engine/detector was unavailable in this session; direct project/craft-floor review was used and no detector pass is claimed.

## Shimmer follow-up

The user supplied a ShimmerButton and approved a richer idle finish with a smoother transition into the liquid-metal hover. Its conic highlight and container-relative travel are merged into the existing native button; there is no detached demo, nested button, dependency addition or Tailwind 3 configuration. Idle faces now have stronger stationary gloss bands. Fine-pointer hover sweeps the rim highlight over 650ms, while the shader fades in over 240ms only after it is ready. On leave it fades for 180ms before disposal; quick re-entry cancels disposal and reuses the canvas. The previous abrupt hover gradient replacements were removed. Keyboard and accessibility fallbacks remain, and no idle animation loop is added.

The same shared callers receive the refinement; hero artwork, outline, layout, factual copy and recommendation behavior remain unchanged. `node scripts/capture-liquid-buttons.mjs --shimmer` records 21 current state captures in docs/evidence/stage-9-shimmer-buttons and waits for CSS transitions to settle. Earlier liquid-button captures remain historical. The new test covers a still idle state, ready fade, rapid leave/re-entry reuse and eventual disposal. See stage-9-shimmer-button-checks.json and stage-9-shimmer-button-review.md for final results and limitations; still screenshots alone do not establish animation timing or hardware smoothness.

Build, typecheck and the final 29-test Chrome regression pass. The first run retained 26 passes and 3 timeouts while Chrome reported suspended network I/O and an abnormal 2.8h duration; the clean rerun passed 29 in 2.7 minutes without a product change. Both run summaries are retained in the checks file. Physical devices, Safari, screen readers and perceived smoothness remain unverified.

## Liquid button refinement

The user authorized the supplied liquid-metal effect for buttons first. All shared product buttons now use `components/ui/liquid-metal-button.tsx`: a responsive native button with a silver shader rim, an opaque icy or cobalt reading face, and a bounded pointer-click ripple. The comparison harness, navigation links and native disclosure summaries retain their existing behavior. The hero, circular outline and artwork are unchanged; rotating 3D artwork and outline removal are deferred to the next approved step.

| Before | After | Why |
|---|---|---|
| Flat primary/secondary actions and plain text actions | Shared material rim, cobalt primary face and quieter icy action faces | Carries the selected Y2K listening-device aesthetic through working controls |
| Supplied fixed 142px demo with an invisible overlay button | Content-sized native button props, labels, form submission, disabled state and focus outline | Preserves the actual application rather than adding a detached demo |
| Supplied always-running shader and `destroy()` cleanup | Lazy pointer interaction, bounded ripple, `dispose()` cleanup and static fallbacks | Uses the installed API and avoids idle shader work |

Only `@paper-design/shaders` 0.0.82 was added; the supplied icon-only demo, class-merging utilities and unrelated icon dependency are unused. Existing TypeScript/Tailwind and the new conventional components/ui folder require no project bootstrap. [Paper Shaders](https://github.com/paper-design/shaders) supplies the shader; its Apache-2.0 LICENSE and NOTICE are preserved in public/third-party/paper-shaders. The optional shader chunk is loaded locally; no remote rendering service is called by these buttons.

Keyboard activation remains static. Reduced motion, reduced transparency and forced colors disable shader animation; failed WebGL or a failed optional shader import leaves the CSS/native control usable. Interaction imports cancel safely when the control leaves or unmounts. The shader library also pauses hidden/offscreen animation. No continuous idle loop, autoplay, new image, backend behavior or model claim was introduced.

Build and typecheck pass. The full 28-test Chrome suite passed, followed by three focused checks expanded to assert the actual ripple and reduced-transparency media preference. Twenty-one captures cover entry, hover, pressed, keyboard focus, results, disabled retry and long text at 1440x900, 390x844 and 550x766. See docs/evidence/stage-9-liquid-button-checks.json, stage-9-liquid-button-captures.json and stage-9-liquid-button-review.md for exact evidence and review scope. These are automated/browser observations, not a measured frame-rate, battery, screen-reader, Safari or physical-device guarantee. Earlier checkpoint counts below remain historical.

## Working Disc Tray artwork demos

The user selected Disc Tray and requested the four generated artworks inside the working UI. Open `/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry`, then use the four-way picker for Glass Current, Aero Player and Liquid Star. Each option also has a direct route ending in its slug and an `/about` page. The same input, seed, results and source/scenario settings persist while switching artwork. Search, Details, Use as seed, Change song, browser Back and About are functional. These are app demos, not image mockups.

Four unmodified 2048x2048 originals are stored in public/artwork/disc-tray; their actual provider jobs, origin URLs, dimensions and hashes are in docs/art-direction/disc-tray-artwork-assets.json. Next.js delivers responsive optimized images while keeping the originals intact. Artwork is decorative, does not affect recommendations and occupies the existing circular opening-state slot. Search/results and About retain the same working body and omit the hero. On phones the existing task-before-art order is preserved. No hover/parallax/audio or new controls were added to the artwork itself.

The new artwork.spec.ts covers 24 image/width combinations, 8 axe scans and picker/input/reload/search/details/reseed/history/About behavior. Eighteen captures show all four entry images on desktop/mobile and the actual 550px in-app width, plus the shared results/About screens. See stage-9-artwork-checks.json and stage-9-artwork-review.md in docs/evidence for completed results and review scope. Physical phones, screen readers, actual browser zoom, human preference and deployed performance remain unverified. Existing real/demo behavior is reused; no new model evaluation or data import occurred.

Before: four standalone generated images and blank hero reservations. After: four working Disc Tray demos with the actual images. Why: the user can judge silhouette, crop and visual weight against real search and result content. Earlier comparison routes keep their placeholders. Disc Tray is selected; final hero artwork is still open. No production promotion, Stage 10 or deployment is authorized.

## Disc Study follow-up

The user preferred v2's aesthetic and approved three additional body layouts. Open `/prototypes/disc-study/gatefold?mode=demo&fixture=entry`, `/prototypes/disc-study/disc-tray?mode=demo&fixture=entry`, or `/prototypes/disc-study/liner-notes?mode=demo&fixture=entry`. The three-way picker preserves the current input and recommendation state. About remains within the selected study route. Original v1–v5 routes remain available, and no final layout is promoted.

| Study | Before / after | Why and tradeoff |
|---|---|---|
| Gatefold | Centered stack becomes joined cover and result pages | Keeps search/seed next to results; narrower result column |
| Disc Tray | Single enclosure becomes command tray and inset results drawer | Compact title/artist scanning; less breathing room |
| Liner Notes | Centered task becomes asymmetric header and generous ranked body | Clear editorial rhythm; longest scroll |

All retain the v2 palette, font, selective chrome and solid circular 1:1 #C9D5DF hero reservation. Mobile puts task and choices before the disc; working states remove it. No new imagery, playback, user data or model behavior. `scripts/capture-previews.mjs --disc-study` records 18 matching entry/results/About captures; tests/frontend/disc-study.spec.ts adds three working-flow/state matrices (225 observations and 18 axe scans) plus picker/history/navigation regression. See the separate `docs/evidence/stage-9-disc-study-checks.json` and `stage-9-disc-study-review.md` for actual completed verification. The original evidence below remains the earlier five-layout checkpoint.

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
