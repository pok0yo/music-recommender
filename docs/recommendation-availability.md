# Recommendation availability checkpoint — November 2, 2026

## Prepared behavior

The API now attaches `available_recommendations` to tracks returned by search, starters and recommendations. It counts the recording's frozen model neighbors that have verified metadata in the same pinned serving catalog, up to ten. It is an availability count, not a quality score, and is independent of the request's result limit and device-local dismissals.

The selected record-player display and native browse list show counts for partial lists. A zero-result recording remains available for preview, details and listening destinations, while Discover and More like this are disabled with an explanation. Scene confirmation uses the same guard before changing animation or request state. Historical layouts, the disc picker and player console guard their seed actions too. Existing shared URLs still fetch and show truthful empty states rather than silently changing the seed. Missing/null counts from older API versions stay usable; demo fixtures remain illustrative and unchanged.

Counts are computed on demand using the existing frozen artifact and one additional batched metadata lookup per response, not one database request per song. No metadata acquisition, model change, database migration, stored catalog mutation or new dependency is involved. Database failures return the existing unavailable error rather than a misleading zero count.

## Validation

- All 40 backend tests passed, including catalog-bound counts, one batched lookup, unchanged payloads/ranks, request-limit independence, strict integer bounds and database-error handling.
- The isolated read-only v3 snapshot was queried for every one of its 5,474 seeds. Each seed and returned recommendation's availability matched an independently calculated intersection of frozen neighbor IDs and snapshot metadata IDs. All 17 known zero-result seeds were represented honestly. Starters and a YOASOBI search were also checked. This did not import v3 into PostgreSQL.
- Three focused browser tests passed: count validation and older-response compatibility; zero/partial/unknown browsing with retained listening access and keyboard confirmation guards; and zero-result onward reseeding, all five historical layouts, and direct empty-seed URLs. The narrow 390-pixel layout had no horizontal overflow and no detected Axe WCAG 2 A/AA, 2.1 AA or 2.2 AA violations in the tested state. Desktop and narrow hint screenshots were reviewed in the graphics-unavailable fallback.
- All six existing homepage browser checks passed, covering real/demo/developer access, history, shared searches, cancellation, old links, software graphics and metadata-unavailable recovery.
- Type checking and the isolated production frontend build passed. The build included the final application changes; subsequent changes affected tests/documentation only.

The first focused browser attempt had two incorrect test selectors for the existing native Listen disclosure; corrected selectors passed. The preceding full GitHub browser run on `1be998a` had a software-rendered animated-water test timeout. It is not a green full-suite baseline. The new commit's GitHub results must be assessed separately; focused checks do not certify the entire browser suite.

The full-snapshot check uses in-memory snapshot metadata with the actual frozen model. Hosted PostgreSQL latency for the added batch and physical-device behavior with these hints were not measured here. Earlier phone/Safari acceptance is user-reported and predates this checkpoint. Local proof is summarized in [availability evidence](evidence/recommendation-availability.json); screenshots remain ignored under `artifacts/`.

## Activation and rollback

This is an inactive implementation checkpoint. The public catalog remains v2 with 4,996 recordings. No public frontend/backend deployment, database import, additional acquisition or link-release activation occurred. Hints expose the prepared v3 boundary; they do not repair its 17 empty onward lists or establish improved recommendation accuracy.

The next authorization must review the paired catalog/link import and pinned packaging described in [the v3 repair](catalog-gap-repair-v3.md), verify the added database batch's hosted latency, and assess current CI before public activation. Keep v2 and its original compatible links as the immutable rollback baseline. Frontend and backend should be released together so availability is present. Older responses remain compatible during rollout, but do not supply the hints.

No production rollback is needed now. To discard this inactive implementation, revert its scoped Git commit; do not delete or reset the acquisition ledger/cache or prior release files. Public rollback continues to use the exact previously pinned deployment inputs in the [release runbook](release-phase-5.md).
