# Music Recommender

A planned music discovery application that recommends recognizable tracks from a single seed song, with explanations grounded in listening data.

## Status

**Stage 9 comparison is implemented:** five structurally different Discover and About interfaces share the approved icy glass/chrome visual system, real API adapter and labeled demonstration fixtures. Hero areas remain flat CSS placeholders. The user must select a structure before the final frontend is promoted; Stage 10 and deployment have not begun. See the [frontend setup, comparison and evidence](docs/stage-9-frontend.md).

The accepted `cohort-v2` applies two independently verified recording redirects to a fixed 30% listener cohort reconstructed from existing cached ranges, with no new event download. The original 26/40 failure, approved panel, and acceptance thresholds remain preserved. See the [frozen revision protocol](docs/stage-6-protocol-v2.json) and [acceptance decision](docs/evidence/stage-6-decision-v2.json).

- Stage 1: product scope and constraints documented.
- Stage 2: data-source documentation reviewed; actual data feasibility is now measured in Stage 6.
- Stage 3: recommendation methodology and evaluation protocol proposed.
- Stage 4: UX architecture and five distinct visual directions documented as proposals.
- Stage 5: implementation plan, contracts, acceptance gates, and milestones documented.
- Stage 6: complete and accepted. All 149 selected files are processed inside the additional 16 GiB transfer cap; 75,994,223 cleaned events and reproducible splits are available locally. The unchanged panel passes for 32/40 tracks. Validation/test have 7,887/7,848 scorable queries. The original 38 audit tests passed locally and in CI.
- Stage 7: selected lambda-50 item-CF reaches test NDCG@10 0.218345 versus popularity 0.021665 on scorable queries. All 48 tests passed locally and in CI. The 565,147-item serving export passes integrity checks and matches every evaluated ranking. See the [evaluation report](docs/stage-7-evaluation.md) for uncertainty, exclusions, failure cohorts, and reproducibility.

See the [Stage 4 UX and design plan](docs/stage-4-design-plan.md) for historical planning. The user's October 21 revision replaces the earlier separate themes with five app structures in one shared material world; [DESIGN.md](DESIGN.md) documents the implemented system. No final structure has been selected.

See the [Stage 5 implementation plan](docs/stage-5-implementation-plan.md) for architecture, data-to-UI contracts, the evaluation protocol, stage acceptance criteria, testing, deployment, and portfolio deliverables. Its 122–174-hour planning range includes contingency; the 6–8-week target depends on availability and a successful data audit.

See the [Stage 6 acceptance report](docs/stage-6-data-audit.md#15-final-cohort-v2-acceptance-and-stage-boundary) and [decision manifest](docs/evidence/stage-6-decision-v2.json) for coverage gaps, exclusions, resources, reproducibility, and the frozen candidate/query hashes. Earlier failed versions and checkpoints remain documented as history.

- Stage 8: local API and versioned 215-recording catalog implemented; 32 real starter responses match the frozen model. Database permissions and actual outage recovery are verified. See the [backend report and setup](docs/stage-8-backend.md).

The target is a 6–8-week individual portfolio project, subject to available development time and later product checks. The accepted cohort, train-only recommender, and measured offline results exist locally. These results do not establish subjective usefulness or application readiness.

## Proposed MVP

- Search a verified supported catalog of recognizable mainstream recordings.
- Select one seed and receive up to ten related tracks.
- Inspect evidence-based explanations and verified external listening links where available.
- Select a result as the next seed, without creating an account.
- Support responsive layouts, keyboard navigation, reduced motion, and clear loading, empty, and error states.

The user's ten requested artists define the coverage target; very recent releases are not essential. The [40-title panel](docs/coverage-panel.json) was approved on 2026-10-18. The original 38 selected recording IDs remain unchanged; AQUAFINA and Japanese Denim remain ambiguous. Eight titles are still unsupported, and Lucy Bedroque has only one of four supported titles. The aggregate pass does not establish comprehensive artist coverage or correct metadata for all 565,147 eligible recording IDs. Outbound listening links remain provisional pending final MVP approval.

## Recommendation and evaluation

- Audited sources: [ListenBrainz listening events](https://listenbrainz.org/data/) and [MusicBrainz core metadata](https://musicbrainz.org/doc/MusicBrainz_Database). The revised cohort passes the agreed data gates; human recommendation usefulness remains unverified.
- Baseline: distinct-listener popularity calculated from training data.
- Primary model: binary item-based collaborative filtering with cosine normalization and a shared-listener support adjustment.
- ALS and metadata hybrids are conditional experiments, not requirements.
- Completed evaluation: global chronological training, validation, and test windows; one seed per query; future co-listening as an explicitly limited relevance proxy.
- Both models use the same full candidate catalog. NDCG@10, Recall@10, Precision@10, coverage, support cohorts, exclusions, and uncertainty are reported. Deployed latency is unmeasured.
- Similarity scores are not probabilities of enjoyment. Nearly half of scorable test queries have no observed target in the selected model's top ten.

The audit measured coverage, timestamp anomalies, sparsity, processing resources, and exclusions. Identity ambiguity and unsupported items remain explicit limitations. Evaluation is a retrospective reconstruction by listen time, not an as-of historical deployment replay. Spotify Platform content is not a proposed ML input.

## Preferred stack

The frontend uses Next.js, React, TypeScript and CSS with the installed Tailwind PostCSS integration; shared native controls avoid an unnecessary UI package. The backend uses Python, FastAPI, Pydantic and local PostgreSQL. Authentication is deferred. The audit/model pipeline uses pinned PyArrow 26.0.0, NumPy 2.5.4, and SciPy 1.18.1 in an ignored local Python environment. pandas, scikit-learn and implicit are unnecessary for the current model.

## Design direction

Y2K Futurism / Soft Club: icy blue, glossy white, cobalt typography, restrained chrome, curved surfaces and fine technical markings. Five app structures live in separate `v1/` through `v5/` folders sharing one behavior layer. Hero areas use flat CSS placeholders; reference artwork is not copied.

## Project workflow

Work proceeds through explicitly authorized stages. Commit and push meaningful, verified milestones to GitHub. Keep raw listening data, credentials, and generated model artifacts out of source control. Document actual tests and results without implying that planning or source inspection constitutes implementation verification.
