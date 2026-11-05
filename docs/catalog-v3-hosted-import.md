# Inactive hosted catalog v3 import — November 3, 2026

## Result

The approved `music-recommender` Supabase project now contains the verified **5,474-recording v3 catalog and its 130-link release**, alongside the unchanged **4,996-recording v2 catalog and original 130-link release**. V3 is **inactive**: the public API still reports v2, and the new SNL seed still returns HTTP 404 there. No private Storage upload, frontend/backend deployment or release-pointer change was performed.

Candidate catalog: `catalog-v3-0d44b0620107fe42678732b45397b8514be01ca0f9ed3829f468ca68afdf2b0b`.

Compatible links: `links-v2-7215ce1c0902f3bf33f0390cd35dfb425794a312f3b15ced4e3be70cba18cd47`.

At the end of the import checkpoint, the eight prepared files for candidate `5e3038d4a068ef7e22bd7a07088b192482f1703446f8d7242898d0c9a1fad274` verified locally and its private Storage prefix had zero objects. The tracked active inventory remains `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5`. Original model, catalog and link input hashes are unchanged.

## Import and access controls

The connected project was confirmed healthy before the operation. Existing credentials authenticated successfully using verified TLS. The private schema's four tables retain RLS, the restricted reader role, and their original policies/grants. Anonymous and authenticated client roles have no access. Pre/post access-control snapshots matched, private runtime/operator files were unchanged, and Supabase's security advisor returned no lints before or after the import. No passwords or API keys were reset, and the unrelated inactive project was untouched.

Before writing, the import tools were hardened to support `--existing-schema` / `initialize_schema=False`. This mode appends data without reapplying DDL, policies or grants; existing schema/permissions must be verified first. Batched inserts retain transactional rollback. A disposable local test confirmed that independent v2 catalog/link reads complete while the candidate transactions are open, alongside the existing failure-rollback checks. Initialization defaults remain available for new databases. [Local concurrent-reader evidence](evidence/catalog-v3-existing-schema-rehearsal.json).

Private working copies were imported so the importer's manifest serialization could not change the pinned original files. Both immutable database versions and their links passed complete content-hash and identity validation after import. Database size after the operation was 31,151,795 bytes. No infrastructure plan or paid resource was added, and no MusicBrainz/provider enrichment requests were made.

Current Supabase [connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) and [backup guidance](https://supabase.com/docs/guides/platform/backups) were checked. The existing verified session-pooler connection and matching PostgreSQL 17.11 backup client were retained. The relevant 17.11 changelog concerns extension/custom-operator changes; this operation appended data to the existing private tables without changing those database features.

## Backups and recovery proof

Fresh custom-format backups were taken before and after import. Each archive was hashed, its catalog was readable by `pg_restore`, and it was fully restored into a new isolated local database. The pre-import restore verified v2/130 links; the post-import restore verified **both v2/130 and v3/130** with full content hashes. Both temporary databases were removed, the original working database remained unchanged, and the local cluster started for this checkpoint was stopped.

- Before: `artifacts/deployment-private/backups/20261103T142531Z-7e7330-before-v3.dump`, 619,973 bytes; SHA-256 `84a5ea07035440f1cf71e144cfefd09415994868a390a33d652832e02fb71943`.
- After: `artifacts/deployment-private/backups/20261103T142531Z-7e7330-after-v3.dump`, 1,550,135 bytes; SHA-256 `32e38d226abcd6734746f89b3d1a0e26ec28ccf0bca55253d90a21dae76758cb`.

These private archives cover only `music_catalog`, excluding ownership and ACL restoration; the known private schema grants/policies were reapplied on the isolated restore target. They do not back up Storage objects or passwords. No new backup destination or automatic backup schedule was configured. This was a cloud-sourced backup restored locally, not a managed cloud-project recovery rehearsal.

No production rollback is needed because no active pointer changed. Leave the complete v3 version inactive if later checks fail; do not delete either immutable pair or restore over the live project. The retained v2 manifests/Storage prefix and [existing public rollback runbook](release-phase-5.md#backups-and-exact-rollback) remain the recovery baseline. Any fresh-target cloud restore requires its own reviewed destination and authorization. Do not use the old first-import helper for this incremental operation: it also performs credential initialization. The current execution and verification helpers are retained privately under `artifacts/deployment-private/`, with hashes in the sanitized evidence.

## API verification against hosted v3

The current Python application and frozen model were run locally with the hosted database as their real reader. All **32 approved starting recordings returned ten recommendations**, and five documented onward journeys also returned ten. Search, original model ranks, a repaired ten-result list, SNL's nine-result list with one honest omission, a zero-result YOASOBI seed, a verified listening payload and an unsupported-seed 404 all passed. No illustrative fallback or list padding was used.

Forty-one serial recommendation requests measured **1,702.8 ms median, 1,861.0 ms p95 and 1,960.0 ms maximum**, after readiness. These measure the Windows operator application reaching hosted PostgreSQL over TLS. They do **not** measure Render runtime, browser responsiveness, public cold starts or load capacity. The unchanged public API's later readiness probe returned v2/HTTP 200 in 383.3 ms; its initial bounded request had timed out.

The broader prepared coverage limits remain: 17 v3 seeds have empty onward lists, and many lists are partial. The prepared availability guards retain browsing/listening access while preventing empty reseeding. These limits were not hidden or repaired with arbitrary songs. Increased metadata availability does not establish better recommendation accuracy. Listening verification timestamps were preserved; destination playback/entitlement was not rechecked.

## Checks and next gate

[Backend/model CI](https://github.com/pok0yo/music-recommender/actions/runs/41653193275) on `ca03f10ebcf328bd0ee8ab9febf65ed10607b82a` passed **45 backend and 48 model tests**. The corresponding [browser run](https://github.com/pok0yo/music-recommender/actions/runs/41653193647) passed **82 of 83 tests**; the animated-water case exceeded its 180-second deadline. This is not a green public-release validation. No UI code was changed in this checkpoint; the remaining browser failure must be resolved before public activation.

Sanitized proof: [hosted import](evidence/catalog-v3-hosted-import.json) and [hosted-data API checks](evidence/catalog-v3-hosted-api.json). Dumps, full timing receipts, credentials, working copies, datasets and model binaries remain ignored by Git.

## Private Storage upload

On November 4, all eight files for candidate `5e3038d4a068ef7e22bd7a07088b192482f1703446f8d7242898d0c9a1fad274` were uploaded to the existing private `model-releases` bucket. The operator passed the explicit candidate manifest to the uploader. The uploader downloaded every file into a fresh temporary directory and verified its pinned size and SHA-256. Requests without credentials were rejected by both the public and authenticated object routes. The original v2 prefix retained all eight expected objects and sizes.

Storage inventory increased from 113,032,651 to 226,065,302 bytes. The largest file is 45,211,888 bytes. The private bucket retained its 50,000,000-byte limit and its existing access settings. This fits the documented Free plan limits. [Storage quota](https://supabase.com/docs/guides/storage/pricing) and [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).

```powershell
.venv/Scripts/python.exe scripts/upload-deployment-release.py --manifest artifacts/catalog-v3-prepared-release.json
```

The active manifest and service configuration were preserved. The public readiness check timed out on the first request and returned HTTP 200 with v2 in real mode on retry. All 46 backend tests passed locally, including the candidate uploader regression check. A later [browser run on `2e2d99f`](https://github.com/pok0yo/music-recommender/actions/runs/41656847082) passed all six shards. The previously timed-out water case passed in 2.4 minutes on that run.

The next checkpoint is public release validation and paired deployment, subject to explicit authorization and validation of the release commit. Retain both prefixes. Use the original v2 manifest and Storage prefix for backend rollback and the prior Vercel production deployment for frontend rollback. The [public rollback runbook](release-phase-5.md#backups-and-exact-rollback) applies.

[Private upload evidence](evidence/catalog-v3-private-storage.json).
