# Catalog v3 paired public activation

## Complete — November 8, 2026

The user authorized paired public activation after the completed browser-validation checkpoint. Release source is `a85cde945f7091355dae1cd5fe97053c2f49fb92`; only three values in `deploy/release.json` change from the previously tested application: the catalog-manifest hash, link-manifest hash and combined release ID. Existing local design changes are excluded.

Candidate bundle: `5e3038d4a068ef7e22bd7a07088b192482f1703446f8d7242898d0c9a1fad274`, 8 files / 113,032,651 bytes. Catalog: 5,474 recordings; compatible links: 130 destinations. Model files and model version are unchanged.

## Verified preflight

- Before activation, public readiness reported v2 in real mode. Prior Vercel production source was `575def55f8515184fd25a9ec7be618160f73c0c6`, deployment `MzsirePySd7yyoPXYhG4RCgF5X43`. Prior Render source was `4645fa76e8574da245ddf61436eab39742047d55`, deployment `dep-dbj4vj7f3r2c73evfob0`.
- Supabase project `qhqwtuxxebcsccvklgxy` is healthy, with no security advisories. Both catalog/link pairs and both complete private Storage inventories remain present. Four catalog/link tables retain RLS. Full hosted v3 catalog and link content hashes passed with the existing reader credential; all 32 starters are present. A small authenticated candidate-manifest download matched its pinned hash.
- The organization remains Free. Dashboard egress was 0.43 / 5 GB; object inventory totals 226,065,302 bytes against the 1 GB free Storage allowance. The dashboard Storage-size aggregate lagged the exact object inventory. No plan, credential, permission or schema change is required.
- Render Auto-Deploy is Off. Vercel `git.deploymentEnabled` remains false; Node 24.x / Basic build machine and disabled on-demand concurrent builds are retained. Current build/start commands and readiness path match the runbook.
- Local backend tests passed 46/46 outside the process sandbox after the restricted run stalled. The isolated production-origin build and TypeScript passed. [Release backend/model CI](https://github.com/pok0yo/music-recommender/actions/runs/42558583464) passed 46 backend + 48 model tests. [Release browser CI](https://github.com/pok0yo/music-recommender/actions/runs/42558583533) passed all 83 tests across six shards.

The Supabase changelog review covered the [HTTP CBC-cipher retirement](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and [PostgreSQL 17.11 release](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes). No connection-security downgrade or schema update was introduced; existing verified-TLS reader and authenticated HTTPS checks passed.

## Rollout and rollback

The compatible frontend was deployed first while v2 remained active, followed by the backend with the candidate bundle URL and exact source commit. Older API responses without availability counts remain supported by the new frontend. Both providers now run a85cde9; the public API reports the exact v3 catalog in real mode.

Retain v2 bundle `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5` and both immutable database/link pairs. If needed, restore the exact prior frontend deployment above and the previous backend source plus v2 Storage-base setting. Never restore over or delete live catalog data to roll back this application release. The existing verified before/after hosted-import dumps remain private; full current hashes match the retained immutable versions. See [the public recovery runbook](release-phase-5.md#backups-and-exact-rollback).

## Outcome

**Public v3 activation is complete.** Vercel production `Gh5BXbNxUk8eYeFHsJx1GYVsjSEw` is Ready after a 31-second build, retaining the existing public domain. Anonymous HTTP 200 and availability code in the served application asset were verified. Two build warnings concern the platform's npm `cache-dir` environment option; npm reported zero dependency vulnerabilities. Render deployment `dep-dbokfe9srm7s73c8nhgg` built successfully, ran `python -m backend.production`, completed startup and became Live with the candidate bundle.

All 32 public starters returned ten frozen-model results, and five onward journeys passed. Original ranks and independently calculated availability counts matched. Search, complete/partial/empty responses, cached listening payloads, CORS and an unsupported-seed 404 passed. Forty-one paced warm public recommendation requests measured median 541.9 ms, p95 817.8 ms and maximum 1,183.2 ms. These include operator network/database time and are not cold-start or load-capacity measurements.

Live browser checks verified the repaired Leaving Toronto ten-result journey, SNL's nine-result hint/list, zero-result YOASOBI browsing/listening with disabled Discover and keyboard confirmation, a direct Spotify recording destination, labeled provider searches, dismissal/Undo with preserved ranks, reseeding, Back, shared-link refresh and unsupported-seed recovery after committing a replacement seed. The scene was ready at 1280x720 without horizontal overflow or captured console errors. User feedback was restored with Undo rather than resetting stored preferences. The screenshot remains local at `artifacts/catalog-v3-public.jpg`.

Post-deploy checks retained both catalog/link pairs, all 16 private Storage files, four RLS tables, SELECT-only reader privileges and zero security-advisor lints. Both candidate object routes rejected unauthenticated requests (HTTP 400). Private runtime settings now record the v3 bundle URL; prior v2 settings/manifests remain retained. No credentials, policies, database rows, model arrays or hosting plans were changed.

Sanitized proof: [activation](evidence/catalog-v3-activation.json), [frontend](evidence/catalog-v3-frontend.json), [public API](evidence/catalog-v3-public-api.json), [public browser](evidence/catalog-v3-public-browser.json). Private settings and diagnostics remain ignored under `artifacts/deployment-private/activation-v3-20261108/`.

The 17 empty onward lists, many partial lists, unchanged provider verification timestamps, and absence of new recommendation-quality evidence remain explicit limitations.
