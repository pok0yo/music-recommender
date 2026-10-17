# Stage 6 — data feasibility audit

Audit date: 2026-10-17. **Stage 6 is in progress; the published sample fails the event-data gate.** No training-ready dataset, frozen evaluation split, or model is approved. This report distinguishes executed checks from proposed next work.

## 1. Scope and assumptions

1. Established mainstream songs remain the provisional target, without an account or listening-history integration.
2. The user will supply specific artists/tracks. The 40-track acceptance panel is therefore pending; no substitute panel has been silently selected.
3. Availability is flexible ("whenever I am free"), not a quantified weekly commitment. The earlier effort range remains a planning estimate, not a delivery promise.
4. No paid compute or hosting budget has been established. This checkpoint uses the existing local Python and a bounded public sample download.
5. This is the Stage 6 source/resource gate. A failed source does not authorize fabricated interactions, training on popularity summaries, or changing the evaluation task without recording the change.

The change reaches two audit utilities, their tests, a small CI workflow, aggregate evidence, and the README. There are no app callers, database migrations, model exports, or frontend fixtures yet. Existing planning files remain intact.

## 2. Observed local resources

| Item | Observation |
|---|---|
| Physical RAM | 16,267,988,992 bytes, approximately 15.15 GiB. |
| Free C: disk before acquisition | 140,495,450,112 bytes, approximately 130.85 GiB. |
| Runtime used | Existing CPython 3.15.0, Windows x86_64. |
| Added packages | None. Audit uses standard-library Zstandard, tar, JSON, hashing, HTTP, and unittest. |
| Persisted sample | 246,734,240 bytes, approximately 235.30 MiB. |
| Sample expanded file sizes | 2,420,517,782 bytes in total, approximately 2.25 GiB; streamed, not extracted. |
| Successful local audit duration | 10.341 seconds, including local checksum verification and scan; excludes download. |

Disk availability changes over time. Peak process memory and download throughput were not measured, so these observations are not a memory/throughput benchmark. The audit runtime does not fix the eventual ML environment; check library compatibility when Stage 7 is authorized.

## 3. Sample provenance and exact findings

- Source: [published sample directory](https://data.metabrainz.org/pub/musicbrainz/listenbrainz/sample/listenbrainz-sample-20250610-094311-full/).
- Filename: `listenbrainz-sample-dump-20250610-094311.tar.zst`.
- Published SHA-256, matched against the complete downloaded file: `509282544c50b324db8dfb4e33a5af4012f514c153da077a0fb07f093956168b`.
- Archive schema marker: `8`. All 25 regular files were inventoried. No links or special archive members were extracted or executed.
- Full aggregate inventory and schema counts: [audit evidence](evidence/stage-6-sample-audit.json). This contains field names/counts and file properties, not listener records or copied metadata values.

| Actual content | Observed count |
|---|---:|
| Artist metadata JSON rows | 5,549 |
| Recording metadata JSON rows | 450,279 |
| Release-group metadata JSON rows | 28,162 |
| `.listens` members | 0 |
| JSON rows with listen time and listener identity | 0 |

CSV headers describe aggregated popularity. Thirteen Parquet files were inventoried but not decoded; their filenames concern metadata, tags/genres, recording lengths, and recording feedback. The reviewed generator likewise exports metadata/popularity/auxiliary tables, not a listening-event sample. Feedback is not interchangeable with chronological listen events.

The JSON files really are line-delimited JSON. The artist file contains a **94,308,020-byte line including its newline**. Initial 2 MiB and 64 MiB bounds rejected it. A framing probe identified the unusually large row; the final parser retains line-based parsing with a 128 MiB line bound and a 4 GiB total expanded-file bound. No parser failure is counted as an empty dataset, and no rows were silently truncated to make the audit succeed.

### Selection method and bias

The [historical upstream generator revision reviewed](https://github.com/metabrainz/listenbrainz-server/blob/69246933c082436af41b6806383a9f49a9548512/listenbrainz/dumps/sample.py) selects up to 100 artists from all-time sitewide artist statistics, then exports related caches and popularity tables. This revision predates the dump, but the exact deployed producer commit is not independently verified. Its behavior explains the archive's observed schema; it is not evidence of a random listener sample.

This selection is popularity-conditioned and artist-conditioned. It cannot establish coverage of the user's desired mainstream panel. The 450,279 recording rows are metadata records, not 450,279 supported recommender items or evidence of interaction density.

### Licensing and field boundaries

The archive's `COPYING` file contains CC0 1.0 Universal text, and [MetaBrainz identifies ListenBrainz dumps as CC0](https://metabrainz.org/datasets/postgres-dumps). However, the sample also includes cached MusicBrainz `tag_data` and genre/tag Parquet tables. [MusicBrainz distinguishes core and supplementary data licenses](https://musicbrainz.org/doc/MusicBrainz_Database). Do not treat the archive-level notice as sufficient field-level clearance for all imported supplementary content.

For this audit, no tags, genres, cover art, demographics, popularity values, or feedback rows are exported into training or a public catalog. Any future catalog projection must explicitly select permitted identity/title/artist fields and document their provenance. The repository contains only aggregate audit evidence and source references. No audio, artwork, or playback rights were acquired.

## 4. Feasibility decision

**Reject this sample as the collaborative-training and temporal-evaluation input.** It lacks the listener–recording–timestamp events needed for binary interactions, shared-listener counts, and future-listening targets. Supplied aggregate popularity cannot be recomputed from our training interval and must not become the baseline for a leakage-aware comparison.

| Required check | Status |
|---|---|
| Pinned source acquisition/checksum | Passed for this sample. |
| Readable schema and bounded processing | Passed with the documented large-row allowance. |
| Listener-event data suitable for proposed task | Failed for this sample. |
| Mapping correctness and event deduplication | Not assessed on actual events; no event input selected. |
| Timestamps and six-month/28-day/28-day split | Not assessable on this sample. |
| Training support and neighbor availability | Not assessable on this sample. |
| 80% of agreed 40-track panel supported | Pending user panel and suitable events. |
| 500 scorable queries / 100 seeds per holdout | Not assessable; no split has been frozen. |
| Training-ready reproducible preprocessing | Not completed; source decision required first. |

The audit utilities are reproducible acquisition/inspection work, not a substitute for the promised preprocessing pipeline. Stage 7 remains closed.

## 5. Replacement acquisition options

### Preferred investigation: bounded ListenBrainz Spark extraction

The latest directory inspected was [2026-10-15 full export](https://data.metabrainz.org/pub/musicbrainz/listenbrainz/fullexport/listenbrainz-dump-2722-20261015-000002-full/). It lists the ordinary listens archive at 241G and the uncompressed Spark tar at 231G. The Spark response reports exactly 247,707,453,440 bytes. Either complete file exceeds the observed free disk space; do not download it wholesale.

A live 512-byte request to the Spark tar returned HTTP 206 with the exact requested range and a consistent ETag. This proves range access at that moment, not that a useful subset fits the budget or contains valid events. The bounded header probe in `ml/probe_spark.py` records the first eight regular member names, byte sizes, and offsets without downloading listening payloads. It rejects ignored ranges, changed ETags, excessive requests, and oversized reads. Archive-level SHA-256 is not claimed verified by this partial read.

The observed prefix contains `SCHEMA_SEQUENCE`, `TIMESTAMP`, `COPYING`, and **`0.parquet` through `4.parquet`**, with the five Parquet files sized 60,557, 13,285, 11,959, 16,310, and 11,255 bytes respectively. These numbered files do not identify calendar months in their names. Their schemas, date coverage, row-group layout, and listener selection remain unverified. Do not assume the small prefix files represent later members or the full dataset. An initial broader header inventory was stopped to bound repeated network requests; the final utility intentionally samples eight entries and explicitly reports `full_inventory: false`.

The completed bounded run used 31 range requests and transferred 12,295 bytes; see [Spark prefix evidence](evidence/stage-6-spark-prefix.json). The [exporter revision preceding this dump](https://github.com/metabrainz/listenbrainz-server/blob/0a0ba8ebf3ac3856e22c480ba76565ba0d3607bc/listenbrainz/listenstore/dump_listenstore.py) writes numbered Parquet files sorted oldest to newest, targeting approximately 128 MB per file. Its schema includes listen/creation times, listener IDs, nullable recording MBIDs, and metadata. That is source-code evidence, not verification that this exact commit ran in production or that every exported value is valid. Chronological ordering makes selective acquisition a reasonable investigation, not an established feasible dataset.

Next, inspect a bounded Parquet payload/schema and the current exporter to establish how file numbers map to dates or partitions. Only then propose a specific interval and byte/storage budget. Preserve all events for deterministically selected listeners across the entire interval; do not select the easiest first few files and call them representative. Freeze selection before examining model performance. Hash every retained input and pin the parent archive URL/ETag; do not describe subset hashes as verification of the whole tar. Host retention may remove this dated export, so preserve sufficient provenance and a permitted reproducibility route.

The [dump documentation](https://listenbrainz.readthedocs.io/en/latest/users/listenbrainz-dumps.html) describes monthly Spark JSON organization; the actual numbered Parquet members show that description cannot be used as this export's parser specification. The documentation also explains that incremental dumps are grouped by submission time, which may differ from listen time. A few recent increments are not automatically a complete eight-month listening window; historical imports and deletions complicate that shortcut.

### Conditional alternative: MLHD+

[MLHD+](https://musicbrainz.org/doc/MLHD%2B) provides per-listener timestamp/MBID records; its `complete` archives are the relevant candidates. The smaller `partial` archives contain missing/unresolved data and are not a clean small equivalent. [The published directory](https://data.metabrainz.org/pub/musicbrainz/listenbrainz/mlhd/) lists each complete shard at roughly 15G.

This is a consequential source change: the original [MLHD collection](https://ddmal.ca/research/The_Music_Listening_Histories_Dataset_(MLHD)/) dates to circa 2013–2014, while MLHD+ uses a March 2023 metadata snapshot. A historical catalog may not fit the user's desired artists. Dataset-specific reuse terms and public-demo implications still require verification; no MLHD+ archive was downloaded or approved. Do not assume ListenBrainz's CC0 terms automatically apply to a separately collected dataset simply because it shares a host.

An acoustic or metadata-only model would change both the product promise and evaluation task. It is not an automatic fallback from this failed gate.

## 6. Reproducing the executed checks

From the repository root, with Python 3.14+ available:

```powershell
python -m unittest discover -s ml/tests -v
python -m ml.audit_sample --download
python -m ml.probe_spark
```

The sample command downloads only the pinned archive to ignored `data/raw/`, verifies its full size/hash, and writes `data/interim/sample-audit.json`. A valid existing archive is reused. An invalid existing archive or interrupted `.part` is preserved for inspection, never silently overwritten. Reports refuse to overwrite an existing output; use `--output data/interim/sample-audit-rerun.json` for a repeat. The Spark probe also supports `--output` and does not download listening payloads.

Local execution used the installed interpreter at `C:/Users/ylant/AppData/Roaming/uv/python/cpython-3.15.0-windows-x86_64-none/python.exe`. Initial sandbox temp-directory restrictions affected two filesystem tests; running with working temporary-directory access resolved that environment issue. No package installation was necessary.

Tests cover metadata/event distinction, malformed/non-object JSON, UTF-8 and large-row accounting, archive links, expansion/line limits, checksum failure, preservation of existing files, bounded downloads, exact HTTP-range/version validation, and PAX long names/offsets. Synthetic test records are not real listener data and do not demonstrate recommendation quality.

All **13 local tests passed** on the stated Windows/Python runtime. The CI workflow runs the standard-library tests on Python 3.14 with read-only repository permissions and no dataset downloads, credentials, or live provider calls in the tests. CI execution status must be reported separately from local tests.

## 7. Remaining Stage 6 work

1. Receive the user's artist/track list and agree on the coverage panel; clarify any requirement for recent releases.
2. Use the observed Spark prefix and exporter evidence to size a selective event acquisition and agree on a practical resource budget, or explicitly choose and license-check a different event source. An initial proposal is a 1 GiB schema/date probe ceiling and a separately agreed cap for the eventual interval; the probe may establish that even the desired bounded interval is unsuitable. No such event download has begun.
3. Acquire the selected bounded event data, audit identity/timestamp quality and sampling bias, and implement/test actual normalization and deduplication.
4. Measure support/coverage, freeze chronological splits and train-only eligibility, and record the original pass/revise gates with all denominators.

Do not mark Stage 6 complete until these checks have real evidence. No recommendation performance, mainstream coverage percentage, or evaluation sample size has yet been measured.
