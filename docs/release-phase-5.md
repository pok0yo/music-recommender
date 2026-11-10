# Phase 5 — public launch and verification

Updated 2026-11-08. **Catalog v3 and its availability guards are public.** The [paired activation report](catalog-v3-activation.md) records current source, public verification and rollback. Original launch and later frontend-update evidence remain distinguished below. The selected 3D interface, water, liquid-glass controls and accessible song controls are preserved. This activation added no acquisition, retraining, paid service, accounts or embedded playback.

## Public URLs and deployed source

- Website: **https://project-3wvwg.vercel.app**. A fresh HTTP client with no browser cookies received HTTP 200 at this exact URL, without a developer-login redirect.
- Real API: **https://music-recommender-api-7pp6.onrender.com**. Readiness: `/health/ready`; liveness: `/health/live`.
- Both frontend and backend deploy `a85cde945f7091355dae1cd5fe97053c2f49fb92` from `codex/catalog-expansion-v2`. Automatic deployments remain off; later documentation commits do not activate new application code.
- Vercel Hobby project `music-recommender`, ID `prj_1K4wMXdGmpvnDLDd3YbFk659SsWG`; production deployment `Gh5BXbNxUk8eYeFHsJx1GYVsjSEw` (November 8). Immediate v2 rollback target: `MzsirePySd7yyoPXYhG4RCgF5X43`, source `575def55f8515184fd25a9ec7be618160f73c0c6`.
- Render Free service `srv-dbj4vinf3r2c73evfne0`, Ohio; deployment `dep-dbokfe9srm7s73c8nhgg`. Immediate v2 rollback target: `dep-dbj4vj7f3r2c73evfob0`, source `4645fa76e8574da245ddf61436eab39742047d55`. No upgrade, paid disk or paid observability was enabled.
- Dedicated Supabase Free project `qhqwtuxxebcsccvklgxy` in the user-selected organization. The unrelated inactive project remains untouched.

## November 8 paired v3 activation

The frontend was promoted first, retaining compatibility with the older API; the backend then fetched the pinned v3 bundle and reached readiness. Exact-source CI passed 83 browser and 94 backend/model checks. Live checks verified 32/32 starters with ten results, five onward journeys, search, original ranks, per-recording availability, complete/partial/empty cases, cached listening payloads, CORS and unsupported-seed recovery. Browser checks covered labeled provider searches, a direct Spotify recording link, device-local dismissal/Undo, reseeding, Back/refresh, disabled zero-result discovery including keyboard confirmation, and retained listening access. The 1280x720 scene was ready, without horizontal overflow or captured console errors.

Forty-one paced warm public recommendation requests measured median **541.9 ms**, p95 **817.8 ms**, maximum **1,183.2 ms**, including the operator's network and hosted database work. This is not a cold-start or load test. Both immutable release pairs and 16 private Storage files remain; reader grants are SELECT-only, four tables retain RLS, security advisors report no lints, and unauthenticated candidate object requests remain rejected. See the [activation report](catalog-v3-activation.md) and its linked evidence. No new physical-device certification or provider playback check was performed.

## November 2 startup recovery

The [startup-recovery release](startup-recovery.md) is public. Real starting-catalog requests now retry transient failures within a two-minute window, with an explicit waking-up status and manual recovery afterward. Search and recommendation requests retain their existing behavior. Hosted anonymous startup, search, Discover and reseeding passed. GitHub passed 80 browser, 34 backend and 48 model checks; the sole first-attempt water screenshot timeout passed on a same-source group rerun. A fresh production cold wake was not measured. Roll back this frontend update to retained deployment `BMRXbVNtzQsW6gEYpw1KdngZfM63`, source `0f06f43`, using the exact procedure in that release report.

## November 1 frontend update

The loading screen and stylized water are publicly active. Vercel reported Ready after a 30-second build. An anonymous HTTP client received 200 at the stable public URL and found the loader in the initial response; the old release did not contain it. Live browser checks passed for real search, ten recommendations, reseeding, provider-search labels, dismissal/Undo with original ranks, Back, refresh, explanations and keyboard pause/resume. The explicit pending demo showed the loader and its song-control escape, with focus moved into search and the demo label preserved. No browser errors were observed.

The [update report](release-update-2026-11-01.md) separates these hosted results from local checks and records the resolved GitHub CPU-rendering timeouts. Full validation on test follow-up `6efb245` passed 73 browser, 34 backend and 48 model checks; deployed application files are unchanged. The browser viewport override did not apply, so no new hosted narrow-layout result is claimed; local and GitHub narrow-layout checks passed. No backend deployment, schema/data change, paid service or credential change was needed.

## Loaded releases and permissions

The serving release is `5e3038d4a068ef7e22bd7a07088b192482f1703446f8d7242898d0c9a1fad274`. The model is `item-cf-cohort-v2-lambda-50`, frozen at 565,147 recordings with a training cutoff of August 1, 2026. The serving catalog is `catalog-v3-0d44b0620107fe42678732b45397b8514be01ca0f9ed3829f468ca68afdf2b0b`: **5,474 recordings, 32 approved starters**. Compatible links are `links-v2-7215ce1c0902f3bf33f0390cd35dfb425794a312f3b15ced4e3be70cba18cd47`, preserving **130 destinations across 76 recordings** and their original verification timestamps; other destinations remain explicitly labeled searches.

The user applied the staged schema SQL after connector confirmations expired. All four private `music_catalog` tables have RLS. The API uses a separate `music_reader` credential with SELECT only; actual attempted writes were rejected. It has no superuser, create-role/database or bypass-RLS privileges. The private schema is not exposed to anonymous/authenticated Data API roles. The original launch query confirmed 4,996 catalog rows and 130 link rows. The November 8 checks retained both catalog counts (4,996 and 5,474), both 130-link pairs and four RLS tables; security advisors returned no lints.

Certificate/hostname verification initially failed with public system roots. The project's own certificate-download link supplied the **Supabase Root 2021 CA**. The public certificate is tracked at `deploy/supabase-root-ca.crt`, with exact bytes preserved by `.gitattributes`; SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`. The runtime connection uses `sslmode=verify-full&sslrootcert=deploy/supabase-root-ca.crt`. The production guard accepts this fixed path or system roots, and rejects unreviewed paths, weaker TLS modes and operator credentials. SSL enforcement was enabled in the new project; client verification and pooler-to-database TLS 1.3 both passed. The CA expires April 26, 2031; follow Supabase's official rotation guidance before replacing it. [SSL and CA documentation](https://supabase.com/docs/guides/platform/ssl-enforcement).

The original Storage key was revoked by the user after a fragment appeared in a diagnostic. Its replacement is held only in ignored operator configuration and Render's server environment. It is privileged within this isolated Supabase project, not a bucket-only credential. No admin database credential is configured on Render and no private credential is supplied to Vercel. The frontend receives only `NEXT_PUBLIC_API_URL`.

## Builds and input retention

Render uses the hash-locked Linux Python requirements, fetches all eight private pinned files at build time, then starts `python -m backend.production`. The v3 build and startup succeeded. The private Storage bucket holds both preserved bundles, totaling 226,065,302 bytes; each bundle is 113,032,651 bytes. The authenticated fetcher checks every pinned length and hash; unauthenticated access remains rejected. No raw listening dataset was uploaded. The scoped uploader refuses public buckets, changed lengths, unexpected inventory and overwrites. At the original launch, its optional live resume rerun was not executed after automatic permission review timed out; offline resume tests and live read-only inventory checks passed.

Vercel uses Next.js, Node 24.x, `npm ci`, `npm run build`, the repository root, the approved production branch and the actual API origin. Render allows only the exact public frontend origin for browser access. A request with an unapproved origin received no allow-origin header. These are origin controls, not authentication for the intentionally public API.

## Original October 31 launch validation

| Check | Result |
| --- | --- |
| GitHub deployed-source checks | 67 browser, 34 backend and 48 model tests pass |
| Anonymous public homepage | HTTP 200; no developer login |
| Real API release identity | Correct frozen model/catalog; `data_mode=real` |
| Approved starters | 32/32 return ten verified, displayable results |
| Sampled recommendation-to-recommendation journeys | Three documented journeys return ten results |
| Warm HTTPS API sample | 40 sequential requests; median 0.213 s, p95 0.449 s, max 0.489 s |
| Live browser journey | Search, discovery, reseeding, history and refresh pass |
| Feedback | Device-local dismissal and Undo pass; original ranks remain visible |
| Listening destinations | Direct links versus searches labeled; new-tab links use noopener/noreferrer |
| Keyboard and motion alternatives | Keyboard next/details and pause/resume pass |
| Empty search | Truthful no-match message; Discover disabled; recovery available |
| Demo mode | Explicit illustrative label; listening destinations unavailable there |
| Narrow-layout geometry | At 390x844, document width 390 and player width 366; no horizontal overflow |
| Backup restore | Cloud-sourced dump restored locally; all counts/full hashes match |
| Idle wake and real recovery | Provider shutdown/restart confirmed; readiness in 83.8 s; Try again restores 32 starters and ten real results |

The latency sample includes the operator's network and a warmed service; it is not a cold-start or load guarantee. A local full API suite stalled and was stopped before a completed result; the same-source full Linux GitHub suite passed. Focused local deployment/upload tests pass. The browser reported no errors and one graphics-driver floating-point precision warning while rendering continued.

Evidence: [API](evidence/release-phase-5-api.json), [browser/hosting/CI](evidence/release-phase-5-ui.json), [database/restore](evidence/release-phase-5-database.json), [private Storage](evidence/release-phase-5-storage.json), [idle wake/recovery](evidence/release-phase-5-idle-wake.json). GitHub [backend/model checks](https://github.com/pok0yo/music-recommender/actions/runs/41239128743), [browser checks](https://github.com/pok0yo/music-recommender/actions/runs/41239128693).

## Availability and operating limits

These checks establish functional availability for tested journeys, not recommendation accuracy. The prepared audit for the exact released v3 hash records 3,332/5,474 searchable seeds with ten results, 2,125 partial lists and 17 empty onward lists. All original 48 empty v2 lists were repaired; the new metadata adds a new boundary. The live 32-starter sample does not replace that full snapshot audit. Missing metadata is not padded, zero-availability reseeding is blocked while listening remains available, and failed real requests never become demo recommendations. Feedback stays on the device and does not retrain the model.

The 16.5-minute operator inactivity test confirmed a Render shutdown at 21:01:16 UTC and a new instance running the production command at 21:04:35 UTC on October 31. The first request exceeded eight seconds; bounded retries reached real readiness 83.8 seconds after the first wake request. The live website showed its truthful timeout and Try again, then recovered 32 starters and ten real recommendations after retry. This verifies that the pinned build inputs survived the idle restart; no rebuild, data import or demo substitution was needed. It is one cold-wake sample, not an uptime guarantee.

Free Render can sleep and Supabase Free can pause after inactivity. Starting-catalog requests now have a two-minute automatic recovery window with eight-second attempts; search and recommendations retain eight-second timeouts and explicit Retry. This does not promise an always-on experience. Do not add keepalive traffic or upgrade plans without authorization. The API's 60-request/minute guard may be shared behind Render's proxy; it is not verified per-visitor limiting or a public-load capacity claim.

Hosted peak CPU/RAM charts are gated behind paid Render compute and were not enabled. The previous bounded Linux rehearsal measured approximately 275 MB peak container memory, but that is not a hosted measurement. Safari, physical phones, human screen-reader review, and provider playback/login remain unverified. No paid monitoring or unrelated instrumentation was added.

## Acceptance and remaining exclusions

November 2 device update: the user confirmed phone/Safari testing works smoothly. This is user-reported acceptance, not an agent-run device certification; specific hardware and software versions were not supplied. Earlier sections retain the original test scope and observations.

The original October 31 release meets functional acceptance for anonymous public access, the correct real backend, verified original-starter discovery/reseeding, labeled listening destinations, local feedback, safe failure/retry recovery, database permissions, backup restoration and passing source checks. The November 1 frontend update has separate hosted verification and CI follow-up in the update report. The observed 84-second idle wake, potentially shared rate limit, incomplete wider-catalog results and unavailable platform/device checks prevent a claim of always-on production capacity, broad device certification or improved recommendation accuracy. The November 1 frontend update now has the retained October 31 frontend as its rollback target. The documented known-good redeploy/suspend path and cloud-sourced isolated restore remain available for backend recovery.

## Backups and exact rollback

November 8 follow-up. V3 is active; the hosted database and private Storage retain both immutable pairs/bundles. Before/after v3-import archives had been restored into isolated local databases, and the after archive contains both pairs. Full current content hashes passed before activation, with no database mutation during this release. See the [v3 hosted import report](catalog-v3-hosted-import.md) for exact backup hashes/private paths and the [activation report](catalog-v3-activation.md) for the public switch. Original Phase 5 backup details below remain historical evidence.

Before/after import dumps are private under ignored `artifacts/deployment-private/backups/`. The post-import custom dump is **619,973 bytes**, SHA-256 `db2d36dda8121c67cfa408eed0515e9da1028b9c4590457b39c185e0d77b745f`. It was restored into a newly created isolated loopback PostgreSQL database, then full catalog/link hashes and 4,996/130 counts were verified. Only that disposable database was removed; the live cloud catalog was not restored over or deleted. This is a successful cloud-sourced backup restore, not a managed cross-project recovery rehearsal. Free automatic backups or a second off-device copy are not claimed.

1. **Stop promotion.** Record the failing source/release IDs. Leave immutable database versions and Storage prefixes intact. Do not reset acquisition ledgers or substitute demo results.
2. **Application recovery from v3 to v2.** Restore Render's `RELEASE_STORAGE_BASE_URL` suffix to `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5`, preserving the token, reader connection and allowed origin. In [Render Deploys](https://dashboard.render.com/web/srv-dbj4vinf3r2c73evfne0/deploys), restore retained deployment `dep-dbj4vj7f3r2c73evfob0` if supported; otherwise manually deploy exact commit `4645fa76e8574da245ddf61436eab39742047d55`. Require readiness to report real mode and v2. In [Vercel Deployments](https://vercel.com/pok0yo/music-recommender/deployments), restore `MzsirePySd7yyoPXYhG4RCgF5X43` if its action is available; otherwise create a Production deployment from exact commit `575def55f8515184fd25a9ec7be618160f73c0c6`. Keep stable domains and compatible manifests paired; no database restore is needed. Private `runtime-v2.json` and the prior manifest are retained under `artifacts/deployment-private/activation-v3-20261108/`. A public switch back was not rehearsed during this activation.
3. **Backend failure without an older backend release.** Use Render Settings → **Suspend Web Service** to stop the API while preserving its configuration/data. The frontend will show its truthful unavailable state; do not delete the project or enable demo silently. Repair and redeploy the saved source, then verify readiness before resuming promotion. At the original first deployment, Instant Rollback and Promote were disabled while Redeploy was available; Render exposed Suspend Web Service. For the November 1 frontend update, use the retained October 31 deployment or rebuild that exact commit as described in the update report. A public switch back and forward was not rehearsed.
4. **Database recovery.** Use the verified private dump with `pg_restore --no-owner --no-acl` into a **fresh isolated target**, never `--clean` on the live project. Apply `deploy/roles.sql`, set the reader password privately, and apply `backend/schema.sql` plus `backend/listening_links.sql` to restore grants/RLS; explicitly grant database CONNECT to the reader. Use `Catalog(...).check(full=True)` and `load_release(...)` against the saved compatible manifests. Reject reader writes before switching the API's private reader connection. The [Phase 4 runbook](release-phase-4.md) has the operator commands; no credential-bearing connection string belongs in chat or shell history.
5. **Verify recovery.** Require `/health/ready` to report `real` and the pinned catalog. Repeat search → Discover → reseed → listening destinations → dismissal/Undo. Preserve safe error states and input on failure.

For maintenance, retain the latest three private database dumps, create a separately controlled off-device copy, preserve the previous known-good Storage release, watch free quotas/build egress, resume a paused Supabase project manually, and inspect readiness after recovery. If the API started while the database was unavailable, restart it after database recovery so its pinned links reload. Rotate exposed secrets at their provider and update only the matching server-side setting. No visitor account/history database or feedback collection needs migration.
