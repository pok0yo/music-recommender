# Targeted catalog repair — prepared, inactive

Prepared November 2, 2026. The public catalog remains v2 with 4,996 recordings. No database import, pinned deployment release, public activation, retraining, or frontend design change is included in this checkpoint.

## Result

The prepared v3 catalog contains **5,474 verified, model-supported recordings**. All 4,996 existing payloads are retained exactly, and all 48 formerly empty recommendation lists now have ten displayable results. The four affected original-artist seeds were prioritized: “Catch a Grenade (The Hooligans remix),” “Young, Wild & Free,” “Leaving Toronto,” and “Live Without Your Love.”

| Population | Before | Prepared result |
| --- | ---: | ---: |
| Original 48 empty seeds with ten results | 0 | 48 |
| Existing 4,996 seeds with ten results | 3,248 | 3,299 |
| Existing seeds with zero displayed results | 48 | 0 |
| All searchable recordings | 4,996 | 5,474 |
| All searchable seeds with ten results | 3,248 | 3,332 |
| All searchable seeds with zero displayed results | 48 | 17 |

The added 478 recordings create a new boundary: 33 have complete ten-result lists and **17 have no displayable onward recommendations**. Across the expanded population the complete-list share is 60.87%; across the unchanged original population it improves from 65.01% to 66.03%. These denominators must not be conflated. Metadata repair does not establish better recommendation accuracy, and three original model-short lists still cannot reach ten through metadata acquisition.

The original 32 starters and the following 205- and 638-seed rounds remain complete. All ten original-artist catalog groups now have at least one displayable result per seed; partial lists remain. Full per-artist counts, five journey rounds, rank diversity, missing-result positions and the 17 new gap IDs are in [preparation evidence](evidence/catalog-gap-repair-v3.json).

## Acquisition and identity

The approved 478-ID selection is frozen under `data/processed/catalog-gap-repair-v3/selection.json`. The tool accepts either LF or the native Windows CRLF serialization of the exact audited inventory; differing identities still fail the audit hash check. An initial newline mismatch stopped before the first network request and was corrected.

The existing metadata ledger and checksummed cache were reused. Twenty batch requests plus individual lookup/redirect handling and one batch retry added **31 charged attempts**, reserving **11,681,823 bytes (11.14 MiB)**. Received response bodies added 900,791 bytes; neither number claims complete wire traffic. The cumulative 256 MiB ledger now reserves 248,300,014 bytes, leaving **20,135,442 bytes (19.20 MiB)**. No allowance was reset or increased. Cache, retained v2 output and prepared v3 output total approximately 140.95 MiB against the existing 1 GiB disk cap. Paid-service spending was $0. The Stage 6 ledger hash was unchanged.

All 478 identities were resolved. Five official canonical redirects were independently checked; no added row had to be excluded as a duplicate canonical identity. Existing distinct versions and model recording IDs remain intact. Every new served row was reproduced from its checksummed official response, with model membership and support checked against the frozen artifact. No titles, credits, artwork, URLs or support values were invented.

MusicBrainz's indexed official documentation was checked on November 2: [core-data licensing](https://musicbrainz.org/doc/About/Data_License), [API terms](https://musicbrainz.org/doc/MusicBrainz_API), and [rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting). The existing identified User-Agent, 1.1-second spacing, response bounds, atomic cache receipts and conservative retry accounting were retained. Only core recording metadata is used for serving.

## Versions and replay

- Model manifest SHA-256: `ac341968aef80dc9f5eb9459eea5e5ba119e9112c9b2dc38026dda00bc92f122`.
- Prepared catalog: `catalog-v3-0d44b0620107fe42678732b45397b8514be01ca0f9ed3829f468ca68afdf2b0b`.
- Prepared compatible links: `links-v2-7215ce1c0902f3bf33f0390cd35dfb425794a312f3b15ced4e3be70cba18cd47`.

The 130 existing checked destinations across 76 recordings are preserved with their original verification timestamps. A new catalog-specific link-manifest version avoids rebinding an already-published version. No new provider destinations were acquired or freshly revalidated; newly added songs use the existing explicitly labeled service searches.

`python -m backend.repair_catalog` resumes this exact selection using the original allowance. Do not delete or reset its ledger, cache, frozen selection or prior releases. `python -m backend.repair_catalog --verify-only` rechecks the prepared snapshot without acquiring metadata. Generated catalog rows, cached responses and model arrays stay ignored by Git.

## Validation

All **37 backend regression tests passed**. Full snapshot verification queried all **5,474 API seeds**, checking real labels, model compatibility, response status, original ranks, shared-listener evidence and exact metadata omissions. It also checked the 32 starter identities, all original-artist searches, unaccented Giveon and unsupported-seed recovery. An offline replay with network access forbidden passed and left ledger request/reservation totals unchanged. A restricted Windows replay stalled and was stopped; the normal-process replay completed successfully.

The existing frontend was built locally against an isolated read-only snapshot API. Browser checks verified “Leaving Toronto” returning ten results, onward reseeding to “SNL” returning nine with an explicit omission notice, Back restoring the ten-result list, and search finding newly added SNL. Provider searches were clearly labeled. A new boundary seed displayed “Song details unavailable” with a change-song/search recovery path. No browser errors were observed. [Local UI verification](evidence/catalog-gap-repair-v3-ui.json) records the cases; captured proof remains ignored under `artifacts/catalog-gap-repair-preview.png`. The temporary preview services were stopped afterward. The local preview was not a public catalog activation. User-reported phone/Safari acceptance remains recorded in the audit; this checkpoint did not rerun physical-device tests.

## Activation gate and rollback

**Do not activate automatically.** The next release review must address the 17 new boundary gaps and acknowledge the many partial new lists. Recommended next work is to make onward recommendation availability explicit before selection for those entries, while preserving listening access and truthful limited states; further metadata acquisition would need a separately frozen selection and authorization. Do not hide these gaps by padding lists or calling model-supported recordings unsupported.

The subsequent [availability checkpoint](recommendation-availability.md) implements those hints and guards without further acquisition. It remains inactive; the transactional import, pinned paired release and hosted checks below still require the next authorization.

Activation will require a transactional catalog import through `backend.catalog`, a reviewed import path for the newly bound links (the current `backend.listening_links.import_release` still targets pilot paths), and compatible pinned packaging through `backend/release_files.py` / `deploy/release.json`, followed by hosted checks. These active defaults and manifests remain untouched here.

The previous v2 catalog, original listening-link release and current public deployment remain the rollback baseline. Since this checkpoint is inactive, no rollback operation is needed now. A later public switch must retain those paired immutable releases and exact pinned deployment inputs.
