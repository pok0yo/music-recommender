# Stage 8 — local recommendation backend

Status: implemented and locally verified; final CI and completion record are recorded with the release evidence. Stage 9 requires a separate user go.

## Scope and decisions

The user authorized Stage 8 on October 20, selected a small verified catalog first, and selected local PostgreSQL. No Supabase project was changed. The connected account's only project was inactive during read-only inspection. No accounts, feedback collection, streaming, frontend, or deployment were added.

The initial cache had display metadata for only 41 of the model's 565,147 eligible recording IDs. The 32 supported approved starters and their immediate top-ten results require 215 distinct IDs; 178 were missing from the cache. [Readiness evidence](evidence/stage-8-catalog-readiness.json) preserves that initial state. The prepared catalog now has all 215 records with core title, artist credits, disambiguation where supplied, source URL, and response hash. It is a deliberately bounded catalog, not a universal music search service.

One lookup redirected model ID `ab2eed8d-df26-4a88-91b7-b1dde7d5c4e9` to MusicBrainz ID `a7e741cf-08d6-48e5-9b2c-8b96c5e5d4d3`. A separate canonical-ID lookup matched its title and artist credits. Both response hashes are in the [preparation report](evidence/stage-8-catalog-preparation.json). The API preserves the original `recording_id` for ranking/reseeding and supplies `canonical_recording_id` for transparent identity mapping. No training data, scores, model arrays, or held-out results were changed. The prepared catalog contains no duplicate canonical IDs.

Metadata is fetched offline from MusicBrainz, using the existing bounded cache/accounting helper and its 1.1-second request spacing, charged retries, and response-size bound. The [official rate-limit documentation](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) was checked on October 20. The Stage 6 field/license review covers these core fields; tags, ratings, artwork, audio, and submitted listening labels are excluded. No model fitting or external lookup occurs in an HTTP request. No external listening destination was verified, so every `external_link` is null.

## Behavior and contracts

The [generated OpenAPI document](../backend/openapi.json) specifies the HTTP contracts; live documentation is available at `/docs` when the API is running.

| Route | Behavior |
|---|---|
| `GET /v1/catalog/search` | Title/artist substring search; trimmed input, 2–200 characters, limit 1–20 |
| `GET /v1/catalog/starters` | The 32 supported approved starter tracks |
| `GET /v1/recommendations/{recording_id}` | Up to ten model-ranked results with metadata and aggregate support evidence |
| `GET /health/live` | Process liveness without database access |
| `GET /health/ready` | Valid loaded artifact, matching catalog release, and reachable database; otherwise 503 |

Search uses NFKC/case-folded text, SQL parameters, bounded results, and stable text/ID ordering. The measured query plan scans the small 215-row catalog; no speculative search index was added. Artist credits and titles retain original Unicode in responses. Search covers this serving catalog only. A correctly formatted ID outside it returns 404, even if the larger model knows that ID.

All 32 starters return ten fully described results. Reseeding into other catalog tracks can encounter model neighbors outside this metadata subset. The API retains original rank positions, returns only describable results from the requested model positions, increments `omitted_metadata_count`, and sets `status=limited`. It never promotes lower-ranked items or inserts popular substitutes. This is an explicit first-release limit, not a new evaluation candidate universe. A model with no connections returns `no_connections`. Metadata incompleteness is distinct from an unknown seed, a disconnected seed, or a failed dependency.

Every response identifies model/catalog versions, schema version, training cutoff, method, and `data_mode`. Normal execution uses `real`; synthetic contract tests explicitly use `demo`. Recommendations say “Connected through shared listening in this dataset.” Counts come from the frozen training artifact. The API does not expose scores as enjoyment probabilities. `alternatives` is empty because no product fallback was approved.

Invalid or duplicate/unknown query parameters receive 422; errors use a safe code/message/request-ID object. Dependency failures receive 503. Startup artifact failure leaves liveness available but fails readiness. Catalog verification is retried after an outage and checks the complete content hash again after recovery. Exact allowed CORS origins are configurable; credentials are disabled. A bounded, single-process, per-peer limiter allows 60 non-health requests per minute and returns 429 with Retry-After. It does not trust forwarded IP headers. This is a local/small-demo control; distributed rate limiting and proxy policy belong to deployment.

Operational logs contain generated request ID, route template, status, and duration. They omit raw searches, request bodies, database URLs, and listener histories. Run Uvicorn with access logging disabled so its separate access log does not record raw search URLs.

## Database and release integrity

PostgreSQL 17.11 was installed from the Windows archive linked by the [official PostgreSQL download page](https://www.postgresql.org/download/windows/). The [publisher archive page](https://www.enterprisedb.com/download-postgresql-binaries) resolved to `https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip`. Download size is 381,531,864 bytes; locally measured SHA-256 is `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. This is an observed integrity hash, not a separately verified publisher checksum.

Binaries and data are inside ignored `artifacts/local-postgres/`; the server listens only on `127.0.0.1:55432`, uses SCRAM passwords, and has a 12-connection bound. The dedicated fresh `music_discovery` database contains versioned tables in `music_catalog`. Import uses a separate administrator credential. Requests use `music_reader`, which has schema usage and SELECT only, with explicit SELECT policies and RLS enabled. Database/schema creation, mutations, and temporary-table privileges are not granted to the reader. No public Supabase Data API exists in this local setup.

The importer validates all 32 starters are present, canonical IDs are unique, payload schemas are valid, the preparation checksum matches, and imported content reproduces a canonical JSON checksum. Existing versions are preserved and checked, not overwritten. Each release binds content hash/count to the trusted Stage 7 model manifest. Startup/readiness checks reject an incompatible release. Request connections are capped at four with a three-second connection timeout, two-second statement timeout, and read-only transactions. Ordinary requests perform no DDL and no model training.

The 113 MB model arrays are loaded and validated once per process. For now the API retains the pinned scientific dependency stack used by the frozen loader, including its audit imports; splitting that loader into a lighter standalone package is deferred to avoid changing selected model code. The Stage 7 loader measured 181.7 MB peak process memory in its isolated verifier; this is not a measured combined API/database deployment footprint. Use one worker until deployment memory is measured.

## Local reproduction

Run from the repository root with the ignored Stage 6/7 inputs and cached responses present. Generated data and credentials are intentionally absent from Git; a clean clone alone cannot recreate this private data snapshot. Nothing is silently replaced with demonstration tracks.

```powershell
uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt
.venv/Scripts/python.exe -m backend.audit_catalog
.venv/Scripts/python.exe -u -m backend.prepare_catalog
.venv/Scripts/python.exe -m backend.local_postgres start
.venv/Scripts/python.exe -m backend.catalog
.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers
```

For a new Windows machine, first obtain the pinned publisher archive above, verify its recorded byte count and hash, and extract `pgsql/bin`, `pgsql/lib`, and `pgsql/share` under `artifacts/local-postgres/`. The bootstrap script initializes only a missing cluster and preserves existing data. It writes random local credentials to ignored files. Do not paste those files into issues or commit them. Inspect a partially initialized cluster rather than deleting it automatically.

The API reads local reader credentials by default. For an explicit database use server-side `DATABASE_URL`; `MODEL_DIRECTORY`, `MODEL_MANIFEST_SHA256`, `CATALOG_RELEASE`, and comma-separated `ALLOWED_ORIGINS` select pinned local configuration. No secret belongs in browser configuration. Changing catalog contents requires preparing/importing a new version, not editing the active database rows.

In another terminal, run acceptance checks while the local API is running:

```powershell
.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
.venv/Scripts/python.exe -m backend.verify_local
```

The real verifier briefly stops/restarts this project's database to exercise failure recovery. Run it against the local project service only. Stop Uvicorn with Ctrl+C and then run `.venv/Scripts/python.exe -m backend.local_postgres stop`. Servers are stopped at the work-session checkpoint when requested by the usage guard.

## Verification and limits

Five synthetic API tests pass: contract/demo labeling, bounds and safe errors, short/empty lists and missing metadata, catalog mismatch/outage recovery, CORS/throttling, and missing-artifact/unexpected-error handling. The original 48 model/audit tests also pass under the installed API dependencies. A restricted test run stalled; the same tests passed outside that restricted execution. Starlette emits a deprecation notice for its httpx compatibility layer; the pinned combination currently passes. No warning is counted as a test failure or hidden.

[Real local verification](evidence/stage-8-local-verification.json) separately checks all 32 starter HTTP results against the actual model's IDs and shared-listener counts; search, SQL injection input, malformed/unknown parameters, liveness/readiness, OpenAPI, SELECT-only privileges, denied mutations, and an actual database stop/restart. The 32 sequential local HTTP requests measured median 134.308 ms and maximum 259.926 ms, including readiness/version checks and PostgreSQL. This is not the proposed 100-request, five-concurrent-client production p95 test. No deployment performance target is claimed.

The first release has 215 searchable recordings, no verified external listening links, and no hosted endpoint. Reseeding may yield limited metadata. Eight approved panel titles remain unsupported. Human usefulness, concurrent load, proxy/host controls, production secrets/retention, cloud portability, and browser integration remain later-stage work. New metadata enrichment does not revise or remeasure Stage 7 recommendation quality.
