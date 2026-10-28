# Catalog expansion v2

## Authorization and boundary

On October 28, 2026 the user approved metadata-only expansion toward 5,000 model-supported recordings, centered on the original ten artists and their connections. Fresh limits are 256 MiB downloaded, 1 GiB additional disk, and no paid services. Original-artist journeys take priority over a universal 95% completeness claim. Recent releases remain nonessential. The trained model, rankings, UI, and initial 32 approved starters are preserved. Activation requires a separate go.

The active release remains `data/processed/stage-8-catalog-v1/release.json`. Prepared data, raw response caches, model arrays and credentials remain ignored by Git.

## Acquisition and selection

`backend.metadata_cache` owns a new SQLite ledger at `data/interim/catalog-expansion-v2/ledger.sqlite` and an OS-backed exclusive process lock. It never opens the Stage 6 ledger for writing. Each batch/browse attempt reserves a 512 KiB response bound; an individual recording attempt reserves 16 KiB. Both include one overflow byte and 16 KiB overhead; failures and interrupted attempts remain charged. This is conservative application accounting, not packet-level metering. Gzip responses have a separate 4 MiB decoded limit. The new cache/output directories have a 1 GiB disk allowance. Redirects are recorded explicitly, limited to three hops, and restricted to the same official recording endpoint; every network hop is charged. Equivalent query-parameter orderings can reuse the same cached body. Checksummed responses are committed atomically with their receipts inside SQLite. Resume verifies existing content rather than downloading it again. Requests are spaced at least 1.1 seconds apart, with bounded Retry-After/backoff for temporary provider errors. A long requested pause stops the run for later resumption.

The source is the official MusicBrainz recording API. Artist browsing is paginated at 100 records, matched to the confirmed artist IDs, and intersected with the existing model. The model requires at least five training listeners per recording and at least three shared listeners per retained edge. Four recommendation rounds from the approved panel and all original catalog records are protected. Additional supported recordings by the original artists are included, then a deterministic support-ordered breadth-first traversal fills toward 5,000, following stored model ranks. The selection and model hash are frozen in `data/processed/catalog-expansion-v2/selection.json`.

Missing metadata is searched in exact-MBID batches of 25; only requested recording IDs are accepted. Missing IDs receive individual lookups, with separately verified canonical redirects. Response titles and artist credits are schema-checked. Version disambiguation and original model IDs are retained. Proven canonical duplicates are excluded with explicit alias mappings, favoring existing v1 identities; distinct versions are retained. Unavailable metadata is reported rather than replaced. A complete preparation requires at least 4,900 distinct rows, all approved starters and ten displayable results throughout the first three recommendation rounds from the panel. No audio, artwork, genres, ratings, popularity substitutes or listening links are invented. Extra fields in source responses are not promoted into the catalog.

Source documentation: [MusicBrainz API/search](https://musicbrainz.org/doc/MusicBrainz_API/Search), [rate limits and application identification](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting), [core metadata license](https://musicbrainz.org/doc/About/Data_License). Core metadata is CC0; the application does not reuse supplementary tags or ratings. Documentation was consulted on October 28, 2026.

## Reproduce and verify

From the repository root, with the existing ignored model and v1 inputs present:

```powershell
.venv/Scripts/python.exe -u -m backend.expand_catalog
.venv/Scripts/python.exe -m backend.verify_catalog_expansion
.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
```

The acquisition command resumes the same approved allowance. Do not delete its ledger, process-lock database, response records, or frozen selection to work around a failure. Stop before exceeding the allowance or changing the candidate-selection rules. On a provider error, retry later using the same command.

Preparation writes `recordings.json` and a content-addressed `release.json` to `data/processed/catalog-expansion-v2/`. Public aggregate evidence is `docs/evidence/catalog-expansion-v2.json`; source responses and recording payloads are excluded from Git. The verifier rechecks every display field against hashed source responses, model membership and release hashes, then exercises the actual API against an in-memory pending snapshot. It checks starter/artist search, reseeding, original ranking positions, support evidence, omissions and real-mode labeling. Snapshot verification is distinct from a PostgreSQL import and an active-site switch.

## Release and rollback

The importer now accepts explicit preparation/report paths and preserves the original defaults. It validates the complete preparation, unique identities, the frozen model and recording eligibility before connecting to PostgreSQL. A single transaction inserts a new version without replacing existing rows.

The following is the release procedure for the activation checkpoint, not an instruction to activate automatically:

```powershell
.venv/Scripts/python.exe -m backend.catalog --directory data/processed/catalog-expansion-v2 --report docs/evidence/catalog-expansion-v2.json
$env:CATALOG_RELEASE = 'data/processed/catalog-expansion-v2/release.json'
npm run api
```

Stop any previous API instance before restarting. Confirm readiness, returned catalog version, search and reseeding before marking activation complete. The frontend already uses recording IDs and returned release metadata; no artwork or demo-catalog replacement is required. Keep the initial approved shelf at 32 starters, with bounded search results and existing sleeve pagination.

Rollback: stop the API, set `CATALOG_RELEASE` to `data/processed/stage-8-catalog-v1/release.json`, and restart `npm run api`. Verify readiness and the original 215-record release. Keep v2 data for inspection; no deletion or reverse migration is required.

## Limits

Increasing display coverage is not retraining or a new recommendation-accuracy result. Boundary seeds can still have missing metadata or insufficient model connections; API statuses and rank gaps remain truthful. The previous eight unsupported panel titles are not made supported by metadata acquisition. Search results preserve distinct versions. Original-artist browsing is a snapshot of currently returned MusicBrainz identities, not proof of complete artist discographies. No deployment or paid service is included.

## Verified preparation result

The prepared release contains **4,996 distinct model-supported recordings**: one of the 5,000 selected IDs was unavailable and three were proven canonical aliases. Existing v1 identities take precedence, so all 215 original rows remain. Fifty-five redirected model identities were verified. The frozen model and original acquisition ledger are unchanged. Explicit UTF-8 decoding preserves source spelling; new search text also includes unaccented forms such as Giveon alongside GIVĒON.

| Coverage population | Complete ten-result lists |
|---|---:|
| Original 32 starters | 32/32 |
| All original 215 catalog seeds, before expansion | 47/215 |
| All original 215 catalog seeds, after expansion | 215/215 |
| Second-round reachable seeds | 205/205 |
| Third-round reachable seeds | 638/638 |
| Fourth-round reachable seeds | 1,537/1,539 |
| Fifth-round reachable seeds | 2,750/2,908 |
| Entire new serving catalog | 3,248/4,996 |

All-catalog mean displayable results are 8.68; three recordings have fewer than ten stored model neighbors, independently of metadata availability. Full coverage and per-artist counts are in [preparation evidence](evidence/catalog-expansion-v2.json). The initial 32 starters and all other existing v1 records now have complete lists; additional artist recordings and graph boundaries can still return limited lists. No universal 95% claim is made.

The new ledger charged 463 attempts and reserved 236,618,191 bytes (225.66 MiB) against the 256 MiB cap. Successful received response bodies total 18,851,800 bytes; this is not a claim about complete wire traffic. Cache/output usage measured approximately 126 MiB, within the 1 GiB allowance. Paid-service spending was zero. Initial oversized responses and interrupted/failed attempts remain charged. The old Stage 6 ledger was verified unchanged.

Validation passed: 16 backend tests, the existing 48 model/audit tests, all 4,996 source-row and model-membership checks, and 315 pending-snapshot API seed queries. The verifier also checks all ten original artists, unaccented Giveon search, ranks, support evidence, omissions and real labels. [API verification](evidence/catalog-expansion-v2-verification.json).

The selected 3D UI passed search, recommendation and reseeding checks with pending real-model response replay for newly added songs by nate sib, Tiffany Day and Daniel Caesar. It retained the same canvas and real-mode label. [UI verification](evidence/catalog-expansion-v2-ui.json). Reproduce that check after starting the frontend with `node scripts/verify-catalog-expansion-ui.mjs`; `backend.verify_catalog_expansion` creates its ignored response cases first. This does not activate the release or substitute demo results in the application.

The new version has not been imported into PostgreSQL or selected by the active API. Those live release checks remain part of the explicit activation checkpoint. Physical-device and Safari validation are not included.
