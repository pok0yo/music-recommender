# Recommendation coverage repair — audit checkpoint

Preparation is now complete as a separate inactive checkpoint: [v3 preparation and remaining boundary gaps](catalog-gap-repair-v3.md). The audit below records the baseline before acquisition.

Audited November 2, 2026. This checkpoint changes documentation only. No metadata was acquired, release activated, model retrained or application deployed.

## Verified baseline

The frozen model contains 565,147 recordings. The checked serving release contains 4,996 recordings; its content hash and the model's manifest, array hashes and eligibility rules were validated against the local artifacts. The public API reported the same catalog version in two spot checks.

| Displayable recommendations | Searchable seeds |
| --- | ---: |
| Ten | 3,248 |
| One through nine | 1,700 |
| Zero | 48 |

All 48 empty lists have ten stored, supported model neighbors. Their problem is missing display metadata, not an absence of model connections. The public API confirmed zero displayed, ten model results and ten omissions for Pink Floyd's “Breathe (in the Air).” The approved starter “typical” returned ten real results with no omissions.

Across the catalog, 6,576 result positions are omitted for 3,693 distinct missing neighbor identities. The 48 empty lists require 478 distinct neighbor identities. Three different seeds have intrinsically short model lists: “Lighters” (two), “Die With a Smile (instrumental)” (two), and “Mirror” (five). Metadata acquisition cannot create extra model connections for these recordings.

The original 32 starters, 205 next-round seeds and 638 following-round seeds all return ten displayable results. In the next round, 1,537 of 1,539 seeds return ten. Four empty seeds have credits from the original artist panel: one Daniel Caesar, one Steve Lacy and two Bruno Mars recordings. These populations overlap on collaborations; artist counts are not additive catalog totals.

## Reusable resources and limits

729 cached response sources were checked across the catalog ledger, listening-link ledger, Stage 8 metadata receipts and panel identity lookups. No missing neighbor can safely be added from these caches under the current canonical identity policy. One cached identity is already represented by a served canonical equivalent; counting it again would bypass the existing alias policy.

The catalog metadata ledger retains its original 256 MiB allowance. It has charged 236,618,191 bytes over 463 attempts, leaving **31,817,265 bytes (30.34 MiB)**. This is the existing remaining allowance, not a new authorization or allowance reset. Its current cache/output footprint is 125.74 MiB under the existing 1 GiB disk cap. No ledger was opened for writing or reset during this audit.

## Proposed next checkpoint

Prepare an inactive, versioned metadata repair beginning with the four original-artist empty seeds, then the other empty seeds. Freeze the 478 required model IDs and reuse the existing metadata cache and acquisition ledger. Preserve the current 4,996 records and previous release for rollback. Verify redirects and canonical aliases using the existing policy; do not assume all 478 identities will become distinct new catalog rows.

Using the existing batch size of 25 requires 20 initial batch requests. At current conservative reservation bounds, those batches reserve 10.31 MiB. An individual lookup for every candidate would add 14.94 MiB, totaling **25.25 MiB**, before additional retries or redirect-verification requests. These are reservation estimates, not predicted wire downloads. Stop before exhausting the existing remaining allowance or disk cap; request further approval if the repair cannot finish within them. Expected paid-service cost is $0. Do not buy services or reuse the separate listening-link allowance.

Use the official [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) and its [rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting), preserving the existing 1.1-second request spacing, response bounds, checksums and checkpoints. Recheck applicable source licensing before acquisition; this audit's direct license-page fetch timed out, so no new license verification is claimed.

Before activation, recompute coverage for every old and newly added seed, explicitly reporting any new boundary gaps. Fixing the original 48 does not prove that all newly added recordings will themselves have complete journeys. Report original-artist coverage separately, preserve original ranks, and never pad lists. The API and current UI already distinguish metadata-unavailable lists from no model connections; retain those states and offer existing search/change-song controls. No new recommendation-accuracy claim follows from this repair.

Next authorization covers preparation and focused validation, not public release activation. Acquisition or activation has not begun. Evidence: [audit summary](evidence/recommendation-coverage-audit-2026-11-02.json); full local gap inventory remains ignored under `artifacts/`.

## User-reported device verification

On November 2, the user confirmed that phone/Safari testing works smoothly. This is user-reported acceptance; exact device models, OS/browser versions and an agent-observed device trace were not supplied. It supersedes the prior absence of user device confirmation, without changing historical automated-test results.
