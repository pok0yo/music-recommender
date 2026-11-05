# Music Recommender

A music discovery application that recommends tracks from a single seed song, with explanations grounded in shared listening data.

## Status

**V3 staged privately.** The [hosted v3 checkpoint](docs/catalog-v3-hosted-import.md) has 5,474 verified recordings and 130 preserved listening links. The [private build bundle](docs/catalog-v3-hosted-import.md#private-storage-upload) has passed download checksum verification. [Availability hints](docs/recommendation-availability.md) expose partial and empty onward lists and prevent empty reseeding while retaining listening access. Seventeen seeds still have empty onward lists. The public catalog still serves 4,996 recordings pending paired public activation.

**November 2 update is live:** [automatic catalog startup recovery](docs/startup-recovery.md) adds a bounded two-minute retry window and waking-up messages. Frontend source `575def5` is deployed; anonymous startup, real search, discovery and reseeding were verified. GitHub validation passed 80 browser, 34 backend and 48 model checks, with one CPU graphics group passing on a same-source rerun.

**Public launch:** [Open Music Recommender](https://project-3wvwg.vercel.app). The real API is [music-recommender-api-7pp6.onrender.com](https://music-recommender-api-7pp6.onrender.com/health/ready), serving 4,996 verified recordings and the compatible listening-link release. The original Phase 5 verification covers public journeys, backup restore and cold-wake recovery. Free hosting took about 84 seconds to wake in that measured test; use Try again after an idle timeout. See the [live release runbook](docs/release-phase-5.md) for versions, limits, evidence, maintenance and rollback.

**November 1 update is live:** the [scene loading screen](docs/scene-loading-screen.md) covers unfinished first renders, and the [stylized water adaptation](docs/stylized-water.md) adds displaced swells, irregular flowing highlights and layered depth. Public search, discovery, reseeding, listening destinations, feedback, history, refresh and keyboard pause/resume were verified on source `0f06f43`. All 155 checks passed in GitHub on test follow-up `6efb245`, with deployed application files unchanged. The [update report](docs/release-update-2026-11-01.md) records hosting, validation limits, resolved CI follow-up and rollback. The water draws on [Stylized Components by Christian Ortiz (Cortiz)](https://github.com/cortiz2894/stylized-components); attribution and its MIT license are retained in [third-party notices](THIRD_PARTY_NOTICES.md).

**Deployment preparation:** the [Phase 4 runbook](docs/release-phase-4.md) records the approved Vercel Hobby, Render Free and dedicated Supabase Free configuration. Current production state is recorded in Phase 5.

The selected 3D Orbital record-player homepage uses real recommendations by default, with listening destinations and device-local feedback. The preceding [integration checkpoint](docs/release-phase-3.md) records 64 browser and 72 backend/model checks passing locally and in GitHub CI, plus performance measurements, catalog limits and unavailable device checks. Phase 4 adds deployment-specific validation without changing the selected interface.

Use `/?mode=demo` for explicitly labeled illustrative results, and `/?dev=1` to expose environment controls. Ordinary visits hide those development controls. Existing Orbital, About, and earlier design-comparison URLs remain available; retired artwork URLs redirect to Orbital while preserving query context. Shared `?q=…` searches and `?seed=…` recommendation links restore on refresh and browser navigation.

The accepted `cohort-v2` applies two independently verified recording redirects to a fixed 30% listener cohort reconstructed from existing cached ranges, with no new event download. The original 26/40 failure, approved panel, and acceptance thresholds remain preserved. See the [frozen revision protocol](docs/stage-6-protocol-v2.json) and [acceptance decision](docs/evidence/stage-6-decision-v2.json).

- Stage 1: product scope and constraints documented.
- Stage 2: data-source documentation reviewed; actual data feasibility is now measured in Stage 6.
- Stage 3: recommendation methodology and evaluation protocol proposed.
- Stage 4: UX architecture and five distinct visual directions documented as proposals.
- Stage 5: implementation plan, contracts, acceptance gates, and milestones documented.
- Stage 6: complete and accepted. All 149 selected files are processed inside the additional 16 GiB transfer cap; 75,994,223 cleaned events and reproducible splits are available locally. The unchanged panel passes for 32/40 tracks. Validation/test have 7,887/7,848 scorable queries. The original 38 audit tests passed locally and in CI.
- Stage 7: selected lambda-50 item-CF reaches test NDCG@10 0.218345 versus popularity 0.021665 on scorable queries. All 48 tests passed locally and in CI. The 565,147-item serving export passes integrity checks and matches every evaluated ranking. See the [evaluation report](docs/stage-7-evaluation.md) for uncertainty, exclusions, failure cohorts, and reproducibility.

See the [Stage 4 UX and design plan](docs/stage-4-design-plan.md) for historical planning. Earlier comparisons led to the selected Orbital record desk; [DESIGN.md](DESIGN.md) documents the evolving visual system.

See the [Stage 5 implementation plan](docs/stage-5-implementation-plan.md) for architecture, data-to-UI contracts, the evaluation protocol, stage acceptance criteria, testing, deployment, and portfolio deliverables. Its 122–174-hour planning range includes contingency; the 6–8-week target depends on availability and a successful data audit.

See the [Stage 6 acceptance report](docs/stage-6-data-audit.md#15-final-cohort-v2-acceptance-and-stage-boundary) and [decision manifest](docs/evidence/stage-6-decision-v2.json) for coverage gaps, exclusions, resources, reproducibility, and the frozen candidate/query hashes. Earlier failed versions and checkpoints remain documented as history.

- Stage 8: local API and read-only database access implemented. The later [catalog expansion](docs/catalog-expansion-v2.md) activates 4,996 recordings while preserving 32 approved starters and the frozen model. The [listening-link pilot](docs/listening-feedback.md) adds 130 checked destinations across 76 recordings; other destinations are explicitly labeled provider searches. See the [original backend setup](docs/stage-8-backend.md) and later release documents for current startup configuration.

The target is a 6–8-week individual portfolio project, subject to available development time and later product checks. The accepted cohort, train-only recommender, and measured offline results exist locally. These results do not establish subjective usefulness or application readiness.

## Proposed MVP

- Search a verified supported catalog of recognizable mainstream recordings.
- Select one seed and receive up to ten related tracks.
- Inspect evidence-based explanations and verified external listening links where available.
- Select a result as the next seed, without creating an account.
- Support responsive layouts, keyboard navigation, reduced motion, and clear loading, empty, and error states.

The user's ten requested artists define the coverage target; very recent releases are not essential. The [40-title panel](docs/coverage-panel.json) was approved on 2026-10-18. The original 38 selected recording IDs remain unchanged; AQUAFINA and Japanese Denim remain ambiguous. Eight titles are still unsupported, and Lucy Bedroque has only one of four supported titles. The aggregate pass does not establish comprehensive artist coverage or display metadata for all 565,147 model recordings. The verified serving catalog is a smaller subset.

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

Y2K Futurism / Soft Club: icy blue, reflective water, a chrome-and-glass record player, an animated orbital disc and liquid-glass controls. Native controls provide the same song actions without precise 3D picking. Earlier structures remain in `v1/` through `v5/` as historical comparisons. SF Pro Display/Text are preferred where available, with system-font fallbacks; proprietary font files are not bundled.

## Project workflow

Work proceeds through explicitly authorized stages. Commit and push meaningful, verified milestones to GitHub. Keep raw listening data, credentials, and generated model artifacts out of source control. Document actual tests and results without implying that planning or source inspection constitutes implementation verification.
