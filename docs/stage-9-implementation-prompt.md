# Stage 9 implementation prompt

> October 21, 2026 revision: the user's approved glass-and-chrome concept and request for five different app structures supersede this prompt's earlier separate fonts, palettes, and exact compositions. See DESIGN.md and docs/stage-9-frontend.md for the current structures. All five still share the API behavior and fixture suite; heroes remain flat CSS reservations. This historical prompt's implementation, evidence, privacy, and user-selection boundaries still apply.

Copy the prompt below into Codex in this repository after the newly installed skills become available. Defaults: working product name “Music Recommender,” the five approved directions, and minimal motion. Change the working name if the user supplies one.

---

Implement Stage 9 of this Music Recommender project: five distinct visual prototypes, followed by a user selection gate and completion of the selected frontend.

## Read the project first

Inspect the checkout, Git status, existing dependencies, and applicable AGENTS.md instructions. Read:

- `docs/stage-4-design-plan.md`
- `docs/stage-5-implementation-plan.md`
- `docs/stage-8-backend.md`
- `docs/evidence/stage-8-decision.json`
- `backend/openapi.json`
- `backend/schemas.py`

Preserve accepted model/backend code, contracts, private data, generated artifacts, and existing user changes. There is no frontend yet at this prompt's preparation checkpoint; verify that before choosing the smallest compatible implementation. Commit and push meaningful verified milestones to the existing private repository. Check both account usage windows between milestones; stop safely before either falls to 10% remaining, using a 15% stopping buffer. Save a clear checkpoint and stop active project jobs if that buffer is reached.

## Apply the installed skills with defined responsibilities

Use the exact local files below to avoid ambiguity with similarly named plugin skills. Announce the skills you apply, read their instructions, and load their referenced files as needed.

1. **Impeccable** — `C:/Users/ylant/.codex/skills/impeccable/SKILL.md`. Use it to preserve a coherent design system, clear hierarchy, accessible controls, and polished working states within the approved Stage 4 directions.
2. **Emil Kowalski design engineering** — `C:/Users/ylant/.codex/skills/emil-design-eng/SKILL.md`. Apply component details, responsive press/hover/focus feedback, interruptible interactions, and its decision about whether a transition is useful at all. Use its Before/After/Why review table when reviewing UI code.
3. **Explicitly invoke `prototype`** — `C:/Users/ylant/.codex/skills/prototype/SKILL.md`, including `PICKER.md`. Apply its full-size, one-variant-at-a-time comparison and user-owned selection gate to the whole discovery prototype. This request explicitly asks for five variants, not the skill's default three or a single isolated button. Keep switching instant and the picker separate from product navigation. Its keyboard shortcuts must not capture typing inside controls.
4. **Taste** — `C:/Users/ylant/.codex/skills/taste-skill/SKILL.md`. Its frontmatter name is `design-taste-frontend`; use this installed path rather than a similarly named plugin copy. This is a working discovery application. Read `references/app-screens.md` in full and use its app-screen guidance for task hierarchy, product identity, honest states, responsive composition, and screenshot critique. Do not apply the marketing-page workflow indiscriminately to Discover. About is a readable methodology surface, not a new marketing landing page.
5. **Explicitly invoke `break-ui`** — `C:/Users/ylant/.codex/skills/break-ui/SKILL.md`, including `CATALOG.md`. Exercise realistic, schema-shaped long/short titles, multi-artist credits, Unicode, missing fields, 0/1/10 results, and API failures through the shared data boundary. Any fixture switcher is preview-only. This implementation request authorizes reporting and fixing routine in-scope defects; pause only if a fix changes product scope or requires a consequential user design choice.
6. **Mobile and optional motion checks** — use `mobile-native/SKILL.md` for applicable viewport, touch, input, zoom, and safe-area behavior. Use `review-animations/SKILL.md` and `animation-performance/SKILL.md` only if animations exist or a measured problem calls for them. Do not introduce animation libraries or features merely because a skill is installed. The installed Swift, Expo, Sonner, and other unrelated skills are not project requirements.

### Project requirements override conflicting skill defaults

- Keep all five approved directions. Do not randomize or redraw palettes, typography, or compositions using Taste's direction generator.
- Preserve the airy Y2K / Soft Club brief, deliberate whitespace, fine technical lines, restrained chrome, curved panels, and limited orbital details where Stage 4 specifies them. Do not turn the application into either a generic dashboard or a marketing poster.
- Reserve the prescribed initial-state hero slots despite generic app guidance to omit heroes. Remove the large hero in the working results state as Stage 4 requires.
- Do not generate, search for, source, download, or draw replacement imagery. Do not run image-search or asset-acquisition scripts. Hero reservations remain flat CSS fills; no gradients, photographs, illustrated substitutes, or generated assets inside them.
- Do not satisfy marketing-page motion quotas, add scroll scenes, moving images, autoplay, or continuous animation. Use restrained purposeful feedback, preserve immediate keyboard behavior, and honor reduced motion.
- Keep `v1/` through `v5/` and comparison evidence in Git after selection. Do not follow a prototype-cleanup default that deletes approved comparison sources. Omit unused preview routes and fonts from the eventual production release.
- Do not narrow the work to one component, drop required states, or create five independent applications. The behavior is shared; the presentations are genuinely distinct.
- Preserve the user's no-emoji instruction in copy and fixtures. Unicode stress tests do not require emoji.

Use supported Taste inspector options only after reading their help/source, with app mode for Discover. Its measurements are diagnostic, not authority to erase the brief. Record intentional exceptions explicitly. Never hide real accessibility, overflow, contrast, or interaction failures, alter a checker to manufacture a pass, or claim zero failures if exceptions remain. Do not execute unreviewed external scripts merely because they were bundled with a skill.

## Build five bounded prototypes, then stop for selection

Create the five root presentation folders and preview routes `/variants/v1` through `/variants/v5` using one shared behavior/data layer:

| Folder | Direction | Initial hero reservation |
|---|---|---|
| `v1/` | Blue Horizon | Right column, 4:3, flat `#DCEBFA` |
| `v2/` | Disc Study | Centered below search, circular frame within 1:1, flat `#C9D5DF` |
| `v3/` | Pearl Orbit | Left of the task area, 5:4, flat `#DDE2F7` |
| `v4/` | Capsule Current | Right column, 16:9, flat `#CADFE5` |
| `v5/` | Cobalt Signal | Panorama below the task band, 3:1, flat `#C7D7F3` |

Follow the exact typography, dimensions, mobile placement, future image fit/focal position, tokens, and materials in Stage 4. Size the whitespace and type as though the eventual image already exists, with no adjacent layout change when it is substituted. Do not copy reference people, artwork, brands, slogans, or compositions. Do not source cover art or fonts from screenshots. Verify font-file licensing before using a display family and keep readable body typography.

Each variant must have its own defensible composition and visual character, not a palette swap. Keep navigation, search, ranked results, Details, and reseeding immediately understandable. No decorative fake controls, player chrome, invented metrics, or unnecessary navigation.

Use Next.js, React, TypeScript, and Tailwind with only necessary components/dependencies. Verify compatible versions and pin them. Reuse installed/platform capabilities; do not migrate the backend or add accounts, playlists, streaming, social features, or a feedback service.

## Shared interactions and API honesty

Implement explicit search submission, selecting a matching track, selected-seed loading, an ordered recommendation list, inline Details, reseeding, direct seed URLs, and browser Back.

Use the Stage 8 schemas and actual API behavior. Keep old results labeled with their old seed while a new search runs. When a new seed is selected, show its identity and clear stale recommendations. Cancel or disregard outdated requests so late responses cannot overwrite a newer selection. Preserve recoverable input after failures.

The real serving catalog contains 215 recordings and 32 supported starters. It is not universal music search. Further reseeding may return limited metadata. Honor `status`, original rank positions, `omitted_metadata_count`, `model_result_count`, and version/method/data-mode fields. Do not pad lists, promote hidden ranks, invent recommendation reasons, or present similarity as enjoyment probability.

All current external listening links are null. Treat absence as an ordinary unavailable state; do not fabricate links, add a fake play action, or imply audio playback. Display available aggregate evidence accurately using “Connected through shared listening in this dataset.” Keep database credentials and artifact paths server-side; the browser receives only the public API location and nonsecret metadata.

Give every variant the same named fixture suite: entry, search/no match, loading, 0/1/10 recommendations, realistic long/Unicode text, missing metadata/link, unknown/invalid seed, API errors, timeout, outage, and 429 behavior. Keep synthetic preview fixtures visibly labeled and separate from real API mode. Never silently fall back to fixtures when the API fails. Respect the local API rate limit when testing; mocks cover repeated deterministic scenarios, while a separately recorded real smoke check confirms the active service.

## Verify and compare before selecting

Use meaningful tests for the shared behavior: navigation/history, stale responses, request failures, state transitions, and real/demo separation. Check all required states at the Stage 4 widths: 320, 390, 768, 1024, and 1440 px. Inspect actual browser rendering and interactions, not just source or screenshots alone.

Verify semantic controls, keyboard operation, visible focus, focus movement after explicit selection, status announcements, readable contrast, zoom, reduced motion, Unicode wrapping, and no unintended horizontal overflow. Distinguish browser emulation from real-phone hardware testing; report hardware checks as unverified if unavailable. Do not claim full accessibility conformance from automated checks.

Capture matching desktop/mobile screenshots of initial and results states for all five directions. Apply Taste's look-and-fix discipline and Emil's component review where useful. Fix routine defects before comparison. Use the Stage 4 rubric: task clarity 30%, accessibility/state handling 25%, aesthetic fit/distinctiveness 20%, responsiveness/long content 15%, maintenance cost 10%. Accessibility failures block selection. Any scores are documented design judgments based on rendered evidence, not user-study results.

At the selection gate, provide five reviewable full-size previews, actual screenshots, measured/observed findings, a concise tradeoff table, and a reasoned recommendation. Ask which direction I want to finish and stop. Do not silently select or promote a winner.

After I explicitly choose, finish its responsive `/discover` and `/about` screens and all specified states, retaining the comparison sources. Do not advance to Stage 10 integration acceptance or deploy anything without authorization. Distinguish fixture tests, real-data smoke checks, actual browser checks, and remaining work in the final report. Never invent results.

---

## Why this works

The skills have distinct jobs: Impeccable maintains coherence; Emil's tools improve component behavior, fair comparison, and resilience; Taste supplies task-focused composition and browser critique. Explicit overrides prevent their general defaults from replacing the five approved directions, removing the hero reservations, adding imagery or excessive motion, or crossing the user's selection gate.
