# Music Recommender

A planned music discovery application that recommends recognizable tracks from a single seed song, with explanations grounded in listening data.

## Status

The Stage 6 audit is complete for the first listener cohort. **Its coverage gate failed: 26 of 40 approved tracks are supported; 32 are required.** Application and model implementation have not begun.

A separately versioned Stage 6 revision is now being processed: two independently verified recording redirects and a fixed 30% listener cohort reconstructed from existing cached ranges, with no new event download. The original failure, approved panel, and acceptance thresholds remain preserved. See the [revision protocol](docs/stage-6-protocol-v2.json); expanded-cohort results are pending.

- Stage 1: product scope and constraints documented.
- Stage 2: data-source documentation reviewed; dataset feasibility remains unverified.
- Stage 3: recommendation methodology and evaluation protocol proposed.
- Stage 4: UX architecture and five distinct visual directions documented as proposals.
- Stage 5: implementation plan, contracts, acceptance gates, and milestones documented.
- Stage 6: audit complete, dataset revision required. All 149 selected files were acquired inside the additional 16 GiB cap; 25,457,921 cleaned events and reproducible splits are available locally. The unchanged panel passes for 26/40 tracks. Both holdout feasibility gates pass. No model quality has been measured.
- Stage 7: blocked by the failed coverage gate. Investigate recording-identity discrepancies before changing the cohort or MVP scope.

See the [Stage 4 UX and design plan](docs/stage-4-design-plan.md) for the journey, interface states, five design systems, exact hero reservations, and future verification criteria. No final visual direction has been selected or implemented.

See the [Stage 5 implementation plan](docs/stage-5-implementation-plan.md) for architecture, data-to-UI contracts, the evaluation protocol, stage acceptance criteria, testing, deployment, and portfolio deliverables. Its 122–174-hour planning range includes contingency; the 6–8-week target depends on availability and a successful data audit.

See the [Stage 6 data audit](docs/stage-6-data-audit.md#12-final-gate-decision--revise-not-accepted) and [decision manifest](docs/evidence/stage-6-decision.json) for the measured coverage, exclusions, resource observations, reproducibility checks, and next investigation. The earlier failed sample and partial checkpoints are retained as history.

The target is a 6–8-week individual portfolio project, subject to data feasibility and available development time. A complete diagnostic cohort and training-support index exist locally, but this version is not accepted for model comparison. No trained recommender or measured recommendation-quality result exists yet.

## Proposed MVP

- Search a verified supported catalog of recognizable mainstream recordings.
- Select one seed and receive up to ten related tracks.
- Inspect evidence-based explanations and verified external listening links where available.
- Select a result as the next seed, without creating an account.
- Support responsive layouts, keyboard navigation, reduced motion, and clear loading, empty, and error states.

The user's ten requested artists define the coverage target; very recent releases are not essential. The [40-title panel](docs/coverage-panel.json) was approved on 2026-10-18. Core-metadata review selected 38 recording IDs; AQUAFINA and Japanese Denim remain ambiguous. Several selected IDs have no events while matching submitted titles occur under other IDs; equivalence must be independently verified before any remapping. Outbound listening links remain provisional pending final MVP approval.

## Recommendation and evaluation proposal

- Audited candidate sources: [ListenBrainz listening events](https://listenbrainz.org/data/) and [MusicBrainz core metadata](https://musicbrainz.org/doc/MusicBrainz_Database). The current cohort fails the agreed coverage gate; source availability alone does not establish MVP suitability.
- Baseline: distinct-listener popularity calculated from training data.
- Primary model: binary item-based collaborative filtering with cosine normalization and a shared-listener support adjustment.
- ALS and metadata hybrids are conditional experiments, not requirements.
- Proposed evaluation: global chronological training, validation, and test windows; one seed per query; future co-listening as an explicitly limited relevance proxy.
- Compare models on the same full candidate catalog. Report NDCG@10, Recall@10, coverage, support cohorts, exclusions, uncertainty, and measured latency.
- Similarity scores are not probabilities of enjoyment. No improvements are claimed before experiments.

The audit measured coverage, timestamp anomalies, sparsity, processing resources, and exclusions. Identity mismatches and insufficient support still require a revised data decision. Evaluation is a retrospective reconstruction by listen time, not an as-of historical deployment replay. Spotify Platform content is not a proposed ML input.

## Preferred stack

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Python, pandas, NumPy, scikit-learn, FastAPI, Pydantic, and Supabase PostgreSQL. Authentication is deferred. Only the audit dependency, PyArrow 26.0.0, has been installed in an ignored local Python environment; the application and model stack remains uninstalled.

## Design direction

Y2K Futurism / Soft Club: icy blue, glossy white, cobalt typography, restrained chrome, curved surfaces, and fine technical markings. Five coherent alternatives are documented for future implementation in separate `v1/` through `v5/` folders sharing one behavior layer. Hero imagery will initially use flat CSS placeholders; reference artwork will not be copied.

## Project workflow

Work proceeds through explicitly authorized stages. Commit and push meaningful, verified milestones to GitHub. Keep raw listening data, credentials, and generated model artifacts out of source control. Document actual tests and results without implying that planning or source inspection constitutes implementation verification.
