# Public-release Phase 2 — selected interface

The user authorized this phase after the read-only readiness audit. The launch target is an open public website using free services only. This checkpoint promotes the existing interface locally; it does not deploy the website or complete Stage 10.

## Routes and behavior

- `/` renders the selected Orbital record desk directly, using the real API by default.
- `/?mode=demo` explicitly labels illustrative results and offers a return to real recommendations. Real failures never select demonstration data.
- `/?dev=1` exposes the existing environment controls. The same option works on the retained Orbital prototype route; ordinary visits omit the development controls from the DOM.
- `/?q=Tiffany` restores a search on direct entry, refresh and Back/Forward. Selecting a song pushes a seed URL. Seed links take precedence over a retained search query, restoring the recommendations and search-field context.
- Starting a new search from recommendations pushes a search-only URL, allowing Back to return to the prior seed. A pending recommendation request is canceled so it cannot later overwrite that search URL.
- Existing prototype/comparison/About URLs remain usable. Retired artwork redirects retain their original query parameters.

The existing Details control explains shared-listening connections, catalog limits, external listening destinations and device-local feedback. Its native controls, single mounted 3D canvas, model, water and button animations are retained. Page metadata now describes music discovery rather than unselected design previews. The retained About pages no longer claim there are only 215 serving recordings or no checked links/feedback.

## Validation on October 29, 2026

- The final production build and its TypeScript validation pass.
- Fifteen focused homepage, record-desk and listening/feedback checks pass. Four new homepage checks cover real/demo/development entry, direct search links, refresh, seed restoration, Back/Forward, pending-request cancellation, retained canvas and existing Orbital links.
- Nine shared-discovery checks pass across the five earlier layouts, including keyboard navigation, reseeding, Back, stale requests, unavailable service, rate limiting and request timeout. The About disclosure/navigation/responsive/accessibility check also passes. Total: 25 focused browser tests; this is not a full-suite or remote-CI pass.
- A separate browser smoke uses the actual local API without intercepting responses. A Tiffany search restores after refresh; ALWAYS FUN is selected, recommended, reseeded and restored through Back and reload. Listening controls, dismiss/Undo and the retained canvas work. Ten observed API responses identify real mode, catalog `catalog-v2-1c2f222147176b362426ab426936307f16d273de21bbd9b9ed6eee0b629c9766` and model `item-cf-cohort-v2-lambda-50`.
- Desktop 1440x900 and mobile 390x844 automated accessibility scans report no violations in the checked live states. The mobile page has no horizontal overflow. No browser page errors were observed. This is not a physical-device, screen-reader or Safari result.

No backend, trained-model, catalog or listening-link release was changed. Existing unrelated working-tree edits remain outside this checkpoint.

## Configuration and release boundary

The frontend still uses `NEXT_PUBLIC_API_URL` with a local API fallback. The database, compatible model/catalog releases and optional checked-link release must be provisioned for hosting in Phase 4. Existing startup and rollback instructions remain in `catalog-expansion-v2.md` and `listening-feedback.md`; no acquisition, import, release activation or backend change belongs to this phase.

Phase 3 must investigate the recorded remote browser failures and complete clean-checkout, cross-browser, accessibility and performance validation. Public deployment remains separately gated. A focused local pass does not establish public-release readiness or recommendation accuracy.
