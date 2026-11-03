# Catalog v3 activation review

## Decision

The prepared catalog and compatible links are internally consistent, but **not ready for public activation through the current tooling**. This checkpoint reviews the paired release and freezes a candidate deployment inventory. It does not change application code, active manifests, database contents, private Storage or provider configuration.

The next authorized checkpoint should fix the import/packaging compatibility gaps and rehearse the pair in disposable local PostgreSQL databases. Cloud import, upload and public deployment remain separate approval boundaries. No new artist, acquisition-budget or hosting decision is needed for that local work.

## Verified candidate

All 5,474 recording payloads pass the current schema and belong to the pinned model with at least five training listeners. Recording and canonical identities are unique. All 32 approved starters remain present and have ten displayable model neighbors. Seventeen searchable recordings have no displayable onward results; the prepared availability UI handles those honestly. This is an availability check, not a recommendation-quality evaluation.

The 130 listening destinations across 76 recordings exactly match the prior release's parsed link payloads, including their original verification timestamps. Their recording/canonical identities match v3. No destination was freshly checked, added or invented. Unlinked recordings retain the existing explicitly labeled service searches.

- Catalog: `catalog-v3-0d44b0620107fe42678732b45397b8514be01ca0f9ed3829f468ca68afdf2b0b`.
- Compatible links: `links-v2-7215ce1c0902f3bf33f0390cd35dfb425794a312f3b15ced4e3be70cba18cd47`.
- Model manifest SHA-256: `ac341968aef80dc9f5eb9459eea5e5ba119e9112c9b2dc38026dda00bc92f122`.
- Candidate deployment ID: `5e3038d4a068ef7e22bd7a07088b192482f1703446f8d7242898d0c9a1fad274`.

The candidate has the existing eight-file inventory and **113,032,651 bytes** total. Only `catalog/release.json` and `links/release.json` differ from the tracked active bundle; all six model files retain their exact hashes. The candidate inventory passes `read_manifest`. It is a reviewed inventory, not an uploaded or fully assembled deployment directory. A future new Storage prefix/build would transfer the whole bundle under the current single-prefix layout; current account quota and build egress must be checked before that action. No new quota or spending allowance is implied.

Checksummed review evidence is in [the activation review record](evidence/catalog-v3-activation-review.json). The local candidate manifest is ignored at `artifacts/catalog-v3-candidate-release.json`. Metadata ledgers, caches and original releases were retained without acquisition or reset.

## Confirmed tooling gaps

- **`backend/catalog.py`:** `import_catalog` expects a top-level `artifact_manifest_sha256`; the v3 preparation report instead pins the same value inside `new_release.model_manifest_sha256`. Calling the existing importer with v3 was confirmed to stop with this missing-field error before any database access. Adapt verified report compatibility without weakening the frozen-model or catalog checks.
- **`backend/listening_links.py`:** `import_release()` accepts no paths and hardcodes the original pilot directory/report and v2 catalog. The v3 receipt uses `link_release` and `links_file_sha256`, while the pilot receipt has `release`, `links_file_sha256` and a provenance file. Add an explicit v3-capable import path that verifies the complete receipt, catalog binding, unique providers and canonical identities before writing. Retain pilot compatibility, immutable versions and transactional writes.
- **`backend/release_files.py`:** `SOURCES` selects the old catalog/link manifests and `prepare()` writes `deploy/release.json`. Add explicit candidate input/output paths with compatible defaults, check catalog/link/model binding before publishing any manifest, and retain existing file bounds, hashes and overwrite refusal. Do not replace the active manifest during rehearsal.
- **`scripts/verify-deployment-database.py`:** the existing isolated import/restore rehearsal hardcodes v2 and the pilot links. Extend or reuse it for the explicit candidate inputs, preserving loopback-only safeguards and the working database. Rehearse both versions coexisting, repeated imports, failed-import rollback, reader write rejection and backup restoration.

Focused coverage belongs in `backend/tests/test_expansion.py`, `backend/tests/test_listening_links.py` and `backend/tests/test_deployment.py`; retain `backend/tests/test_storage_upload.py` protections. Tests must reject mismatched bindings, incomplete/tampered receipts and attempted replacement of an immutable version. No frontend redesign or fixture substitution is required.

## Existing validation and live observation

The existing application/test baseline `b2392aa2a1b73edf6077cfff2c1d94cd08820e0e` remains green: [83 browser tests](https://github.com/pok0yo/music-recommender/actions/runs/41568996681) and [88 backend/model tests](https://github.com/pok0yo/music-recommender/actions/runs/41568996677). This documentation-only review did not rerun those suites. The new read-only candidate assertions passed against actual files, model arrays and the previous link payloads.

The first public readiness request exceeded its ten-second bound. A later bounded request returned HTTP 200 in 389 ms and reported real mode with the v2 catalog. This is one readiness observation, not cold-start diagnosis, uptime proof or candidate API latency. V3 has not been imported into a local or hosted database in this checkpoint. The added availability batch's hosted latency and paired-release production startup remain unmeasured.

## Retained rollback and activation requirements

The tracked active deployment inventory remains `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5`, with catalog `catalog-v2-1c2f222147176b362426ab426936307f16d273de21bbd9b9ed6eee0b629c9766` and links `links-v1-13ad4a446e31d06d14c2ec12685226795e5208073d365e1845852224976c74ef`. All eight local source files still match that inventory. Existing private credentials, previous releases and the [public recovery runbook](release-phase-5.md#backups-and-exact-rollback) remain unchanged.

Before a public switch, require the successful local import/restore rehearsal, a reviewed inactive hosted import and backup, verified private Storage inputs/quotas, candidate hosted latency and smoke checks, and explicit approval for the paired frontend/backend deployment. Preserve the prior immutable versions and Storage prefix for rollback. Readiness, search, original-starter discovery, reseeding, zero/partial availability, listening destinations, feedback and truthful recovery must be checked on the actual public release before calling activation complete.
