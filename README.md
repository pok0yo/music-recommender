# Music Recommender

A planned music discovery application that recommends recognizable tracks from a single seed song, with explanations grounded in listening data.

## Status

**Stage 6 is complete. The revised dataset passes: 32 of 40 approved tracks are supported, meeting the unchanged 80% gate.** Application and model implementation have not begun. Stage 7 requires the user's next explicit go.

The accepted `cohort-v2` applies two independently verified recording redirects to a fixed 30% listener cohort reconstructed from existing cached ranges, with no new event download. The original 26/40 failure, approved panel, and acceptance thresholds remain preserved. See the [frozen revision protocol](docs/stage-6-protocol-v2.json) and [acceptance decision](docs/evidence/stage-6-decision-v2.json).

- Stage 1: product scope and constraints documented.
- Stage 2: data-source documentation reviewed; actual data feasibility is now measured in Stage 6.
- Stage 3: recommendation methodology and evaluation protocol proposed.
- Stage 4: UX architecture and five distinct visual directions documented as proposals.
- Stage 5: implementation plan, contracts, acceptance gates, and milestones documented.
- Stage 6: complete and accepted. All 149 selected files are processed inside the additional 16 GiB transfer cap; 75,994,223 cleaned events and reproducible splits are available locally. The unchanged panel passes for 32/40 tracks. Validation/test have 7,887/7,848 scorable queries. All 38 local and CI tests passed. No model quality has been measured.
- Stage 7: data prerequisites satisfied; awaiting the user's explicit go. No model training or implementation is authorized by data acceptance alone.

See the [Stage 4 UX and design plan](docs/stage-4-design-plan.md) for the journey, interface states, five design systems, exact hero reservations, and future verification criteria. No final visual direction has been selected or implemented.

See the [Stage 5 implementation plan](docs/stage-5-implementation-plan.md) for architecture, data-to-UI contracts, the evaluation protocol, stage acceptance criteria, testing, deployment, and portfolio deliverables. Its 122–174-hour planning range includes contingency; the 6–8-week target depends on availability and a successful data audit.

See the [Stage 6 acceptance report](docs/stage-6-data-audit.md#15-final-cohort-v2-acceptance-and-stage-boundary) and [decision manifest](docs/evidence/stage-6-decision-v2.json) for coverage gaps, exclusions, resources, reproducibility, and the frozen candidate/query hashes. Earlier failed versions and checkpoints remain documented as history.

The target is a 6–8-week individual portfolio project, subject to available development time and later model/product checks. The accepted cohort and training-support index exist locally. No trained recommender or measured recommendation-quality result exists yet.

## Proposed MVP

- Search a verified supported catalog of recognizable mainstream recordings.
- Select one seed and receive up to ten related tracks.
- Inspect evidence-based explanations and verified external listening links where available.
- Select a result as the next seed, without creating an account.
- Support responsive layouts, keyboard navigation, reduced motion, and clear loading, empty, and error states.

The user's ten requested artists define the coverage target; very recent releases are not essential. The [40-title panel](docs/coverage-panel.json) was approved on 2026-10-18. The original 38 selected recording IDs remain unchanged; AQUAFINA and Japanese Denim remain ambiguous. Eight titles are still unsupported, and Lucy Bedroque has only one of four supported titles. The aggregate pass does not establish comprehensive artist coverage or correct metadata for all 565,147 eligible recording IDs. Outbound listening links remain provisional pending final MVP approval.

## Recommendation and evaluation proposal

- Audited sources: [ListenBrainz listening events](https://listenbrainz.org/data/) and [MusicBrainz core metadata](https://musicbrainz.org/doc/MusicBrainz_Database). The revised cohort passes the agreed data gates; recommendation usefulness still needs model evaluation.
- Baseline: distinct-listener popularity calculated from training data.
- Primary model: binary item-based collaborative filtering with cosine normalization and a shared-listener support adjustment.
- ALS and metadata hybrids are conditional experiments, not requirements.
- Proposed evaluation: global chronological training, validation, and test windows; one seed per query; future co-listening as an explicitly limited relevance proxy.
- Compare models on the same full candidate catalog. Report NDCG@10, Recall@10, coverage, support cohorts, exclusions, uncertainty, and measured latency.
- Similarity scores are not probabilities of enjoyment. No improvements are claimed before experiments.

The audit measured coverage, timestamp anomalies, sparsity, processing resources, and exclusions. Identity ambiguity and unsupported items remain explicit limitations. Evaluation is a retrospective reconstruction by listen time, not an as-of historical deployment replay. Spotify Platform content is not a proposed ML input.

## Preferred stack

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Python, pandas, NumPy, scikit-learn, FastAPI, Pydantic, and Supabase PostgreSQL. Authentication is deferred. Only the audit dependency, PyArrow 26.0.0, has been installed in an ignored local Python environment; the application and model stack remains uninstalled.

## Design direction

Y2K Futurism / Soft Club: icy blue, glossy white, cobalt typography, restrained chrome, curved surfaces, and fine technical markings. Five coherent alternatives are documented for future implementation in separate `v1/` through `v5/` folders sharing one behavior layer. Hero imagery will initially use flat CSS placeholders; reference artwork will not be copied.

## Project workflow

Work proceeds through explicitly authorized stages. Commit and push meaningful, verified milestones to GitHub. Keep raw listening data, credentials, and generated model artifacts out of source control. Document actual tests and results without implying that planning or source inspection constitutes implementation verification.
