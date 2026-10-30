# Phase 4 — deployment preparation

Prepared 2026-10-30. **No public deployment has been activated.** Phase 5 requires a separate user go. The proposed audience is an open public launch, with free services only. This configuration assumes a personal, noncommercial portfolio application; commercial use would require revisiting Vercel Hobby eligibility.

## Proposed configuration and cost

| Component | Proposed service | Configuration |
| --- | --- | --- |
| Frontend | Vercel Hobby | Next.js, Node 24.x, HTTPS provider domain, manual deployment |
| API | Render Free web service | Native Python 3.14.8, Ohio, one worker, 512 MB / 0.1 CPU |
| Database | New dedicated Supabase Free project | PostgreSQL, private `music_catalog` schema, reader-only API role |
| Model inputs | Same project's private Storage bucket | Eight individually hashed files, downloaded at API build time |

Expected recurring service charge: **$0 while eligible and within free allowances**, not a capacity or availability guarantee. No custom domain purchase is needed. Vercel Hobby is for personal/noncommercial use and can pause when limits are exhausted; its published allowances include 100 GB transfer and one million requests. [Hobby documentation](https://vercel.com/docs/plans/hobby).

Render Free sleeps after 15 idle minutes, can take about a minute to spin up, and shares 750 instance hours per workspace/month. Its runtime filesystem is ephemeral; free PostgreSQL expires after 30 days, so it is deliberately excluded. Require a workspace without a payment method, or a verified hard spending guard, before deployment: with billing enabled, some usage overages can be charged. Do not add a keepalive cron, paid disk, paid database, or automatic upgrade. [Free limitations](https://render.com/docs/free), [compute plans](https://render.com/docs/compute-plans).

Supabase Free provides 500 MB database space, 1 GB object storage and 5 GB uncached egress (with a separate cached allowance), subject to current account quotas; inactive projects can pause after a week. The account's existing inactive project is unrelated and remains untouched. A read-only account cost estimate returned $0/month for a new project; creation and final quota/region eligibility remain unverified. [Pricing](https://supabase.com/pricing).

The eight inputs total **113,032,651 bytes**. The largest individual object is 45,211,888 bytes, below the Free 50 MB per-object limit; upload individual files, not one combined archive. Approximately 44 full uncached downloads would consume 5 decimal GB, before other usage and retries. Budget rebuilds accordingly. Current local database size is approximately 18 MB including retained releases. [Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).

## Reproducible source and release inputs

- `render.yaml` specifies free native Python, hash-locked Linux wheels, build-time artifact fetch, one API process and readiness checks. Automatic deploys are off. No Docker installation is required.
- `vercel.json` specifies `npm ci` / `npm run build`, with automatic Git deployments disabled. `package.json` and its lock file require Node 24.x. The installed Next.js production and environment guides were checked; the public API origin is frozen into the browser bundle at build time.
- `backend/requirements-production.lock` pins all 23 Linux x86_64 / CPython 3.14 wheels by exact version and SHA-256. Other architectures need a separately reviewed lock. Render's Python patch version is pinned; the local Linux rehearsal used 3.14.4, not the provider's 3.14.8. [Python selection](https://render.com/docs/python-version), [manual deploy configuration](https://render.com/docs/blueprint-spec).
- `deploy/release.json` pins the model and compatible catalog/link manifests. Release ID: `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5`.
- `python -m backend.release_files prepare` creates the ignored local upload directory `artifacts/deployment/<release_id>/`. It does not upload anything. The prepared files and their complete 113 MB streamed download were verified locally.
- Build fetches use `python -m backend.release_files fetch`: private HTTPS only, fixed inventory, exact byte bounds and hashes, no redirects, atomic completed files, cached successful work and three bounded retries. Errors omit the token and private URL. Inputs are stored under ignored `.runtime/<release_id>/` as part of the build output. Actual Render build-output persistence across idle wakes must be verified in Phase 5.
- The serving release has 4,996 recordings, 32 approved starters and 130 verified listening destinations across 76 recordings. The model remains frozen at 565,147 recordings. No acquisition or retraining was performed. Search destinations remain explicitly different from verified direct listening links.

## Configuration and permissions

Vercel receives only `NEXT_PUBLIC_API_URL`, set to the approved API HTTPS origin in Production and any deliberately enabled Preview environment. It receives **no database or Storage credentials**. Missing, local, credential-bearing, placeholder, non-HTTPS or path-bearing deployment origins fail the Next.js build. `APP_ENV=production` enables this guard outside Vercel. Changing an origin requires a new frontend build.

Render secrets are described in `deploy/backend.env.example`:

- `DATABASE_URL`: the custom `music_reader.PROJECT_REF` login through the IPv4 Session pooler on port 5432. Copy the actual pooler hostname from the project's Connect dialog; never guess its region/index. Require `sslmode=verify-full&sslrootcert=system`; check the real certificate chain in Phase 5 and never downgrade validation to make a failed connection work. [Database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
- `ALLOWED_ORIGINS`: comma-separated exact approved frontend HTTPS origins. No wildcard, arbitrary preview-domain suffix, cookies or credentialed cross-origin access. Use a stable frontend hostname; approve temporary test origins intentionally and remove them afterward.
- `RELEASE_STORAGE_BASE_URL`: `https://PROJECT_REF.supabase.co/storage/v1/object/authenticated/model-releases/<release_id>`.
- `RELEASE_STORAGE_TOKEN`: a dedicated current `sb_secret_` server key in the isolated project. The fetcher sends it on `apikey`, never in URLs, logs or the frontend. This is a privileged project-wide key, **not** a read-only bucket credential. It is used only by the build fetcher, but Render environment variables are also available to the runtime; do not claim build-only secret isolation. Rotate/revoke in Supabase and update Render if exposed. [Current API-key authentication and scope](https://supabase.com/docs/guides/getting-started/api-keys).

The private bucket is `model-releases`; preserve each release prefix immutably. Do not make it public, upload raw listening data, or give the browser access. [Private bucket behavior](https://supabase.com/docs/guides/storage/buckets/fundamentals).

`deploy/roles.sql` creates a non-superuser reader with no create-role/database or bypass-RLS privileges; it rejects unsafe existing privileges/memberships. Set its password privately with the operator's `psql` password prompt. The API must never receive `CATALOG_ADMIN_DATABASE_URL`; the production entry point rejects it. Imports use paired operator-only `CATALOG_ADMIN_DATABASE_URL` and reader `DATABASE_URL` variables. They grant access only to `music_catalog`, preserve managed database-wide PUBLIC privileges, and retain immutable old versions. Do not expose this private schema through Supabase's public Data API.

On the operator machine, after separate Phase 5 approval, use the existing import tools with both private connection variables set:

```text
python -m backend.catalog --directory data/processed/catalog-expansion-v2 --report docs/evidence/catalog-expansion-v2.json
python -m backend.listening_links
```

The catalog import validates the frozen model, provenance and content hash before its transaction; link import validates recording identities and catalog compatibility in its own transaction. Neither changes the API's active manifests. Activate only the matching pinned pair after both complete and reader validation succeeds. Each import can be repeated safely; do not edit records in place or delete old versions to deploy a new one. Do not paste credential-bearing connection strings into commands, chat, screenshots or commits.

## Health, logging and operation

`python -m backend.production` requires the complete pinned local release, verified database TLS, reader credentials and exact public origins. It binds Render's `PORT` on all interfaces, with one worker, proxy-header trust disabled and raw access logging off. Deployment health must use `/health/ready`, which checks the catalog/model/link compatibility; `/health/live` alone is insufficient. There is no demo fallback on API failure.

Application logs contain a generated request ID, route template, status and duration; they omit query text, full private URLs, credentials and forwarded client headers. Use provider logs and request IDs for failures. No third-party analytics or user-account store is introduced. Feedback remains device-local and is not collected or used to retrain.

The existing 60 requests/minute guard counts the directly connected peer. Behind Render that may be a shared proxy and therefore a conservative shared cap, **not verified per-user rate limiting**. Keep proxy trust off until actual edge headers and trust boundaries can be checked. Quota exhaustion, repeated 429/503s, failed readiness, high memory or failed builds should stop promotion; never solve these by silently selecting a paid plan or demo data.

The local Linux full model/catalog/link validation used 269.4 MB peak RSS / 275.2 MB peak cgroup memory under an enforced 512,000,000-byte limit. Under 0.1 CPU it took **74.376 seconds**, before any actual Render wake or cloud database work. This demonstrates local feasibility, not hosted latency or sufficient public capacity. The frontend's existing 8-second request timeout may show Retry during a cold wake. Warm latency measured in Phase 3 must not be presented as cold-start latency.

If Supabase pauses, resume it manually. If the API initially loaded while the database was unavailable and readiness remains failed, restart the API after database recovery; the current startup link load is not a background retry job. Observe `/health/ready` before sending traffic. Free-only hosting cannot promise uninterrupted service.

## Backup and exact rollback procedure

The database contains immutable release metadata and destinations, not visitor accounts/history. Back up before and after each release import or schema change; retain the latest three private backups and a copy on a separately controlled storage device/account within approved storage limits. Model files are reproducible from the preserved local export, but retain the previous known-working Storage release prefix as well. No automatic managed backup entitlement is assumed on Free.

Use an operator-only PostgreSQL service file/passfile (outside Git and restricted to the owner) rather than putting passwords in shell history. With `PGSERVICE` selecting the source, the backup command is:

```text
pg_dump --format=custom --schema=music_catalog --no-owner --no-acl --file=PRIVATE_BACKUP_PATH
```

Record the dump SHA-256 alongside the source commit, deployment release ID, catalog and link versions. Test restoration into a **fresh isolated target**, never `--clean` against the live project:

1. Provision the safe reader role with `deploy/roles.sql` and set its private password.
2. Select the fresh target with the private PostgreSQL service configuration; run `pg_restore --no-owner --no-acl --dbname=TARGET_SERVICE_CONNECTION PRIVATE_BACKUP_PATH`.
3. Apply `backend/schema.sql` and `backend/listening_links.sql` to restore schema grants and reader RLS policies, then explicitly grant database CONNECT to `music_reader` if needed. Do not revoke database-wide PUBLIC permissions in a managed project.
4. Connect as the reader; verify catalog/link counts and full hashes with `Catalog(...).check(full=True)` and `load_release(...)` against the saved manifests. Verify writes fail. Start the API with that paired release and require readiness before switching its connection secret.

The local rehearsal imported twice into an isolated scratch database, rejected reader writes, restored a 619,652-byte custom dump into another scratch database, and matched 4,996 recordings / 130 links and full hashes. Managed-style PUBLIC grants and the original working database were preserved. Scratch databases were removed afterward; dumps remain private and ignored. See [database evidence](evidence/release-phase-4-database.json) and the repeatable `scripts/verify-deployment-database.py` check. This was not a cloud restore rehearsal.

For an application regression after an established launch:

1. Record the failing commit/release ID and stop manual promotion. Keep the database and Storage releases intact.
2. Restore the previous known-good Render deployment and Vercel deployment through their manual rollback/promote controls. Render Free retains only two previous service deploys; if unavailable, deploy the saved known-good Git commit, which fetches its own preserved pinned inputs. Keep the stable API origin and exact frontend CORS origin unchanged.
3. Require API readiness, verify the expected catalog/link versions, then run the real search → discover → reseed → listening links → feedback smoke check. Never pair the expanded catalog with the old pilot's incompatible manifests.
4. If rollback cannot regain readiness, withdraw the frontend/stop the API rather than expose misleading results. On the very first public deployment there is no previous public release: withdraw it, preserve data, repair locally and reapprove promotion.

Provider rollback UI and actual build retention, idle-wake behavior and HTTPS/TLS must be rehearsed after Phase 5 approval. [Render deploy behavior](https://render.com/docs/deploys).

## Validation and remaining approval gate

- Fresh Linux environment: all 32 backend tests and 48 model tests pass using the 23 hash-locked wheels installed offline from the verified cache. Expected failure logs are generated by error-path tests. The upstream Starlette `httpx` deprecation warning remains; dependencies are pinned and no speculative upgrade was made.
- Local resource rehearsal: [Linux evidence](evidence/release-phase-4-linux.json). Full 113 MB pinned-file streaming/hash verification succeeds with a local file-backed test transport; actual authenticated cloud downloading awaits project creation.
- Database import/idempotence/reader/backup-restore: passed as described above.
- Clean source snapshot: `npm ci --offline --no-audit --no-fund`, guarded HTTPS production build and TypeScript checks passed. All three deployment-configuration tests and ten homepage/listening/feedback tests passed. These used only the intended source changes, excluding unrelated working-tree experiments. The actual-API smoke evidence is recorded separately below; committed GitHub checks provide the final source-only suite result.
- Actual pinned API plus clean frontend: all 32 starters, search, discovery, reseeding/history, dismissal/undo and three listening services passed. The WebGL canvas remained mounted, demo listening destinations were absent, and there were zero page errors or unsolicited external requests. [UI evidence](evidence/release-phase-4-ui.json). Provider playback/login and physical devices were not tested. Rerun with `node scripts/verify-listening-feedback.mjs --pilot-active`; set `VERIFY_ORIGIN`, `VERIFY_API_URL` and `VERIFY_REPORT` to test approved endpoints without changing source. The operator machine needs the existing ignored catalog/link files for these comparisons.
- Safari, physical mobile devices and human screen-reader review remain unavailable as recorded in Phase 3. No claim of improved recommendation accuracy or complete catalog availability is made: 3,248/4,996 searchable seeds currently return ten displayable results; 48 return none, and all 32 original enabled starters return ten.

**Phase 5 proposal for approval:** connect eligible free Vercel/Render accounts, create one new dedicated free Supabase project/private bucket, provision reader permissions, import the already approved releases, upload the eight existing files, configure the exact secrets/origins, manually deploy the pinned source and verify public access without developer login. Then test real discovery, failure recovery, links/feedback, hosted resource usage, idle wake, TLS, logs, backup and safe rollback. Capture the actual public URLs and release versions in this runbook and README only after verification. Do not purchase anything or restore the existing unrelated inactive project.
