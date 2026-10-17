# Music Recommender

A planned music discovery application that recommends recognizable tracks from a single seed song, with explanations grounded in listening data.

## Status

Planning only. Application implementation has not begun.

- Stage 1: product scope and constraints documented.
- Stage 2: data-source documentation reviewed; dataset feasibility remains unverified.
- Stage 3: recommendation methodology and evaluation protocol proposed.
- Next: Stage 4, UX architecture and five distinct visual directions, pending authorization.

The target is a 6–8-week individual portfolio project, subject to data feasibility and available development time. No dataset has been downloaded, model trained, or recommendation performance measured.

## Proposed MVP

- Search a verified supported catalog of recognizable mainstream recordings.
- Select one seed and receive up to ten related tracks.
- Inspect evidence-based explanations and verified external listening links where available.
- Select a result as the next seed, without creating an account.
- Support responsive layouts, keyboard navigation, reduced motion, and clear loading, empty, and error states.

Established mainstream music is the immediate priority. Comprehensive recent-release coverage remains unresolved. Outbound listening links remain provisional pending final MVP approval.

## Recommendation and evaluation proposal

- Candidate sources: [ListenBrainz listening events](https://listenbrainz.org/data/) and [MusicBrainz core metadata](https://musicbrainz.org/doc/MusicBrainz_Database), subject to a reproducible content and licensing audit.
- Baseline: distinct-listener popularity calculated from training data.
- Primary model: binary item-based collaborative filtering with cosine normalization and a shared-listener support adjustment.
- ALS and metadata hybrids are conditional experiments, not requirements.
- Proposed evaluation: global chronological training, validation, and test windows; one seed per query; future co-listening as an explicitly limited relevance proxy.
- Compare models on the same full candidate catalog. Report NDCG@10, Recall@10, coverage, support cohorts, exclusions, uncertainty, and measured latency.
- Similarity scores are not probabilities of enjoyment. No improvements are claimed before experiments.

Dataset coverage, identity matching, timestamps, sparsity, and processing requirements must be verified before committing to the data strategy. Spotify Platform content is not a proposed ML input.

## Preferred stack

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Python, pandas, NumPy, scikit-learn, FastAPI, Pydantic, and Supabase PostgreSQL. Authentication is deferred. Dependencies have not been installed.

## Design direction

Y2K Futurism / Soft Club: icy blue, glossy white, cobalt typography, restrained chrome, curved surfaces, and fine technical markings. Five coherent alternatives will be planned before frontend implementation. Hero imagery will initially use flat CSS placeholders; reference artwork will not be copied.

## Project workflow

Work proceeds through explicitly authorized stages. Commit and push meaningful, verified milestones to GitHub. Keep raw listening data, credentials, and generated model artifacts out of source control. Document actual tests and results without implying that planning or source inspection constitutes implementation verification.
