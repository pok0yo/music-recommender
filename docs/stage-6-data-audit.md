# Stage 6 — data feasibility audit

Latest decision: **2026-10-19 — the Stage 6 audit is complete, but cohort-v1 fails the approved coverage gate: 26/40 supported tracks versus 32/40 required. Stage 7 remains closed.** Acquisition, cleaning, reproducibility, and both holdout feasibility checks completed. Sections 1–10 preserve historical checkpoints; sections 11–12 contain the final evidence and revise decision. No model comparison is approved and no recommendation-quality result is claimed.

## 1. Scope and assumptions

1. Established mainstream songs remain the provisional target, without an account or listening-history integration.
2. The user supplied nate sib, Tiffany Day, che, 2hollis, Lucy Bedroque, beabadoobee, Daniel Caesar, Steve Lacy, Bruno Mars, and Giveon. Recent releases are not essential. Four titles per artist are now proposed in [the panel](coverage-panel.json); these are not yet user-agreed recording versions.
3. Availability is flexible ("whenever I am free"), not a quantified weekly commitment. The earlier effort range remains a planning estimate, not a delivery promise.
4. No paid compute or hosting budget has been established. The continuation has a user-authorized initial download cap of 1 GiB, treated as a ceiling from this continuation onward; a larger event acquisition requires a new cap.
5. This is the Stage 6 source/resource gate. A failed source does not authorize fabricated interactions, training on popularity summaries, or changing the evaluation task without recording the change.

At the first checkpoint, the change reached two audit utilities, their tests, a small CI workflow, aggregate evidence, and the README. There are no app callers, database migrations, model exports, or frontend fixtures yet. Existing planning files remain intact.

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


## 8. Authorized continuation: real events and requested artists

The user supplied ten artists, confirmed that very recent releases are not essential, authorized an initial **1 GiB** download cap, and said to continue Stage 6. This is a source audit, not permission to start Stage 7 or exceed that cap.

### Identity and proposed panel

MusicBrainz identities were checked against its API or artist pages. API access succeeded for four artist searches and then returned HTTP 503; no automatic retry loop or successful-access claim is substituted for that failure. Public MusicBrainz pages supplied the remaining identities. The highest search result for `che` was a different person: the provisional intended identity is the Atlanta rapper. Steve Lacy means the singer/guitarist born in 1998. Lucy Bedroque's documented aliases include lostrushi; Giveon's MusicBrainz display spelling is GIVĒON. See [the machine-readable panel and source links](coverage-panel.json).

These **40 titles are proposals**, selected before inspecting pilot artist support. They are neither a popularity ranking nor claimed user favorites. Studio recording MBIDs, featured credits, duplicate recordings, and release versions still need resolution. Freeze the agreed IDs before running the support gate; do not replace failing tracks with better-supported ones afterward.

| Artist | Proposed titles |
|---|---|
| nate sib | typical; go; secret; only1 |
| Tiffany Day | CLOUDS; SAN FRANCISCO SIDEWALK; HELLA BOY CRAZY; KANSAS |
| che | Miley Cyrus; Pizza Time; Bae; blac chyna |
| 2hollis | crush; jeans; gold; lie |
| Lucy Bedroque | AQUAFINA; Mi Amor; No Lie; GIRLS!!! |
| beabadoobee | Coffee; She Plays Bass; Glue Song; the way things go |
| Daniel Caesar | Get You; Best Part; Japanese Denim; Always |
| Steve Lacy | Dark Red; Bad Habit; N Side; Some |
| Bruno Mars | Just the Way You Are; Locked Out of Heaven; Treasure; That's What I Like |
| GIVĒON | Heartbreak Anniversary; Like I Want You; For Tonight; Garden Kisses |

### What was actually decoded

One necessary dependency, **PyArrow 26.0.0**, was installed in the ignored project environment using the existing Python 3.12.14 runtime. Its [documented Parquet metadata and column-reading APIs](https://arrow.apache.org/docs/python/parquet/parquet.html) permit inspection without reading every column. `compression.zstd` is now imported only by the original sample CLI; that CLI still requires Python 3.14+, while other audits/tests work on 3.12.

- The five prefix files total 113,366 bytes and contain 1,168 rows, spanning October 2002 to February 2003. Many were submitted decades later. They are unsuitable for this artist coverage target. [Prefix payload evidence](evidence/stage-6-spark-prefix-payloads.json).
- The latest member, `1509.parquet`, is 41,606,352 bytes. Its locally computed SHA-256 is `369a38579f6de8cc9cac6ca6e3ef4b96e81734e867e4b621874698141f53ca78`. This hashes the retained complete member, not the 247 GB parent archive; no published whole-archive checksum was verified by a range read.
- It contains **508,234 rows**, with listen times **2026-10-14 14:49:34 through 2026-10-15 00:00:01**, and **18,788 distinct listener IDs**. This is a deliberately chosen chronological suffix, approximately nine hours, not a representative listener sample or an eight-month evaluation dataset.
- The observed schema includes nanosecond `listened_at`/`created` timestamps, integer `user_id`, nullable recording MBIDs, and artist-credit MBID lists. Timestamps have no Arrow timezone annotation; UTC interpretation follows the export convention and must remain explicit in preprocessing.
- The Spark archive's own schema marker is **1**, distinct from the earlier metadata sample's marker 8. Its timestamp is `2026-10-15 00:00:02.588811+00:00`; its COPYING member contains CC0 1.0. Only event and core identity/title/artist fields are proposed for use. No tags, artwork, audio, or playback rights are included.

The backwards locator infers a Parquet start from footer offsets and checks it against the actual tar header, its checksum, and member length. It deliberately supports this export's observed 1536-byte PAX header layout and fails on a different layout. All remote reads enforce the pinned URL, ETag, exact HTTP 206 range, size, and request limits. Footer-only reads do not verify full payload contents.

### Event-quality evidence

[The local event audit](evidence/stage-6-event-pilot.json) reports:

| Check | Actual pilot count |
|---|---:|
| Rows with syntactically valid recording MBIDs | 376,793 |
| Missing recording MBIDs | 131,439 |
| Malformed non-null recording MBIDs | 2 |
| Duplicate mapped `(user_id, recording_mbid, listened_at)` rows beyond the first | 17,015 |
| Distinct valid recording MBIDs before any support filtering | 175,094 |
| Nonpositive listener IDs | 0 |
| Creation time earlier than listen time | 6,354 |
| Creation more than one day after listen time | 0 |

A syntactically valid MBID is not independent proof that the submitted recording was mapped correctly. Creation/listen ordering differences need an explicit preprocessing policy; they are not silently removed here. No cleaned training artifact has been emitted. The tiny early files demonstrate retrospective imports even though this newest suffix has no imports delayed over a day. A future training cutoff must report submission-time availability as well as listen-time boundaries; a retrospective evaluation must not be described as an as-of deployment replay.

### Artist presence, not the support gate

Matching uses exact membership in `artist_credit_mbids`, including collaborations. It does not infer identity from a matching artist-name string. Counts below include repeated events; listeners are distinct within each artist, and recording counts include only syntactically valid IDs. No listener IDs or histories are published.

| Artist | Event rows | Distinct listeners | Distinct mapped recordings |
|---|---:|---:|---:|
| nate sib | 31 | 10 | 15 |
| Tiffany Day | 185 | 58 | 36 |
| che | 121 | 28 | 51 |
| 2hollis | 55 | 33 | 25 |
| Lucy Bedroque | 224 | 50 | 43 |
| beabadoobee | 190 | 85 | 53 |
| Daniel Caesar | 130 | 59 | 45 |
| Steve Lacy | 263 | 99 | 36 |
| Bruno Mars | 380 | 185 | 54 |
| GIVĒON | 35 | 21 | 25 |

All ten artists appear in this suffix. **This does not pass the 80% track gate.** The per-track five-listener threshold, three qualifying neighbors, candidate catalog, and validation/test query counts have not been measured on an approved training interval. The pilot will not be repurposed as the final test set.

### Verification and reproduction

The smallest added scope comprises the Parquet inspection/audit utilities, their synthetic tests, one pinned dependency, panel/evidence files, documentation, and the audit CI dependency installation. There are no application callers, model exports, database migrations, accounts, or frontend changes.

With the audit environment installed:

```powershell
uv pip install --python .venv/Scripts/python.exe -r ml/requirements-audit.txt
.venv/Scripts/python.exe -m ml.inspect_spark --latest
.venv/Scripts/python.exe -m ml.inspect_spark --members 165
.venv/Scripts/python.exe -m ml.audit_events --input data/raw/spark-latest/1509.parquet --output data/interim/event-pilot-rerun.json
.venv/Scripts/python.exe -m unittest discover -s ml/tests -v
```

`--latest` refuses an existing output/payload/partial file. Reuse the retained payload for local audits rather than downloading it again. The footer index resumes its existing provenance-checked checkpoint and retains cumulative bounds. These commands have per-operation limits; they are not authorization to run unlimited repeat downloads against the user's cumulative cap.

Local tests passed on Python 3.12.14/PyArrow 26.0.0: **19 tests**. Tests cover exact range/version/budget checks, failed-read accounting, corrupt headers/footer bounds, preserving files on interrupted downloads, projected timestamp reads, nanosecond precision without pandas, missing/invalid IDs, duplicate keys, artist-name collisions, and required-field rejection. Initial fixtures exposed a timestamp conversion issue; serializing Arrow timestamps directly as strings fixed it without adding pandas. Tests use synthetic records and make no live network calls. CI status is recorded separately after the commit.


## 9. Resource decision and next Stage 6 gate

Historical proposal: the additional cap and title panel below were subsequently approved. Section 10 records the active acquisition; earlier statements about pending authorization describe the preceding checkpoint.

[Acquisition evidence](evidence/stage-6-spark-acquisition.json) contains the pinned archive URL/ETag, marker hashes, retained pilot hash, **165 verified tar-header/Parquet-footer locations**, selected decoded date columns, and the arithmetic below. This is a partial archive inventory, not verification of every payload or timestamp in those files.

### Concrete acquisition proposal

Use the following candidate UTC intervals, start inclusive and end exclusive. These are proposed before any recommendation experiment; they are **not frozen splits** until acquisition and support checks succeed.

| Partition | Start | End |
|---|---|---|
| Training: six calendar months | 2026-02-01 | 2026-08-01 |
| Validation: 28 days | 2026-08-01 | 2026-08-29 |
| Test: 28 days | 2026-08-29 | 2026-09-26 |

Actual timestamp-column reads place `1349.parquet` at January 30 17:07:59 through February 1 00:00:00, and `1350.parquet` from February 1 00:00:01. Include file 1349 to retain the exact boundary event. File 1497 spans September 24 12:49:19 through September 26 03:06:26; filter the final hours after the exclusive test cutoff. The inspected source exporter orders files chronologically; this still requires a full timestamp/order check during preprocessing, rather than assuming all interior values are correct. The October 14–15 pilot lies outside this proposed evaluation interval.

| Files 1349–1497 inclusive | Declared compressed bytes | GiB |
|---|---:|---:|
| Complete 149 members | 24,201,427,536 | 22.54 |
| `listened_at`, `created`, `user_id`, `recording_mbid` | 5,799,875,519 | 5.40 |
| Those four plus title, artist name, artist-credit MBIDs | 13,295,252,866 | 12.38 |

The footers declare **320,570,129 rows across the complete members**, including boundary spill. This is not a decoded count of valid interval events or a count of usable training pairs. The figures sum actual compressed column-chunk lengths; request overhead, footer reads, retries, and derived-file size are separate.

**Request a new additional transfer cap of 16 GiB** for the seven-column acquisition, with a hard cumulative stop and bounded retries. Reserve up to **20 GiB of local working space** as a proposal, not a measured requirement. Observed free C: space at this checkpoint was 135,508,623,360 bytes, approximately 126.2 GiB. Full raw members and the complete parent archive are unnecessary. The larger acquisition has not begun and is not authorized by the initial 1 GiB cap.

### Initial cap accounting

- Recorded successful data-body reads in this continuation: **61,388,136 bytes**, approximately **58.54 MiB**.
- An exploratory forward-header scan was interrupted before its final counters were saved. Its entire **64 MiB hard ceiling** is reserved conservatively instead of inventing an exact transfer count. The retained utility now checkpoints completed backwards-inventory entries individually.
- Adding conservative package, MusicBrainz-query, and other-metadata allowances gives an accounted upper allowance of **184,071,528 bytes**, approximately **175.54 MiB**, comfortably inside 1 GiB. The package tool reported a 27.2 MiB wheel download. These allowances are not packet-capture measurements.
- Even adding the previous 246,734,240-byte metadata archive to that conservative accounting stays below 1 GiB. Raw data and the local environment remain Git-ignored.

### What follows approval, within Stage 6

1. Agree on the proposed titles or incorporate the user's substitutions, then resolve exact recording MBIDs/versions and record any ambiguity before measuring track support.
2. Acquire only the selected column chunks within the new cap, preserve their hashes and provenance, and stream processing with bounded batches. The sparse in-memory container used for timestamp probes is not a complete source Parquet file and must never be published as one.
3. Start with a proposed deterministic 10% listener cohort selected by a fixed hash of listener ID, independent of artist choices and future targets. Keep all eligible events for selected listeners throughout all three windows; do not select only listeners who play the requested artists. This reduces retained data and compute, **not the column-download requirement**, because listener IDs are mixed within compressed chunks. Freeze the cohort rule before support/model comparisons; any change is a new dataset version with the original failure recorded.
4. Normalize valid IDs and UTC timestamps, count and quarantine missing/malformed IDs, and deduplicate the explicit listener/recording/listen-time key. Report submission delays, timestamp anomalies, mapping limitations, prolific listeners, sampling effects, and all exclusions. Catalog names in submitted events are not automatically independently verified MusicBrainz names; reconcile eligible recording IDs against permitted core metadata and expose unresolved metadata honestly.
5. Measure train-only item support and qualifying neighbors against the agreed panel, and holdout query/seed counts against the original gates. Freeze splits only after the audit passes. Clarify retrospective reconstruction versus submission-time availability before calling the result a temporal deployment evaluation. No model scores will decide the split dates or panel membership.

The 10% cohort, 20 GiB working-space allowance, and computational practicality remain proposals. Peak memory, full preprocessing runtime, item-neighbor computation, and model quality have not been measured. If support gates fail, report the failure and propose a revision; do not lower thresholds or substitute tracks silently.

**Current result: the event-source existence and bounded-access checks pass for the inspected files. Stage 6 overall remains incomplete.** Full-interval acquisition exceeds the current transfer authorization, and the track panel is still proposed. Stage 7 remains closed.

## 10. Approved acquisition and preparation milestone — 2026-10-18

### Confirmed decisions and implementation scope

The user approved **16 GiB additional transfer** (17,179,869,184 bytes) and all 40 proposed titles. The initial 1 GiB investigation is separate. Recording IDs and versions still require resolution; title approval is not evidence of catalog support.

The working dataset version uses the previously proposed intervals and listener cohort, fixed before any support results. Select positive listener IDs when the first eight SHA-256 bytes of UTF-8 `music-recommender-stage6-v1:<decimal user ID>`, interpreted as an unsigned big-endian integer, modulo ten equal zero. This is deterministic listener sampling, not an exact 10% of events or a representative population claim. Do not adjust sampling or dates in response to model results. Final split acceptance remains gated.

Changed scope: `RangeReader` gains an optional pre-request reservation callback; new acquisition, panel lookup, and cleaning utilities use the existing pinned source, PyArrow dependency, and audit helpers. Tests exercise these callers and synthetic fixtures. CI already discovers them. No new package, application code, model training, authentication, imagery, or deployment is included.

### Durable transfer accounting and recovery

`ml.acquire_events` acquires the seven selected columns from members 1349–1497. Four range requests may run simultaneously. Each reserves its complete requested body plus 16,385 bytes in a shared SQLite ledger **before network I/O**, committed with `synchronous=FULL`. Failed and interrupted attempts remain charged. The ledger is never reset on resume. Metadata lookups reserve 512 KiB per request plus the same allowance; their ledger offsets are -1 and they consume the same 16 GiB cap.

The hard ceiling is on requested HTTP body bytes plus an application overhead allowance, **not a packet-level measurement of TLS/TCP traffic**. Each response requires the exact byte range and pinned ETag; an ignored range, changed version, corrupt cache, or exhausted allowance stops the run. Four-request prefetch stops on an error; small serial reads have at most three attempts, all charged. A separate OS-backed SQLite lock prevents overlapping acquisition processes and releases on process exit. Cached ranges are hashed, flushed to disk, and recorded before use. A range without a committed receipt must be fetched again and charged again. Do not delete the ledger or cache to resume.

The sparse in-memory Parquet container is never saved as an original source file. A new, explicitly derived Parquet file contains only selected-cohort rows within February 1–September 26. All decoded input timestamps must be nondecreasing within and between members. Cohort files and completion state are checkpointed with hashes. Disk space below 4 GiB stops acquisition; the earlier 20 GiB working-space figure remains an estimate, not measured peak use.

The sequential downloader was restarted to enable four simultaneous reads. Its existing reservations and verified cache were reused; any interrupted range remains charged. The initial concurrent-process test exposed an unclosed rejected lock on Windows; that cleanup was fixed and retested.

### Cleaning policy and evidence boundaries

`ml.prepare_events` refuses an incomplete acquisition and verifies retained cohort hashes. It writes a separate temporary output directory and publishes it as complete only after every input succeeds and exclusions reconcile. Existing output and interrupted preparation directories are preserved; preparation can be rerun to a different local output path without another download.

Cleaning trims surrounding whitespace and lowercases recording IDs, rejects missing/malformed UUIDs, retains positive integer listeners, and enforces UTC nanosecond split boundaries. It removes duplicate `(listener, normalized recording MBID, listen time)` keys across batches and file boundaries, retaining the first source occurrence and that occurrence's submitted creation time. Missing required fields or broken chronological ordering fail closed. ID syntax does not independently verify a recording's mapping.

The cleaned event files contain only listener ID, recording ID, listen time, and creation time. Submitted catalog labels remain in the ignored acquisition files and are not promoted to a verified catalog. Source rows outside the requested interval and nonpositive listener IDs are excluded before cohort output; the cleaner's counts describe its **retained cohort input**, not rejection rates across the whole archive.

Evaluation is explicitly a **retrospective reconstruction by listen time using this dump's mappings**, not a replay of information available at each historical cutoff. Creation-time anomalies and late imports are counted rather than silently removed. Each partition will report retained events created at or after its end. This policy does not claim mapping history, submission time, or historical catalog availability has been reconstructed.

[Partial cleaning evidence](evidence/stage-6-cleaning-smoke.json) covers only retained rows from members 1349, 1350, and 1351:

| Check | Observed count |
|---|---:|
| Cohort input events | 419,689 |
| Missing recording IDs excluded | 66,250 |
| Malformed non-null IDs excluded | 0 |
| Duplicate keys excluded | 2,015 |
| Remaining cleaned events | 351,424 |
| Input events created before listen time | 4,073 |
| Input events submitted more than one day later | 209,278 |

The last two counts overlap other categories and are not exclusions. This smoke check emitted aggregate evidence only; it did not create final split artifacts or measure model quality.

### Recording resolution and remaining gates

MusicBrainz queries combine the approved artist MBID with the title, following its [recording-search fields](https://musicbrainz.org/doc/MusicBrainz_API/Search/RecordingSearch). The resolver checks returned artist IDs and normalized exact titles, preserves multiple matching versions, and never selects a recording using listening support. Search responses are bounded and cached with hashes. API errors stop lookup rather than triggering an unbounded retry loop.

[The resolution checkpoint](evidence/stage-6-panel-resolution.json) records six successful title searches and temporary HTTP 503 failures on subsequent requests. Each successful search returned one exact artist/title candidate; version resolution is not declared complete, and the other 34 titles are not labeled absent. Search metadata is current to lookup time, not necessarily the dump's original mapping snapshot.

At this milestone, **28 local tests pass** on Python 3.12.14 with PyArrow 26.0.0. Tests cover durable accounting before failed and concurrent I/O, cap enforcement after restart, source/version pinning, cache integrity, process-lock exclusion, selected-column projection, deterministic cohort selection, identity collisions and version ambiguity, normalization, cross-batch deduplication, exact split boundaries, and held-out changes leaving training rows unchanged. They do not establish real-data ranking quality. CI confirmation is tracked with the pushed commit.

Resume acquisition with the original ledger and retained files:

```powershell
.venv/Scripts/python.exe -u -m ml.acquire_events
```

After acquisition completes, run cleaning and resume panel resolution:

```powershell
.venv/Scripts/python.exe -u -m ml.prepare_events
.venv/Scripts/python.exe -u -m ml.resolve_panel
.venv/Scripts/python.exe -m unittest discover -s ml/tests -v
```

These commands do not authorize a new budget. Avoid starting a second downloader while one is active. Raw ranges, SQLite ledgers, local identities/history, and derived event files remain ignored by Git. Only code, approved panel definitions, public catalog identifiers, and aggregate audit evidence are committed.

**Stage 6 remains in progress.** Acquisition, full cleaning, training-only item/neighbor support, validation/test query counts, complete version resolution, and peak resource measurements are not yet verified. Stage 7 remains closed; no ranking metrics or improvements have been measured.

## 11. Full-cohort audit — 2026-10-19

This section supersedes the pending-work statements in the historical checkpoints above. The panel choices and query rules were committed as `bc88aa2` before training support was measured. No panel title, recording choice, cohort rule, date boundary, or threshold was changed in response to support results.

### Completed acquisition, cleaning, and reproducibility

All 149 selected source members completed. Decoding counted **320,570,129 source rows**, matching the footer inventory; **318,891,384** lie inside the requested interval. The fixed listener hash retained **31,449,038** rows. The original whole archive was not downloaded or checksum-verified. Exact range/ETag checks, local range hashes, and derived-file hashes provide the documented subset provenance.

The durable ledger reserves **13,428,342,354 bytes (12.506 GiB)** of the approved additional 16 GiB, including retries and metadata-request allowances. Of this, 46 metadata requests reserve 24,870,958 bytes. Cached range bodies total 13,305,628,630 bytes. These are application accounting figures, not packet-capture measurements. The initial investigation's separate 1 GiB cap is documented above. No further transfer is needed for this audit.

| Full retained-cohort cleaning | Rows |
|---|---:|
| Input | 31,449,038 |
| Missing recording ID excluded | 5,343,707 |
| Duplicate listener/recording/time excluded | 647,410 |
| Malformed non-null recording ID excluded | 0 |
| Nonpositive listener / outside interval at this cleaning step | 0 / 0 |
| Output | 25,457,921 |
| IDs normalized by trim/lowercase | 50 |
| Input created before listen time | 259,307 |
| Input created more than one day after listen time | 10,402,518 |

Exclusions reconcile exactly. Normalization and creation-time diagnostics overlap other categories; they are not additional exclusions. Interval and positive-listener selection happened before these cohort cleaning counts. Missing IDs are an observed coverage loss, not proof that the remaining mappings are correct. Raw cohort files remain available locally for investigation; rejected histories are not published.

| Partition, UTC start inclusive / end exclusive | Clean events | Created at or after partition end |
|---|---:|---:|
| Train: February 1–August 1, 2026 | 20,069,944 | 1,588,501 |
| Validation: August 1–August 29, 2026 | 2,641,102 | 173,242 |
| Test: August 29–September 26, 2026 | 2,746,875 | 80,372 |

All input ordering and split-boundary checks passed. The late-created training events make the retrospective interpretation consequential: these are not necessarily interactions available on August 1. Recording mappings and current MusicBrainz identity enrichment are likewise not historical snapshots at each cutoff. Future listen times never enter training counts; historical availability is a separate limitation.

Two independent full cleaning runs produced **151 byte-identical Parquet artifacts** and identical counts/configuration. Every output file was rehashed in both directories. There are 151 outputs from 149 source members because two members cross partition boundaries. Runtime and peak-memory fields differ by design, so the complete manifest hashes differ; their non-resource fields match. This verifies cleaning/split reproducibility in the current environment, not fresh remote re-downloads, cross-platform byte identity, or model reproducibility.

Evidence: [completed acquisition manifest](evidence/stage-6-acquisition-complete.json), [cleaning manifest](evidence/stage-6-cleaned-manifest.json), and [reproducibility check](evidence/stage-6-reproducibility.json). These files contain counts, public source identifiers, and hashes, not listener histories.

### Recording identities and permitted fields

All 40 title searches completed without result truncation. Core-metadata review selected **38 recording IDs** and left **Lucy Bedroque — AQUAFINA** and **Daniel Caesar — Japanese Denim** unresolved because multiple plausible original recording IDs remain. Both unresolved titles stay in the 40-title denominator. The frozen [resolution evidence](evidence/stage-6-panel-resolution.json) contains selection reasons and source-response hashes; its earlier `panel_status` text describes title approval before resolution, while `resolution_review_complete` and the per-track decisions describe the finished review.

Artist identity uses the agreed artist MBID, not a name-only match. Original singles/artist albums are preferred when metadata supports that distinction; live, remix, collaboration, clean, explicit, and longer versions are not silently merged. Audio identity was not independently verified. Search completeness means the bounded queries completed, not that MusicBrainz itself contains every possible recording. The resolver now makes at most three charged attempts for transient failures; it preserves unsuccessful state rather than treating an API error as absence.

Field provenance for this audit:

| Fields actually used | Source and boundary |
|---|---|
| Listener ID, recording MBID, listen/creation timestamps | Pinned ListenBrainz Spark export; its inspected COPYING notice is CC0. Private event processing only. |
| Submitted artist/title/artist-credit IDs | Same export; retained for inspection, not independently verified catalog labels or model features. |
| Recording/artist/release IDs, titles, credits, duration, disambiguation, release date/type/status | MusicBrainz core metadata, used for panel identity review. |
| Response counts, response hashes, query URLs | Audit diagnostics; search ranking scores are not recommendation features. |

The official [MusicBrainz field/license classification](https://musicbrainz.org/doc/MusicBrainz_Database) and [MetaBrainz dataset license summary](https://metabrainz.org/datasets/postgres-dumps) were checked again on October 19. Core MusicBrainz metadata is CC0; supplementary annotations, tags/genre associations, ratings, and derived statistics have separate terms and are excluded. The inspected Spark notice supplements the website's general ListenBrainz CC0 description; the website's older format description does not override the observed Parquet schema. No audio, cover art, or playback entitlement was acquired.

The full training catalog is an eligible **recording-ID catalog**, not yet a verified searchable product catalog. Independently reconcile display metadata and permitted destination links for the eventual serving subset before exposing it in the application. The 38 selected IDs have first-release years of 2010 (1), 2012 (2), 2016 (3), 2017 (3), 2018 (1), 2019 (3), 2020 (1), 2021 (2), 2022 (2), 2023 (6), 2024 (9), and 2025 (5), according to the cached core metadata. Genre-wide or era-wide catalog coverage is not established by this ten-artist panel; no pre-2010 coverage claim is supported by it.

### Reproduction and verification

The implementation at `bc88aa2` uses Python 3.12.14 and pinned PyArrow 26.0.0 locally, plus standard-library SQLite. From the project root, the processing order is:

```powershell
.venv/Scripts/python.exe -u -m ml.acquire_events
.venv/Scripts/python.exe -u -m ml.prepare_events
.venv/Scripts/python.exe -u -m ml.audit_support
.venv/Scripts/python.exe -u -m ml.prepare_events --output data/processed/cohort-v1-repro
.venv/Scripts/python.exe -m unittest discover -s ml/tests -v
```

This sequence assumes the pinned inventory, reviewed panel, and existing authorized cache/ledger are present, and preparation destinations do not already exist. It records the completed workflow; do not blindly rerun preparation into its existing outputs. The acquisition command validates/reuses completed cohort files and the original transfer ledger. Preparation intentionally refuses existing or interrupted output directories; choose a new explicit destination for another cleaning check. The support audit reuses a completed training index only when its manifest and database hashes match, and refuses an incomplete index. New download permission is needed if reproducing without the cache would exceed the remaining allowance; deleting the ledger does not create a new budget.

For the cleaning comparison, compare the two manifests after removing only `runtime_seconds` and `peak_process_memory_bytes`, then independently SHA-256 each listed file in both roots and compare against its recorded digest. This was performed for all 151 artifacts, not inferred from matching row totals. Keep the reviewed panel snapshot unchanged; rerunning the live MusicBrainz API does not guarantee identical metadata. Retaining the local source cache is important because the dated upstream dump may eventually disappear.

The repository preserves the exact bytes of hashed JSON snapshots through scoped `.gitattributes` rules, including their original line endings. Staged Git blobs were hashed against the decision manifest before committing. The panel's JSON content is unchanged from `bc88aa2`; preserving its local audited bytes prevents Windows/Linux newline conversion from breaking provenance checks.

**33 local tests passed** in the completed verification run. They cover transfer accounting/failures, cache integrity, chronological and missing-field rejection, duplicate boundaries, split membership, train-only distinct-listener counting, support thresholds, first-seed/tie rules, seven-day and 21-day boundaries, and exclusion denominators. The first sandboxed test attempt could not access its temporary files; the permitted rerun outside that sandbox passed all tests. No product code was changed to bypass that environment limitation. The same source revision passed [GitHub Actions](https://github.com/pok0yo/music-recommender/actions/runs/39189706064) on Python 3.14; this does not establish cross-version Parquet byte identity.

No model was fitted or ranked. Test-window inspection is limited to the predefined feasibility counts, not model selection. Test targets and listener histories stay local. The popularity baseline, item-CF comparison, ranking metrics, uncertainty, serving latency, and product behavior remain Stage 7 or later work.

## 12. Final gate decision — revise, not accepted

The [machine-readable decision](evidence/stage-6-decision.json) freezes the diagnostic input, split, candidate-catalog, and query hashes. It explicitly sets `stage_7_ready` and `training_approved` to false. The original [protocol](stage-6-protocol.json) remains unchanged; this failed dataset version is preserved rather than relabeled as accepted. The cleaning manifest's `training_approved: false` is consistent with this decision.

### Training support and coverage

| Training statistic | Measured value |
|---|---:|
| Listeners with retained events | 5,577 |
| Recording IDs | 1,897,597 |
| Distinct listener–recording pairs | 5,324,587 |
| Eligible recording IDs, at least five listeners | 202,078 |
| Distinct pairs in that eligible catalog | 2,892,752 |
| Recording IDs heard by exactly one listener | 1,218,534 |
| All-recording interaction density | 0.0503% |
| Eligible-catalog density, including all training listeners | 0.2567% |
| Share of training events from the most active 1% of listeners | 31.2649% |

Density is observed binary pairs divided by listener count times recording count, not recommendation accuracy. Recording/listener counts are ID-based and do not imply independent catalog identity validation. Median/p95/p99/max events per listener are **856 / 11,827 / 40,857 / 375,235**; unique recordings per listener are **405 / 3,612 / 6,733 / 40,576**. Median/p95/p99/max distinct listeners per recording are **1 / 8 / 28 / 648**. Full distributions are in [the support audit](evidence/stage-6-support-audit.json). Prolific listeners and the self-selected source population can dominate connections even with binary pairs; neither listener hashing nor cosine normalization establishes representativeness.

| Approved artist, four titles each | Supported | Has ten qualifying neighbors |
|---|---:|---:|
| nate sib | 3/4 | 3/4 |
| Tiffany Day | 3/4 | 3/4 |
| che | 2/4 | 2/4 |
| 2hollis | 4/4 | 4/4 |
| Lucy Bedroque | 0/4 | 0/4 |
| beabadoobee | 4/4 | 4/4 |
| Daniel Caesar | 1/4 | 1/4 |
| Steve Lacy | 4/4 | 4/4 |
| Bruno Mars | 2/4 | 2/4 |
| GIVĒON | 3/4 | 3/4 |
| **Total** | **26/40 (65%)** | **26/40 (65%)** |

The required minimum was **32/40 (80%)**. All 26 items meeting the five-listener threshold have at least ten qualifying other-recording neighbors, so the immediate failure is item support/identity coverage, not a shortage of three-neighbor connections for those items. Qualifying neighbors are available connections, not tested useful recommendations. When an item has fewer than five listeners, the audit does not compute its neighbors; a reported zero in that case does not establish that no shared listening exists.

The 14 failures comprise two unresolved identities, six selected IDs with zero training listeners, and six selected IDs with one to four listeners:

| Failure type | Approved titles |
|---|---|
| Unresolved identity | Lucy Bedroque — AQUAFINA; Daniel Caesar — Japanese Denim |
| Selected ID has zero training listeners | che — blac chyna; Lucy Bedroque — GIRLS!!!; Daniel Caesar — Best Part and Always; Bruno Mars — Just the Way You Are and That's What I Like |
| Selected ID has one to four training listeners | nate sib — secret (3); Tiffany Day — CLOUDS (2); che — Bae (2); Lucy Bedroque — Mi Amor (2) and No Lie (1); GIVĒON — For Tonight (4) |

### Identity diagnostic after the failed gate

An additional local scan matched submitted titles after Unicode normalization/case folding and the agreed artist-credit MBID, using only training-window cohort events. It found matching labels for 37/40 titles. The [aggregate diagnostic](evidence/stage-6-identity-diagnostic.json) lists observed recording IDs and distinct listener counts; no listener identities were exported. This diagnostic happened **after** the gate calculation and changed no panel selections or rules.

Examples of discrepancies: Best Part has 80 matching-label listeners under a different recording ID; Just the Way You Are has 182; blac chyna has 6. Japanese Denim has 50 under one candidate ID, while its metadata ambiguity remains unresolved. These observations show why zero selected-ID support must not be described as absence of the song. They **do not prove that different IDs are the same audio or an acceptable version**. Apostrophe/punctuation differences, missing artist credits, and incorrect submitted labels can also evade or confuse this deliberately narrow diagnostic. No IDs were selected because of their listener counts.

The smallest justified next investigation is independent identity reconciliation: verify MusicBrainz redirects, version distinctions, and canonical-recording evidence for the discrepant IDs. Record any corrected mapping as a new version and rerun the original thresholds, retaining this failure report. If real sparsity remains after that check, consider a broader deterministic listener cohort using the already cached column ranges, with a new retained-storage/compute estimate, or request an explicit MVP scope revision. Neither a larger cohort nor identity repair is assumed to pass. Do not lower the gate, swap in popular titles, silently merge recordings, or start Stage 7 on this failed version.

### Holdout feasibility

Each window required at least 500 scorable queries and 100 distinct scorable seeds. **Both pass.** The first eligible-in-time event defines the seed even if the seed is unsupported; no later supported seed replaces it.

| Count or share | Validation | Test |
|---|---:|---:|
| Active listeners | 3,927 | 4,093 |
| Constructed queries | 3,751 | 3,916 |
| No seed in first 21 days | 176 | 177 |
| Unsupported seed queries | 1,479 | 1,728 |
| Queries with zero targets | 148 | 144 |
| Queries with nonempty targets all outside catalog | 145 | 159 |
| Scorable queries | 2,161 | 2,081 |
| Distinct scorable seeds | 2,017 | 1,967 |
| Scorable share of constructed queries | 57.61% | 53.14% |
| All distinct query–target pairs | 409,573 | 430,962 |
| In-catalog query–target pairs | 228,543 | 233,008 |
| Out-of-catalog query–target pairs | 181,030 | 197,954 |

Unsupported-seed and target-exclusion categories overlap; do not add them as disjoint rejections. The unscorable shares are 42.39% and 46.86% of constructed queries. These exclusions make eventual ranking metrics conditional on supported seeds and targets. Future co-listening remains an imperfect relevance proxy, not explicit preference. Query construction was rerun from the cleaned splits and same completed training index: both windows reproduced every reported count and byte-identical JSONL hashes. The full training index was built once, not independently rebuilt twice; SQLite `quick_check` returned `ok`.

### Resources and final acceptance

| Local operation | Measured wall time | Peak process memory |
|---|---:|---:|
| First full cleaning | 76.234 seconds | 254.19 MiB |
| Independent cleaning replay, overlapping index construction | 95.922 seconds | 233.05 MiB |
| Training index + panel support + both holdouts | 1,071.672 seconds (17.86 minutes) | 333.28 MiB |

Training-index construction alone took 967.047 seconds. These observations include local filesystem effects and are not general performance guarantees. [Resource evidence](evidence/stage-6-resources.json) records Python 3.12.14, PyArrow 26.0.0, Windows 11, and **16,267,988,992 bytes of physical RAM**. Retained raw/interim/processed data, including old probes and reproduction copies, totals **17,044,856,627 bytes (15.874 GiB)**, below the earlier proposed 20 GiB target. Free C: space afterward was approximately **107.48 GiB**. These are logical file sizes and a final free-space snapshot, not peak disk allocation. Acquisition runtime/peak memory and future model costs remain unmeasured. No paid compute was used.

| Gate | Result |
|---|---|
| Authorized bounded acquisition and subset provenance | Pass; 149 files, inside 16 GiB additional accounting cap |
| Field provenance and source terms | Documented for selected event/core-metadata fields; no audio/artwork rights claimed |
| Reproducible cleaning/splits and query construction | Pass in the recorded local environment |
| Local data-processing feasibility | Completed on available hardware; retained storage fits proposed target |
| Approved 40-title coverage | **Fail: 26 supported; 32 required** |
| Validation and test query feasibility | Pass for both windows |
| Dataset accepted / Stage 7 ready | **No — revise identity/data strategy first** |

Stage 6's audit work is complete for cohort-v1; its result is a documented rejection for the promised coverage, not a successful data gate. No ranking accuracy, measured improvement, playback availability, or product readiness is asserted. The unaccepted snapshot is reproducible evidence for deciding the next revision.
