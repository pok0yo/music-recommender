# Portfolio MVP closeout

Closed November 9, 2026. Status: **complete, maintenance mode**. The user authorized documentation, a short demo, a case study and the GitHub closeout together. This stage does not deploy application code, alter credentials, change repository visibility or activate local design experiments.

## Released baseline

- Public application: <https://project-3wvwg.vercel.app/>.
- Exact frontend/backend source: `a85cde945f7091355dae1cd5fe97053c2f49fb92` on `codex/catalog-expansion-v2`.
- Public v3: 5,474 recordings, 32 approved starters, 130 preserved listening destinations across 76 recordings. Model: `item-cf-cohort-v2-lambda-50`, unchanged at 565,147 IDs.
- Release evidence: [paired activation](catalog-v3-activation.md), including 83 browser and 94 backend/model CI passes, public journeys and scoped warm timing. The closeout is documentation/media only and does not imply those tests were rerun against new application code.
- Rollback: retained v2 bundle, database/link pair and prior provider deployments; follow [the exact runbook](release-phase-5.md#backups-and-exact-rollback). Do not restore over the live database to revert this release.
- Portfolio materials: [case study](case-study.md), [demo](demo.md), [current product description](../PRODUCT.md). GitHub release `v0.1.0` identifies this closeout; deployed application source remains the commit above.

## Preserved local work

These changes existed before closeout. They are retained in the working tree and excluded from the release; they are not promised future work or evidence of deployed behavior.

| Tracked paths | Disposition |
|---|---|
| `components/water-scene.ts` | Unreleased water/design experiment; no merge or deployment |
| `DESIGN.md`, `.impeccable/briefs/orbital-hero.md`, `.impeccable/briefs/procedural-water.md` | Local design history/iterations preserved |
| `PRODUCT.md` | Existing prototype additions preserved locally; only new closeout/current-status edits staged |
| `package.json` | Existing helper-script changes excluded |
| `scripts/capture-liquid-buttons.mjs`, `scripts/capture-orbital-hero.mjs`, `scripts/capture-previews.mjs`, `scripts/capture-site-liquid-glass.mjs`, `scripts/prepare-disc-tray-environment.mjs` | Existing capture/environment tooling edits excluded |
| `docs/evidence/catalog-expansion-v2-activation.json` | Existing evidence modification preserved without silently revising the published historical record |

Untracked `.impeccable` briefs, Stage 9 capture/evidence directories, artwork images, capture/profile scripts and frontend prototype specs remain local experiments. `.codex` configuration and `PROJECT_HANDOFF.md` remain local context. Ignored acquisition caches, ledgers, trained artifacts, private runtime settings and backups are retained. Nothing was deleted, stashed, reset or swept into the final commit merely to make Git status clean. To revisit an experiment, inspect its full diff and validate it separately before committing or deploying it.

## Maintenance boundary

Reopen work for a reproduced user-facing defect, a relevant security/dependency issue, a mandatory provider change or an explicitly chosen new product stage. Keep automatic deployments off. Preserve data provenance, immutable inputs, credentials and rollback assets. No scheduled monitoring or automated update service was created.

Broader catalog coverage, retraining, additional design polish and listener research are optional. The 17 empty lists, partial coverage, unchanged provider-link timestamps, free-host sleep and lack of human usefulness/physical-device/public-load evidence remain disclosed. Do not describe completion as universal recommendation accuracy, device certification or an uptime guarantee.
