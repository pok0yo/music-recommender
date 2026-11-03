# Catalog v3 release tools and local rehearsal — November 3, 2026

## Result

The three tooling gaps from the [activation review](catalog-v3-activation-review.md) are fixed. The catalog and its compatible links imported and restored successfully in disposable loopback PostgreSQL databases. The working database, active deployment manifest, original data files and public services were not changed. No metadata acquisition, cloud import, upload or deployment occurred.

The prepared private bundle contains eight verified files and 113,032,651 bytes, with deployment ID `5e3038d4a068ef7e22bd7a07088b192482f1703446f8d7242898d0c9a1fad274`. Its six model files remain unchanged. The active v2 inventory is still `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5`.

## Changes

- `backend.catalog.import_catalog` accepts the verified nested model binding in a repair receipt, rejects conflicting bindings or an existing different prepared manifest, and compares all immutable database release fields. Original v1/v2 receipt support remains.
- `backend.listening_links.import_release` accepts explicit directory, receipt and catalog-manifest paths. A repair must retain the original pilot link payload hash and provenance checksum; its receipt must match the candidate catalog. Duplicate providers, wrong canonical identities and attempts to reuse an existing link version with another catalog are rejected. Pilot defaults remain available.
- Link import and loading use the existing batched catalog lookup for identity validation. All link identities are still checked, using one metadata read instead of one connection per link. This is not a measured hosted-startup performance claim.
- `backend.release_files.prepare` accepts explicit catalog/link manifests and a separate output manifest. It checks the catalog/link/frozen-model binding and file bounds, refuses different existing manifests or prepared files, and atomically saves the manifest only after the complete bundle verifies. The default paths and fixed eight-file inventory remain. Fetch retains HTTPS, hash, size, redirect and secret-handling protections.
- `scripts/verify-deployment-database.py` accepts an optional candidate and separate report. It refuses non-loopback connections and uses new disposable databases, retaining the original baseline rehearsal.

## Validation

All **45 backend tests passed locally**, including five new tests covering the candidate receipts, provenance, duplicate providers, canonical identities, immutable metadata, packaging failures and refusal of either remote database role. The remote-role checks run the actual rehearsal command as a subprocess, confirm rejection before database creation, and check that the private fixture password is absent from errors. Existing loader coverage now verifies one batched read and rejection of a missing recording. Syntax compilation and scoped whitespace checks passed. GitHub results are recorded separately after the push; the existing 83-test browser baseline was not rerun locally because no frontend behavior or styling changed.

The actual-data rehearsal proved:

- v2's 4,996 recordings and 130 links coexist with v3's 5,474 recordings and 130 links. Both imports are idempotent.
- Exceptions injected after the release and first row were inserted roll back both catalog and link transactions, leaving no partial version. Each import is its own transaction; the pair is not one cross-command transaction. A later link failure can leave a complete **inactive** catalog version, which can be reused on retry. Neither importer changes an active pointer.
- Reusing the v1 link version for the v3 binding is refused, even though its link-content hash is identical.
- The old pinned pair remains fully readable after v3 import. This is local configuration rollback validation, not a public rollback rehearsal.
- The reader cannot delete records or create tables. Managed-database-style public grants are retained.
- A private custom dump containing both versions restores into a second disposable database, with full catalog/link hashes verified for both pairs.
- The actual frozen model and PostgreSQL-backed API return all 32 starters with availability ten; Leaving Toronto returns ten recommendations, SNL returns nine with one truthful omission, and the documented YOASOBI boundary seed returns zero with real labels and availability zero.
- Both disposable databases were removed, the working database remained unchanged, and the local cluster started for this checkpoint was stopped. Original candidate files and all active deployment inputs retain their reviewed hashes.

The backup dump remains private under the generated `artifacts/phase-4-verification/` directory. Its size/hash and validation flags are in [rehearsal evidence](evidence/catalog-v3-database-rehearsal.json); no connection strings, passwords, dump contents, model binaries or catalog payloads are committed.

## Reproduction of this local checkpoint

Start the existing loopback cluster using the documented local setup. Prepare the candidate without changing the active manifest:

```powershell
.venv/Scripts/python.exe -m backend.release_files prepare --catalog-release data/processed/catalog-gap-repair-v3/release.json --links-release data/processed/catalog-gap-repair-v3/links/release.json --manifest artifacts/catalog-v3-prepared-release.json
.venv/Scripts/python.exe scripts/verify-deployment-database.py --candidate-directory data/processed/catalog-gap-repair-v3 --candidate-report docs/evidence/catalog-gap-repair-v3.json --report artifacts/catalog-v3-database-rehearsal.json
```

These commands require the retained ignored model/catalog/provenance inputs and local credentials. Do not point this rehearsal at cloud credentials or reset acquisition ledgers. An existing manifest with different contents must be reviewed explicitly, not overwritten by prepare.

## Next approval boundary

The next checkpoint is an **inactive hosted import and backup**, with current project/role/backup checks first. Storage upload and paired public deployment still require their separate authorization. Preserve both immutable pairs and the old Storage prefix. Hosted availability-query latency, current Storage quota/build egress and public candidate smoke checks remain unverified. The 17 empty onward lists remain explicit; no recommendation-accuracy improvement is claimed.
