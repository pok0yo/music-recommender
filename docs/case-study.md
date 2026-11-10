# Music Recommender: from listening events to a deployed discovery app

## Project and contribution

Music Recommender is an individual, AI-assisted portfolio project: a visitor chooses one recording, explores up to ten connections from shared listening, inspects the evidence and continues from another song. The user set the product constraints and coverage panel, selected the visual direction, reviewed iterations and authorized each data and release stage. AI tools assisted implementation, investigation, testing, documentation and decorative asset generation. The repository records the work and evidence; this case study does not claim unaided implementation or measured development hours.

The delivered scope includes a bounded data pipeline, a reproducible recommendation experiment, a read-only API/database integration, an interactive web interface and a verified public deployment. There are no accounts, embedded audio or server-side taste profiles. [Open the application](https://project-3wvwg.vercel.app/) or [watch the demo](demo.md).

## Making the data usable

The initial published ListenBrainz sample contained metadata and popularity tables rather than the chronological events required for the experiment. A first event cohort also failed the approved coverage gate at 26 of 40 panel recordings. Those failures remain recorded. Selective ListenBrainz event extraction, two independently verified recording redirects and a fixed 30% listener cohort produced 75,994,223 cleaned events and coverage for 32 of the original 40 titles. The panel was not changed to manufacture a pass.

MusicBrainz core metadata supplies recording identities, titles and artist credits. The project documents CC0 event/core data provenance and excludes supplementary noncommercial tags and genres. Recording identity is not inferred from title alone. Neither metadata access nor provider links grant audio playback rights. Raw histories, credentials and trained arrays remain outside Git; checksums, frozen decisions and sanitized evidence preserve reproducibility. See the [data audit](stage-6-data-audit.md).

## A recommendation method that can be explained

The selected model is binary item-based collaborative filtering. A pair's shared-listener count is divided by the square root of the two recordings' listener supports, then multiplied by `shared / (shared + 50)`. This shrinks weakly supported connections. Ranking uses deterministic identity tie breaks and excludes the seed. The interface describes shared listening rather than inventing acoustic similarity or a probability of enjoyment.

Chronological training ends August 1, 2026; validation runs August 1–29 and test runs August 29–September 26. Lambda 50 was selected on validation before final test scoring. Both collaborative filtering and the distinct-listener popularity baseline rank the same 565,147-item training catalog, without sampled negatives or a user-history advantage.

| Held-out macro metric | Popularity | Selected item CF |
|---|---:|---:|
| NDCG@10 | 0.021665 | 0.218345 |
| Recall@10 | 0.003147 | 0.060890 |
| Precision@10 | 0.020821 | 0.195260 |

These results cover 7,848 scorable queries and 7,003 seeds. The paired-bootstrap NDCG difference has a 95% interval of [0.190176, 0.203435], conditional on this experiment. Only 67.79% of constructed queries were scorable, and 49.261% of scorable CF queries had no observed top-ten target. Future listening is a limited relevance proxy; these are not enjoyment-accuracy percentages or evidence from a user study. The [evaluation report](stage-7-evaluation.md) preserves exclusions, uncertainty and replay checks.

## Turning the experiment into an application

The serving export contains 565,147 model IDs, while the released verified metadata catalog contains 5,474 recordings. Keeping these counts separate prevents an exaggerated coverage claim. The API preserves original ranks when metadata is missing. It returns shorter lists rather than filling them with unrelated popular tracks. Availability hints identify partial and empty onward lists; a zero-availability song remains listenable while discovery confirmation is disabled.

Next.js, React and TypeScript provide the frontend; Three.js renders the Orbital disc, player, physical song rack and reflective water. Native controls preserve the song workflow alongside keyboard navigation and reduced-motion/graphics fallbacks. The chosen Y2K Futurism / Soft Club direction followed several documented comparisons. Generative tools assisted decorative artwork; the water adaptation retains its upstream MIT attribution in [third-party notices](../THIRD_PARTY_NOTICES.md).

FastAPI serves bounded requests from a frozen, checksummed NumPy artifact and a PostgreSQL reader with SELECT-only access. Supabase stores immutable catalog/link pairs and private release inputs; Render serves the API and Vercel serves the frontend. Real-service failures remain errors rather than silently falling back to illustrative results. Feedback stays on the device and does not retrain the model.

## Release evidence and operational decisions

The November 8 paired v3 release runs exact source `a85cde945f7091355dae1cd5fe97053c2f49fb92` on both providers. All 83 browser and 94 backend/model CI checks passed. Public checks verified all 32 starters, five onward journeys, ranks, availability, search, listening destinations, local dismissal/Undo and recovery. Both immutable release pairs remain available for rollback; anonymous access to private Storage was rejected and security advisors returned no lints.

A paced sample of 41 warm public recommendation calls measured median 541.9 ms and p95 817.8 ms, including operator network and database time. This does not establish concurrent capacity or satisfaction of the original five-client latency proposal. An earlier free-host idle wake took approximately 84 seconds; the frontend retains bounded startup retries. See the [activation report](catalog-v3-activation.md) and [operations runbook](release-phase-5.md).

## Completion and limits

The portfolio MVP closed November 9, 2026. It demonstrates a complete seed-to-discovery workflow, explicit data feasibility decisions, a baseline-controlled experiment, honest missing-data behavior, a distinctive accessible interface and a deployed release with rollback evidence.

The exact v3 snapshot has 3,332 complete lists, 2,125 partial lists and 17 empty onward lists. Its 130 stored listening destinations cover 76 recordings and retain their original verification timestamps; other links are labeled provider searches. Human usefulness, provider playback entitlement, physical-device certification and public concurrent-load capacity remain unverified. Free hosting can sleep. Broader data, retraining, more artwork and listener research are separate future projects, not unfinished requirements concealed by this closeout.
