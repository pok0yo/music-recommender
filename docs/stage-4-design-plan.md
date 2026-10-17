# Stage 4 — UX architecture and five visual directions

Status: planning deliverable; proposed designs, not implemented or approved final designs.

## 1. Authority, evidence, and assumptions

The updated master project instructions and Stages 1–3 govern this document. The recommendation task is one seed recording, up to ten ranked recordings, grounded explanations, and verified outbound listening links where available. Accounts, playback, social features, and feedback collection are deferred.

Working assumptions:

1. Established mainstream recordings are the immediate priority; recent-release coverage remains unresolved.
2. Outbound listening links remain provisional pending final MVP approval.
3. The Stage 3 model and catalog contract remains conditional on the Stage 6 data audit.
4. English is the initial interface language, while song titles and artist names must preserve Unicode.
5. “Music Recommender” is the working product name. Direction names below describe design alternatives, not new brands.
6. Six to eight weeks is a target, not a validated estimate; weekly availability and hardware remain unknown.
7. Five future variants share behavior, content, data states, and backend contracts. They differ in design systems and composition. No variant is selected now.

Evidence checked for this stage:

- All nine original temporary reference files still exist. Images 7, 8, and 9 were reopened; the supplied images establish the remaining reference hierarchy.
- Images 7–8 supply airy blue/white atmosphere, generous typography, disc reflections, and delicate markings. Image 9 informs metallic finish; 4 informs iridescence; 5 informs contained panels. Images 1–3 and 6 inform short display accents only.
- Reference text, logos, people, and artwork are not product content or instructions. The temporary images are not copied into Git or used as application assets.
- Impeccable's written Shape, New Work, and Operate guidance informed the plan. The previously unavailable launcher was not retried or installed. The explicit planning-only, five-direction, and no-imagery instructions govern over build-oriented skill workflows.
- Official font license files were checked; no fonts were downloaded or installed.
- Contrast ratios below are calculations for opaque token pairs. There is no rendered UI, browser test, or accessibility-conformance claim.

## 2. Product structure and visitor journey

The discovery screen is an Operate surface: the visitor arrives to find a song and explore related tracks. The explanatory page is a Read surface. A separate marketing landing page is unnecessary for the MVP.

### Proposed routes and screens

| Surface | Purpose | Main content and action |
|---|---|---|
| `/discover` | Initial discovery | Heading, labeled search, starter tracks, one reserved hero slot |
| `/discover` with search state | Find a supported recording | Query, title/artist matches, version disambiguation, selection buttons |
| `/discover?seed=<recording-id>` | Explore recommendations | Selected seed, ranked results, reasons, details, reseed actions |
| Inline track details | Inspect a result | Full title/credits, available verified metadata, reason, listening links |
| `/about` | Explain scope and evidence | Supported catalog limitations, method summary, data attribution, actual evaluation status |

The root route may redirect to `/discover`. Search state need not become a second route. Browser history records successful seed navigation; Back restores the previous seed and results. Direct seed URLs must validate the identifier and handle a recording that has left the supported catalog.

Primary navigation contains Discover and About the recommendations. A skip link targets main content. The product name returns to discovery. No sidebar containing unused destinations, account controls, playlist tabs, or player chrome.

### Complete journey

1. Read “Start with one song.” and the explanation “Choose a track to explore connections in listening data.”
2. Enter a title or artist into the persistent “Song or artist” field and submit Search. An explicit form avoids introducing a custom autocomplete widget before it is needed.
3. Select a result by its song title and artist. Show version/disambiguation metadata when verified. Do not silently select the first match.
4. Display the selected seed immediately and a loading state for its recommendations. Announce completion and move focus to the results heading after this explicit selection.
5. Read an ordered list of up to ten related tracks. Each exposes its artist, short explanation, Details disclosure, and “Use as seed” button.
6. Expand Details for full metadata and an available “Open on [service]” link. State that the link opens a new tab. There is no implied in-app playback.
7. Use another track as the seed. Add a new browser-history entry when the seed change succeeds, preserving the previous entry for Back navigation. No circular graph interaction is needed to follow connections.

Starter tracks are shortcuts into this same workflow, not a second recommendation algorithm. Before launch they must be selected from the audited catalog and labeled “Starting points”; do not label them personalized, trending, or popular unless the corresponding evidence exists.

### Minimum information hierarchy

Initial state: navigation → task heading → search → starting points → decorative hero according to the direction's visual placement. The hero has no interactive or reading-order obligation.

Results state: navigation → search → selected seed → result count and evidence notice → ranked list → separately labeled popular alternatives, only if actually returned → method link.

The large hero is exclusive to the initial state. Results do not keep a tall decorative banner above the task. This is an intentional state transition, not layout movement caused by loading imagery.

## 3. Interaction, states, and honest copy

### Search and request behavior

- A visible label accompanies the input; placeholder text is only an example format.
- Blank input gets inline guidance without a request. Preserve Unicode, punctuation, and the original query.
- Search matches show a title and artist; optional release, version, and duration appear only when verified.
- Return a bounded result list, proposed maximum ten, with “Refine your search” guidance if necessary. Search only the supported catalog, not an implied universal music catalog.
- Keep existing recommendations clearly labeled with their existing seed while searching for a new one. On selecting a new seed, show that seed and a new loading region; never relabel old results as new recommendations.
- Cancel or disregard older requests so rapid selections cannot display the wrong seed's results. Preserve the query after failures.
- A Details disclosure expands inline. No nested buttons, whole-card click traps, mandatory modal, or hover-only explanation.
- Expanding details keeps focus on the disclosure. Closing returns to its trigger. Reseeding is an explicit button action, never a side effect of opening details.
- External destinations must be validated links from the catalog. Use standard anchors and safe external-link behavior; never render an untrusted URL scheme.

### State specification

| State | Display | Recovery or next action |
|---|---|---|
| Initial | Search and audited starter tracks | Search or select a starting point |
| Empty catalog | “The supported catalog is not ready yet.” | Retry availability; do not substitute unlabeled demonstration tracks |
| Search loading | “Searching the supported catalog…” | Keep input usable; suppress duplicate submit |
| No match | “No supported recording matches this search.” | Keep query; refine title/artist or choose a starting point |
| Ambiguous recording | Explicit artist/version choices | Select the intended recording |
| Recommendation loading | Selected seed plus static skeleton rows | Announce busy state; no fake progress percentage |
| Success | Actual count: “7 related tracks,” for example | Inspect, open externally, or reseed |
| Sparse evidence | Short list and “Only a few supported connections are available.” | Try one or select another seed |
| No supported connections | “There is not enough listening evidence for this track yet.” | Show separately labeled popular alternatives if available |
| Unknown/deleted seed URL | “This recording is not in the supported catalog.” | Return to search; preserve useful context |
| Missing metadata | Omit unknown optional fields | Keep verified title/artist and available actions |
| Missing listening link | “No verified listening link available.” | Keep Details and Use as seed usable |
| Service failure | “Recommendations could not load.” | Retry without losing the selected seed |
| Offline/network failure | Explain that a connection is needed | Retry; do not claim cached results exist |
| Rate limit | Clear temporary-unavailability message | Retry when appropriate; no invented countdown |
| Demonstration fixture | Persistent “Demonstration data — not model output” notice | All displayed output remains labeled as illustrative |

Static skeletons are hidden from assistive technology; one polite live region announces status and counts. Errors use text and an icon or label, not color alone. Do not animate skeleton shimmer under reduced motion.

### Recommendation explanations

- Collaborative result: “Listeners in the training data played both this track and your seed.”
- Popular alternative: “Popular among listeners in this dataset.” Display in a separate group, never appended invisibly to a related-track ranking.
- Conditional ALS result: “Connected through learned listening patterns.” Only when that model is actually serving.
- Exact listener counts require computed, version-compatible evidence. Otherwise use a nonnumeric explanation.
- No percentage match, enjoyment probability, mood, BPM, or genre claim without appropriate evidence.

The API-to-UI contract should identify result kind, reason code, recording identity, model version, optional evidence, and optional links. It is a proposed contract for Stage 5, not an implemented endpoint. Missing optional fields must not break a row. Dataset/model details live in About or expanded details, not in the primary search workflow.

## 4. Shared accessibility and responsive system

These rules are proposals for all five variants. They will require rendered verification later.

### Common tokens and behavior

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 CSS px.
- Body: 16 px / 24 px; supporting text and labels: 14 px / 20 px; result titles: 18 px / 26 px. Express these in rem in implementation. Short display headings have explicit desktop/tablet/mobile sizes, not viewport-dependent continuous scaling.
- In the direction specifications, three heading sizes mean desktop/tablet/mobile font sizes; a two-number results-heading pair means font size/line height in CSS px.
- Body stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Each variant may self-host its one proposed display family after verifying font files and keeping its license notice.
- Breakpoints for planning: mobile below 768 px, tablet 768–1023 px, desktop at least 1024 px. Layout must also work between those widths.
- Page gutter: 16 px mobile, 24 px tablet, 32 px desktop; center the direction's maximum content width.
- Shared semantic colors: error `#9F2434` on `#FFF0F2`; caution `#735000` on `#FFF6DB`; success `#116354` on `#E7F4EE`; information `#1436A8` on `#EAF0FF`.
- All primary controls target at least 44 × 44 CSS px. This is the project's chosen target, not a statement of the WCAG AA minimum.
- Focus: 3 px primary-color outline with a 3 px light offset; on primary-colored fields use a white inner ring plus dark outer ring. No clipping by rounded or overflow-hidden ancestors.
- Selected state combines visible text or a checkmark with the primary border. Hover uses an opaque tinted surface. Pressed state uses a darker border. Busy buttons retain labels. Disabled actions include an explanation where necessary.
- Interactive boundaries use the stronger border token. Faint decorative rules may be lighter, but must not be the only way to identify a control.
- Semantic list, heading, form, button, anchor, and disclosure elements. Ranks are real list positions, not fake playback controls.
- Optional artwork is not required. Initial prototypes use rank labels and flat neutral blocks rather than invented covers. No imagery is sourced during this stage or the initial placeholder-variant stage.
- Motion budget: a restrained 150 ms state transition; no entrance choreography, orbiting objects, parallax, autoplay, or decorative loading movement. Reduced motion removes nonessential transitions.

### Planned verification requirements

Follow WCAG 2.2 AA as the implementation target: normal-text contrast at least 4.5:1, large-text contrast at least 3:1, and relevant non-text controls at least 3:1. Verify visible focus, keyboard operation, and unobscured focus. These are partial criteria, not a complete conformance claim. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Test at 320, 390, 768, 1024, and 1440 CSS px; include text zoom, 400% browser zoom/reflow where applicable, reduced motion, forced colors, keyboard-only navigation, and screen-reader announcements. No horizontal page scrolling for ordinary content. Titles and artist credits wrap without covering actions. Header height is a minimum, not a fixed clipping constraint; navigation may wrap rather than hide essential links.

Proposed content stress cases: a 120-character title, multiple artists, non-Latin text, no duration, no link, no image, 0/1/10 results, and long error messages. Long tokens may wrap. Do not truncate the sole accessible version of a track title.

### Calculated opaque color pairs

Ratios below were calculated from the proposed sRGB hex tokens using relative luminance. Values are rounded; gradients, transparency, font rendering, overlays, and actual focus geometry remain untested.

| Direction | Body on surface | Muted on surface | White on primary | Control border on canvas |
|---|---:|---:|---:|---:|
| v1 | 13.77:1 | 6.84:1 | 9.89:1 | 4.15:1 |
| v2 | 14.18:1 | 6.34:1 | 9.73:1 | 3.96:1 |
| v3 | 12.81:1 | 6.36:1 | 8.93:1 | 3.94:1 |
| v4 | 11.65:1 | 6.04:1 | 8.45:1 | 3.71:1 |
| v5 | 14.06:1 | 6.58:1 | 9.47:1 | 3.80:1 |

Error, caution, success, and information text pairs calculate to 6.84:1, 6.76:1, 6.32:1, and 8.67:1 respectively. Ocean-green accents below reuse the shared success foreground and may not be used as tiny decorative text on unknown surfaces.

## 5. Universal hero reservation contract

Each future direction has exactly one initial-screen hero reservation. The direction specifications below define width-to-height aspect ratios, location, and future image treatment. They are specifications, not assets or implemented CSS.

- Use a fixed-aspect media wrapper with the direction's solid hero color. No gradient, illustration, generated artwork, or broken-image icon inside the placeholder.
- The wrapper determines layout before an image loads. The future image fills that wrapper with the documented fit and position; intrinsic image dimensions must not resize the page.
- Mobile may reduce width but preserves the specified ratio. A cap is a width cap, not a height crop that silently changes aspect ratio.
- Keep all headings, search controls, and essential text outside the media box. Future imagery must not determine contrast or obscure controls.
- Hero content is decorative. The placeholder is noninteractive and hidden from assistive technology; a future decorative image uses empty alternative text. If its role later becomes informative, review its alternative text and product purpose.
- Do not collapse the reserved box when the image fails. Keep the flat fallback.
- Asset replacement must preserve wrapper dimensions, text wrapping, control positions, and surrounding spacing at each planned width.
- The future asset brief must supply the exact aspect ratio and focal safe zone. Mobile art direction may use a different crop only within the same reserved geometry.
- All future variant folders are `v1/` through `v5/`. No folder or frontend file is created for them in Stage 4.

## 6. Five complete proposed directions

The comparison uses identical product copy, navigation labels, fixture data, and state coverage. Typography and composition differ; capability does not. Each direction has its own material grammar. Do not mix their signature treatments.

### v1 — Blue Horizon

1. **Concept and rationale:** An airy blue-and-white discovery surface influenced most directly by images 7–8. The defining move is a broad atmospheric media field alongside a plain, immediately usable search area. Fine horizontal rules organize real information rather than imitating telemetry.
2. **Palette and tokens:** canvas `#F4F9FF`; surface `#FFFFFF`; body `#172D4F`; primary `#1436A8`; muted `#465C7A`; control border `#647A99`; hero `#DCEBFA`; accent `#116354`. Panel radius 20 px, button radius 10 px, input radius 10 px. Content maximum 1200 px.
3. **Typography:** Manrope 500 for the short initial heading, 64/48/36 px desktop/tablet/mobile with 1.08 line height; Manrope 600 at 28/32 for results headings. Shared system body and controls; no tiny tracked technical labels.
4. **Layout and first viewport:** Conventional top navigation, minimum 64 px high. Main content starts 32 px below it. Desktop uses two equal columns with 48 px between them: task heading, supporting sentence, search, and starting points on the left; hero on the right. Search is visible before scrolling at a 1440 × 900 reference viewport. Results replace the hero arrangement with a centered list, maximum 960 px.
5. **Hero specification:** Right column, top aligned with the task heading; width 100% of that column; **4:3**. At a 1200 px content width the column is 576 px and the slot is 576 × 432 px. Flat `#DCEBFA`. Future fit `cover`, focal position 60% 50%. Tablet/mobile place it after search and starting points, centered at a maximum width of 480/360 px. No overlap with copy.
6. **Materials:** Opaque white content areas, a very light blue ground, sparse silver separators. Any later gloss stays on the outer media edge, never on text or the flat placeholder.
7. **Navigation and controls:** Text navigation with an underlined current page. Search is a plain white field and solid cobalt submit button. Secondary actions are outlined or underlined text; no floating control dock.
8. **Song cards:** Open list rows separated by fine rules, minimum 104 px on desktop. Rank at left, title/artist and reason centrally, actions at right. Details expand beneath the same row. No required cover art.
9. **Responsive behavior:** At tablet width the opening stacks; result actions wrap below metadata before they collide. On mobile every result is one vertical row with full-width content and a wrapping action group. The decorative hero follows all initial task controls.
10. **Accessibility:** Opaque text surfaces preserve the computed contrast pairs. At zoom, heading size and wrapping yield to search visibility. Fine decorative rules are never used as input boundaries.
11. **Complexity:** Low relative complexity: standard grid, semantic list, and simple borders. No blur or graphics runtime.
12. **Strengths and tradeoffs:** Closest to the primary reference atmosphere and economical to implement. It can become visually ordinary if typography, spacing, and the eventual media are weak; the design must remain identifiable even with its flat hero slot.

### v2 — Disc Study

1. **Concept and rationale:** Silver, compact-disc-era precision translated into a centered search experience. One circular media frame supplies the hardware character; all controls remain conventional web controls. No fake transport buttons or physical-device bezel surrounds the application.
2. **Palette and tokens:** canvas `#EEF2F5`; surface `#FBFCFE`; body `#142B3D`; primary `#193E94`; muted `#4C6073`; control border `#68798D`; hero `#C9D5DF`; accent `#116354`. Panel radius 32 px, button radius 999 px, input radius 16 px. Content maximum 1040 px.
3. **Typography:** Michroma 400 for short initial headings at 40/34/28 px with 1.2 line height. Restrict it to headings, not track titles or navigation. Results headings use the system family at 28/34, weight 600. Shared system body and controls.
4. **Layout and first viewport:** Top navigation above a centered task column, maximum 640 px. Heading and search appear before the media. A centered 320 px disc slot follows at a 24 px gap, then starting points. Search stays near the top; the disc is a focal accent, not the gateway to the task. Results use a central seed summary and one full-width ordered list.
5. **Hero specification:** Centered below the search form, **1:1**, 320 px maximum desktop width, 280 px tablet, 224 px mobile; never wider than its container. Flat `#C9D5DF`. The square wrapper has a circular clipping frame. Future fit `contain`, position 50% 50%; future artwork must keep its subject inside the central 80% of the square. The placeholder itself remains one flat color.
6. **Materials:** Matte silver canvas and opaque near-white results. A thin concentric outline around the media and restrained two-tone CSS frame shading evoke reflective hardware. Chrome is limited to that one focal treatment and a narrow seed-summary border.
7. **Navigation and controls:** Compact text links in a normal header. Pill-shaped primary Search button; rectangular labeled input. A selected seed has a plain “Change seed” action, never a rotating dial.
8. **Song cards:** Rounded near-white rows with a narrow rank column and stable action area. Duration appears only if known. Thin separators, rather than extra glass layers, divide metadata and expanded details.
9. **Responsive behavior:** Centered composition remains centered; the disc shrinks by its stated width cap. Search button stacks below the field when needed. Result actions move beneath title and artist at mobile widths. No radial arrangement of tracks.
10. **Accessibility:** All controls sit outside the circular crop. At increased text size, the task column grows vertically; no fixed-height “device screen.” Strong focus outlines must remain visible around pill buttons.
11. **Complexity:** Low-to-medium: standard layout plus a single decorative circle and carefully controlled border treatments.
12. **Strengths and tradeoffs:** Strongest compact-disc identity and simple responsive structure. The central media can consume vertical space, so the search must remain above it and results must omit it.

### v3 — Pearl Orbit

1. **Concept and rationale:** A smooth, iridescent interpretation inspired by image 4, grounded in the pale atmosphere of images 7–8. A sculptural media field and one quiet orbital outline provide expression; readable white surfaces carry all decisions.
2. **Palette and tokens:** canvas `#F5F7FF`; surface `#FFFFFF`; body `#293052`; primary `#343F9E`; muted `#575E7D`; control border `#747A98`; hero `#DDE2F7`; accent `#116354`. Panel radius 28 px, button/input radius 14 px. Content maximum 1200 px.
3. **Typography:** Sora 500 heading at 56/44/32 px with 1.1 line height; Sora 600 results heading at 28/34. Shared system body, artist credits, and controls. Rounded character comes from the type, not inflated pill shapes everywhere.
4. **Layout and first viewport:** Top navigation above a desktop split: media occupies 52% of the usable width after a 40 px gap; task copy and search occupy the remainder. Media is left, task area right, with the task area top aligned rather than pushed down to the media midpoint. Results use a 280 px seed summary beside a flexible list at desktop widths.
5. **Hero specification:** Left of the initial task area, **5:4**, width equal to its grid column. At 1200 px content width: 603.2 × 482.56 px. Flat `#DDE2F7`. Future fit `cover`, position 35% 55%. Below 1024 px place it after task controls and starting points, centered, capped at 400 px tablet / 300 px mobile. No text overlaps the image.
6. **Materials:** Opaque pearl-white surfaces. A restrained cyan/lilac edge treatment may decorate the media frame, but the reserved image slot stays flat. One nonanimated orbital stroke is confined to the decorative frame and must not resemble a chart or progress indicator.
7. **Navigation and controls:** Conventional top links and cobalt-violet primary action. Solid input background; no blurred field. Focus and selected states use the same primary token consistently.
8. **Song cards:** Each result is a distinct white card with a rounded upper edge, title/artist first, reason below, and a consistent action footer. Cards remain a single ranked column; a masonry grid would weaken ranking clarity.
9. **Responsive behavior:** The initial media moves after controls. The desktop seed summary becomes a compact block above results on tablet/mobile. Card footer actions wrap without reordering their DOM sequence.
10. **Accessibility:** No essential text on iridescent borders. The outline is aria-hidden and cannot intercept clicks. At forced colors, borders and structure remain legible without the decorative edge.
11. **Complexity:** Medium: asymmetrical grid, responsive seed-summary placement, and restrained decorative layering. No WebGL, animated shader, or heavy blur.
12. **Strengths and tradeoffs:** Most sculptural interpretation while retaining readable task surfaces. Risk: familiar glassmorphism if too many panels acquire glow or transparency; keep every working surface opaque.

### v4 — Capsule Current

1. **Concept and rationale:** A contained blue-white interface with clear work areas, taking image 5's curved enclosure discipline without importing its darkness, racing content, or visual density. The signature is a single continuous rounded outer panel that groups the task.
2. **Palette and tokens:** canvas `#EAF4F6`; surface `#F9FDFE`; body `#183B49`; primary `#1547A6`; muted `#466670`; control border `#64818B`; hero `#CADFE5`; accent `#116354`. Outer panel radius 24 px, row radius 12 px, button/input radius 10 px. Content maximum 1200 px.
3. **Typography:** Rajdhani 600 for short initial headings at 48/40/32 px, line height 1.1. Results headings at 28/34 in Rajdhani 600; track titles, body, and controls use the shared system family. Technical feeling comes from short headings, not microscopic uppercase labels.
4. **Layout and first viewport:** Header outside the main panel. Inside it, a desktop 336 px task column and flexible right column separated by 24 px. With 24 px panel padding, the right column is 792 px at a 1200 px outer width. Left: heading, search, starting points. Right: media and a short explanatory sentence beneath it. In results state, the left column becomes seed/search context and the right becomes the ranked list.
5. **Hero specification:** Right column, top aligned with the task heading, **16:9**, full column width; at the stated desktop dimensions, 792 × 445.5 px. Flat `#CADFE5`. Future fit `cover`, position 60% 50%. Below 1024 px it moves after search and starting points, full inner width, same ratio. A 12 px radius clips the media only.
6. **Materials:** One opaque shell with pale blue-green inset regions and thin silver dividers. No nested translucent card stack. Ocean green denotes semantic support states; it does not recolor all actions.
7. **Navigation and controls:** The same top links, then a labeled vertical search form in the task column. Search, Change seed, Retry, and row actions use conventional buttons. No knob, dial, waveform control, or fake meter.
8. **Song cards:** Compact rows within the continuous right panel; metadata and reason on the left, actions to the right. Expanded details create space in normal flow. The rank is a number in a small outlined cell, not a status light.
9. **Responsive behavior:** Collapse to one column below 1024 px; task context appears before results. Do not introduce independently scrolling columns. On short-height or zoomed screens nothing is sticky. Desktop stickiness, if later used, is limited to compact context and must not obscure focus.
10. **Accessibility:** Strong boundaries identify fields and controls; outer panel outlines are decorative. All content stays in document flow. Focus rings escape neither clipping nor obscured scroll areas.
11. **Complexity:** Medium: two distinct work regions and state-dependent content, using standard CSS grid. No extra navigation system or interaction model.
12. **Strengths and tradeoffs:** Strong task organization and a contained visual identity. The narrower result area can crowd long titles; mobile wrapping and title stress tests are particularly important.

### v5 — Cobalt Signal

1. **Concept and rationale:** A typographically assertive interpretation of period graphics, borrowing restrained display energy from images 1–3 and 6 while keeping the clean blue-white world of images 7–8. One short condensed italic heading is the signature; the page remains a usable discovery screen.
2. **Palette and tokens:** canvas `#F1F5FF`; surface `#FFFFFF`; body `#152B50`; primary `#1238B0`; muted `#4A5E7E`; control border `#687E9E`; hero `#C7D7F3`; accent `#116354`. Panel radius 8 px, button/input radius 6 px. Content maximum 1280 px.
3. **Typography:** Barlow Condensed 700 italic for the initial heading at 80/64/44 px, line height 1.0, with no skew transform. Results headings use Barlow Condensed 600 upright at 32/38. Shared system body and controls. No outlined body text, chrome word art, or stylized track titles.
4. **Layout and first viewport:** Top navigation followed by a desktop two-column task band: heading/supporting sentence on the left and search on the right, equal widths with 32 px gap. A full-width panoramic media reservation follows 24 px below; starting points follow the media on desktop. On mobile, heading, search, and starting points all precede media. Results replace the large task band with a compact seed heading above a ruled ordered list.
5. **Hero specification:** Full content width below the initial task band, **3:1**; 1280 × 426.67 px at maximum width. Flat `#C7D7F3`. Future fit `cover`, position 50% 55%. Tablet/mobile retain 3:1 at available width, after task controls; no fixed minimum height and no text overlay. The future composition must tolerate this panoramic crop without requiring readable details.
6. **Materials:** Crisp white fields, strong cobalt type, pale-blue blocks, and thin silver rules. A short solid cobalt rule anchors the initial heading. No chrome gradients or orbital outline from the other directions.
7. **Navigation and controls:** Upright system-font navigation, square-ended rectangular controls, solid cobalt Search action. Technical ornament stays outside hit targets and conveys no invented status.
8. **Song cards:** Strongly aligned ruled rows with a cobalt rank, generous title width, muted artist and reason, and clearly separated actions. Upright typography preserves readability. No poster lettering inside results.
9. **Responsive behavior:** Stack the task band at tablet/mobile widths, keep its full copy, and place starting points before media on mobile. Rows wrap into metadata, reason, then action groups. The large heading may wrap naturally; do not shrink it to fit one line.
10. **Accessibility:** Italic display is confined to one short heading and never an instruction or control. Search remains upright and visible. Panoramic media is decorative and has no hidden text to reproduce.
11. **Complexity:** Low-to-medium: typography and alignment demand care, but there are no advanced visual effects. Font fallback and text wrapping need explicit checks.
12. **Strengths and tradeoffs:** Most expressive display identity with straightforward implementation. Risk: drifting into an unreadable poster; limit the treatment to the opening heading and keep the results compact and conventional.

## 7. Comparison, selection, and future prototype boundaries

| Direction | Distinguishing composition | Hero | Relative implementation complexity |
|---|---|---|---|
| v1 Blue Horizon | Equal split, task left, media right | 4:3 right field | Low |
| v2 Disc Study | Centered search, circular focal slot | 1:1 below search | Low–medium |
| v3 Pearl Orbit | Large media left, task right; seed rail in results | 5:4 left field | Medium |
| v4 Capsule Current | One contained panel with task/result regions | 16:9 right inset | Medium |
| v5 Cobalt Signal | Bold task band above a panorama | 3:1 full width | Low–medium |

My planning recommendation is to use v1 as the reference for clarity and reference fidelity, and v2 as the strongest hardware interpretation. This does not eliminate or select a direction. All five should receive the same functional-state comparison before final selection, as requested.

Future authorized prototypes must use the same seed, ranked fixture list, explanations, missing-link case, sparse case, and error case. If actual model output is not ready, every variant must visibly label demonstration data; never invent a measured score or claim a synthetic ordering came from the model.

Use shared behavior and representative data to prevent five divergent applications. Give each folder its own composition and token definitions; do not create five independent recommendation services. Exact repository structure belongs to Stage 5. Do not install dependencies or create these folders in this stage.

Planned comparison rubric, not scored results:

- Task clarity and speed of understanding: 30%.
- Accessibility, readable content, and state handling: 25%.
- Faithfulness and distinctiveness within the reference brief: 20%.
- Responsive behavior and long-content resilience: 15%.
- Implementation and maintenance cost: 10%.

Accessibility failures block selection regardless of weighted score. Compare at matching widths and with the same content. Assess both the initial screen and the working results screen; a strong hero alone is insufficient. User preference remains part of the final decision. No scores have been assigned and no usability study has run.

## 8. Planned UX verification and measurable acceptance criteria

### Stage 4 planning completion

- [x] Defined discovery, search, recommendations, details, and About surfaces.
- [x] Defined query preservation, reseeding, browser history, and focus behavior.
- [x] Documented success, loading, empty, ambiguous, sparse, unsupported, missing-data, failure, and demo states.
- [x] Preserved one-seed functionality and evidence-grounded copy.
- [x] Specified shared tokens and accessibility targets.
- [x] Documented all twelve required design dimensions for each of five distinct directions.
- [x] Specified exact hero aspect, placement, color, fit, focal position, and responsive geometry.
- [x] Checked the listed opaque contrast pairs and font-license sources.
- [x] Defined a fair future visual comparison; no direction selected.
- [ ] Render and compare variants: future authorized prototype stage.
- [ ] Verify browser accessibility, responsive layout, and real data behavior: future implementation stages.

### Future implementation acceptance

1. A keyboard user can search, select a seed, inspect Details, open an available link, reseed, and return using browser Back without a trap or lost context.
2. The UI always identifies the seed associated with displayed results; a delayed response cannot overwrite a newer selection.
3. Every displayed related track and explanation comes from the active model response or is visibly labeled demonstration data.
4. Sparse output remains a shorter honest list. Popular alternatives are a separate labeled group and missing links do not disable unrelated actions.
5. All five variants support the same fixture/state suite at 320, 390, 768, 1024, and 1440 px, with no unintended horizontal overflow.
6. Text zoom, keyboard focus, reduced motion, and screen-reader status behavior meet the shared requirements; automated checks supplement manual inspection.
7. Replacing a flat hero with an image of the specified geometry does not move adjacent text or controls. Failure to load keeps the wrapper in place.
8. Navigation, search, and result actions remain usable with decorative styling and imagery removed.
9. No fake player, nonfunctional decorative control, autoplay, or unlabeled fabricated metric appears.
10. Validation records distinguish source checks, arithmetic contrast checks, rendered inspection, interaction tests, and user feedback.

No browser tests or usability results are claimed in Stage 4. Planned implementation tests belong in Vitest/Playwright as appropriate; no tests are needed for merely proposing typography and layout.

## 9. Dependencies, risks, and decisions

- **Data feasibility:** Starter tracks, result examples, disambiguation fields, and listening links depend on Stage 6. Do not hardcode a universal-catalog promise into the design.
- **Model evidence:** Exact counts and explanation labels must correspond to the serving artifact. The UI must tolerate missing optional evidence.
- **Mainstream versus recent releases:** Comprehensive new-release support could require different acquisition and unsupported-search behavior; it is not promised.
- **Outbound links:** If built-in playback becomes mandatory, revisit card actions, availability states, terms, and schedule before implementation.
- **Five variants:** Five shared-functionality explorations are achievable only with bounded surfaces and a common fixture contract; five complete production products would exceed the intended scope.
- **Fonts:** License files are verified, but actual font loading, glyph coverage, file sizes, and fallback metrics are not. Self-host only the chosen variant's required files in the final release and retain license notices.
- **Visual effects:** Flat hero placeholders are fixed requirements for initial variants. Iridescent/chrome frame decoration must not replace missing imagery or compromise contrast.
- **Temporary references:** Available now but not durable application assets. This document records the design hierarchy without redistributing the reference images.

Input still needed before final scope/scheduling: weekly development hours and hardware, confirmation of outbound links, and must-support artists/genres/eras. No input is required to finish this planning stage. Final aesthetic selection should wait for the equal-content rendered comparison rather than be forced from prose.

## 10. Stage 5 handoff and source notes

Stage 5 should convert the accepted product and design proposals into a bounded implementation plan: shared frontend/variant structure, data-to-UI contracts, dataset audit gates, model/API integration, milestone acceptance, testing, deployment, and a realistic 6–8-week scope. Stop after this Stage 4 document until continuation is authorized.

Primary references checked for this stage:

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- [Manrope license](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt).
- [Michroma license](https://raw.githubusercontent.com/google/fonts/main/ofl/michroma/OFL.txt).
- [Sora license](https://raw.githubusercontent.com/google/fonts/main/ofl/sora/OFL.txt).
- [Rajdhani license](https://raw.githubusercontent.com/google/fonts/main/ofl/rajdhani/OFL.txt).
- [Barlow Condensed license](https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt).

The five font sources each contain SIL Open Font License terms. Font files have not been fetched, bundled, modified, or rendered. No imagery has been generated or sourced.
