# Stage 7 — recommendation models and evaluation

Status: implementation, 48 tests, validation replay, and final held-out evaluation are complete. Lambda 50 is selected. Serving export verification is complete; Stage 7 is accepted. Stage 8 is not authorized.

## Scope and frozen experiment

The user authorized Stage 7 and requested a halt before either account allowance falls to 10% remaining. Work checks account usage between milestones and uses a 15%-remaining stopping buffer. This is a work-session control, not a model configuration.

The [Stage 7 protocol](stage-7-protocol.json) was committed with source in `5639bd038a60f6aa6028f24445cb51452aa09bae` before validation ranking. The accepted [Stage 6 decision](evidence/stage-6-decision-v2.json) remains immutable: 565,147 train-eligible recording IDs, fixed chronological splits, and query files with frozen hashes. Models read only the binary training-pair database. Each model receives one seed, without the evaluator's listener history. No new event data or paid compute is required.

Popularity ranks by distinct training listeners, excluding the seed. Item CF uses `c_ij / sqrt(n_i*n_j) * c_ij/(c_ij+lambda)`, with item support at least five and shared-listener support at least three. Shrinkage values are 0, 10, and 50. All methods use ascending recording ID for exact score ties. The CF method returns fewer than ten items when there are insufficient supported connections; missing positions earn zero metric credit. Popularity is a separate baseline, never hidden padding for related-track lists.

All 565,147 eligible IDs form the candidate universe, excluding the seed. Sparse computation omits zero/unsupported edges rather than sampling negatives. Top-ten extraction includes every score tied at its boundary before ID tie-breaking. Batches contain 32 seeds; a dense all-item similarity matrix is never constructed. Integer co-listener counts use int32 to avoid int8 overflow; similarity scores use float64.

Selection uses the highest **validation macro NDCG@10**, with smaller lambda breaking exact ties. The runner writes a selection file binding the validation report, source hashes, protocol, and input decision. The selection must be committed before final test scoring. Final test compares the baseline and the selected CF only. Changing model code or the protocol invalidates the selection. Source line endings are fixed to LF for reproducible code hashes.

## Metrics and interpretation

Binary relevance means a distinct in-catalog recording listened to strictly after the seed and within its seven-day horizon. NDCG@10 divides discounted hits by the ideal list of up to ten relevant items. Recall@10 divides hits by all distinct in-catalog targets. Precision@10 always divides by ten. Report macro means over scorable listener queries, a secondary mean that weights each distinct seed equally, support cohorts 5–19 and 20+, original exclusion denominators, list completeness, zero-hit share, catalog coverage, and mean recommended training support.

Paired percentile bootstrap intervals resample listeners/queries 1,000 times with NumPy `default_rng(20261019)`. Each listener contributes at most one query in each window; the runner checks uniqueness. Report 2.5th and 97.5th percentiles for differences against popularity. Validation alternatives are exploratory comparisons; intervals do not establish representativeness or causality. The untouched final model comparison is the primary held-out result.

Artist variety and acoustic diversity are deferred because independent, validated metadata/features are unavailable for the full candidate catalog. Do not substitute model-specific embedding distances. Coverage of recording IDs does not establish genre variety, novelty, or subjective enjoyment.

## Implementation and verification

The existing standard-library/Arrow data pipeline is retained. Only NumPy 2.5.4 and SciPy 1.18.1 were added, pinned in `ml/requirements-model.txt`; scikit-learn and implicit are unnecessary for these algorithms. The implementation uses [SciPy CSR sparse arrays](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csr_array.html). Numeric arrays are stored with [NumPy save](https://numpy.org/doc/stable/reference/generated/numpy.save.html) and loaded with pickle disabled.

The 47-test suite passed locally and in [GitHub Actions](https://github.com/pok0yo/music-recommender/actions/runs/39338864598). Added checks cover hand-calculated cosine/shrinkage and ranking metrics, integer-count overflow, ties crossing the top-ten boundary, self/unsupported-edge exclusion, short and empty lists, unknown seeds, macro versus seed-balanced aggregation, paired bootstrap behavior, held-out-target isolation, training database conversion, artifact round-trip evidence, corruption/shape/order checks, and rejection of missing or altered validation selection. A Windows memory-mapped file-lock failure was corrected by loading the modest serving arrays normally; the rerun passed. No failed test is presented as a successful check.

The serving artifact contains recording IDs, item support, top-ten neighbor indices, scores, and shared-listener counts. It contains no listener identifiers or histories. A trusted manifest hash is required before loading; each file is checked, followed by catalog/shape/dtype, finite score, padding, uniqueness, self-link, support bounds, deterministic ordering, and score/evidence consistency checks. Public sharing of aggregate artifacts remains a separate publication decision; generated arrays stay ignored locally.

## Reproduction commands

Run from the repository root with the frozen Stage 6 local inputs present. Preserve existing outputs; use fresh experiment directories for an independent rerun. The exact environment is pinned; do not upgrade dependencies between validation selection and final test. Each command is a separate milestone so validation selection can be reviewed and committed before test use.

```powershell
uv pip install --python .venv/Scripts/python.exe -r ml/requirements-model.txt
.venv/Scripts/python.exe -m unittest discover -s ml/tests -v
.venv/Scripts/python.exe -u -m ml.run_stage7 validation --output data/processed/stage-7-validation-v2
# Freeze and commit the validation report and selection before the next command.
.venv/Scripts/python.exe -u -m ml.run_stage7 test --output data/processed/stage-7-test-v2 --selection data/processed/stage-7-validation-v2/selection.json
.venv/Scripts/python.exe -u -m ml.serving_artifact --selection data/processed/stage-7-validation-v2/selection.json --test-report data/processed/stage-7-test-v2/report.json --output artifacts/stage-7-cf-v1
```

Raw events, listener-level queries, per-query metrics, ranking caches, and model arrays stay out of Git. Source, frozen settings, and aggregate evidence are committed. These commands reproduce offline experiments; there is no API or frontend yet.

## Validation outcome and frozen selection

Validation selected **lambda 50** using the predeclared maximum macro NDCG@10 rule. All models scored the same 7,887 scorable queries / 6,983 seeds against the same 565,147-item candidate catalog. The [full validation evidence](evidence/stage-7-validation.json) and [selection](evidence/stage-7-selection.json) are frozen before final test ranking.

| Model | NDCG@10 | Recall@10 | Precision@10 |
|---|---:|---:|---:|
| cf_lambda_0 | 0.220704 | 0.063135 | 0.199746 |
| cf_lambda_10 | 0.228003 | 0.064966 | 0.205655 |
| cf_lambda_50 | 0.230904 | 0.065064 | 0.208077 |
| popularity | 0.021189 | 0.002843 | 0.020249 |

Validation elapsed time was 131.172 seconds; peak process memory was 3,431,378,944 bytes. These observations include input verification, matrix construction, ranking, metrics, bootstrap intervals, and artifact writing. No test ranking has been used to select lambda. Improvement over popularity in this validation task does not establish subjective recommendation usefulness.

## Memory correction and validation replay

Before a completed test report was produced, code review found that baseline top-ten slices retained full temporary catalog arrays. The exact test processes were stopped; no test report was written or inspected. Commit `d5b8bfe0b66af8426c15c483e8659bcd22d2e72d` limits the temporary candidates to eleven before seed exclusion. The ranking definition and all CF parameters stayed unchanged. A regression test proves exact equivalence for seeds inside and outside the top ten and checks the backing array size. All **48 tests** passed locally and in [CI](https://github.com/pok0yo/music-recommender/actions/runs/39339435161).

Both validation runs produced byte-identical rankings, per-query metrics, and seed arrays for all four models, plus exactly equal aggregate metrics and bootstrap intervals. The same lambda 50 was selected. [Replay evidence](evidence/stage-7-reproducibility.json) preserves hashes; [the earlier report](evidence/stage-7-validation-before-memory-fix.json) remains available. Measured elapsed time changed from 131.172 to 40.234 seconds and peak process memory from 3,431,378,944 to 640,856,064 bytes. These local observations are not cross-machine performance guarantees. The corrected [selection](evidence/stage-7-selection.json) is committed before the new final test run.

## Final held-out result

The corrected selection was committed and pushed in `580bbc9d77731378eb7e52d0e2b6f24a53673388` before final test execution. No parameters changed after inspecting test results. [Final test evidence](evidence/stage-7-test.json) covers 7,848 scorable listener queries and 7,003 distinct seeds. The selected CF improves this specific retrospective future-listening task over the fixed popularity baseline.

| Metric | Popularity | Selected CF |
|---|---:|---:|
| Macro NDCG@10 | 0.021665 | 0.218345 |
| Macro Recall@10 | 0.003147 | 0.060890 |
| Macro Precision@10 | 0.020821 | 0.195260 |
| Seed-balanced NDCG@10 | 0.020712 | 0.201037 |
| Unique recommended IDs | 11 | 47,473 |
| Catalog coverage | 0.001946% | 8.400115% |
| Full ten-item lists | 100% | 99.3884% |
| Zero-hit queries | 86.0729% | 49.2610% |
| Mean recommended training listeners | 1,664.93 | 199.86 |

The paired bootstrap difference in macro NDCG@10 is **+0.196681**, with 95% percentile interval **[0.190176, 0.203435]**. Recall difference is +0.057743 [0.054456, 0.060946]; precision difference is +0.174439 [0.168093, 0.180775]. These intervals describe listener-query resampling conditional on this frozen cohort, catalog, and time window. They do not include uncertainty from choosing a different population or window.

Lower-support seeds remain harder: the 2,208 queries with 5–19 training listeners have CF NDCG@10 0.169512 versus popularity 0.014348. The 5,640 queries with at least 20 listeners have CF 0.237463 versus popularity 0.024529. Nearly half of scorable CF queries have no observed target in the top ten, and average recall is only 6.09%. A complete list is not a useful-list guarantee. One scorable query returns an empty list; no popularity fallback is inserted.

Only **7,848 of 11,577 constructed queries (67.79%)** are scorable. The source audit also records 12,143 active-window listeners, 566 without a seed in the first 21 days, 3,412 unsupported-seed queries, 395 zero-target queries, and 265 queries with all targets outside the catalog. Those reason counts can overlap; they must not be added as disjoint exclusions. There are 379,317 out-of-catalog target pairs among 1,254,237 total pairs. Reported recall uses the 874,920 in-catalog pairs and is therefore conditional on coverage. It is not an all-music recall estimate.

The final run took 45.438 seconds and peaked at 640,823,296 process bytes on the local machine. This includes input checks, fitting the sparse training representation, ranking, metrics, and reporting; it is not request latency. The original training interval remains unchanged for the serving export. No deployment refit is assigned these test scores.

## Model decision and product limits

Use the selected lambda-50 item-CF as the first related-track model, with the serving export now verified. The baseline comparison, stable ranking, train-only support evidence, and lower-support cohort results justify this bounded choice. Optional ALS and metadata hybrids are unnecessary for this stage. The evidence supports offline ranking improvement, not a claim about satisfaction, audio similarity, or causal discovery.

The default explanation remains **“Connected through shared listening in this dataset.”** Details may describe the training interval and thresholded aggregate counts. Scores are ranking signals, never enjoyment probabilities. Unsupported seeds return an explicit unavailable state; supported seeds with insufficient edges return a short or empty list. The eventual API must preserve those distinctions.

Eight approved panel titles remain unsupported, including two unresolved identities. Lucy Bedroque has only one of four supported titles. Full-catalog title/artist identity, external listening links, human usefulness, artist/acoustic diversity, and deployed performance remain unverified. No streaming, playback rights, or application readiness is inferred from these experiments.


## Serving verification and completion

The [artifact manifest](evidence/stage-7-artifact-manifest.json) and [verification report](evidence/stage-7-artifact-verification.json) bind the same frozen model to the real export. All 565,147 rows pass structural, checksum, support, score-formula, ordering, and self-exclusion checks. Exported rankings exactly match all 6,983 validation seeds and 7,003 test seeds. A further 100 deterministic sampled seeds plus all 32 supported panel tracks match on-demand training results, including scores and evidence counts. All 32 panel tracks return ten results. Unsupported and short-list responses pass explicit checks.

Across the full catalog, 553,165 seeds have ten results, 462 have none, and 11,520 have one to nine. These are catalog-wide counts, distinct from query-weighted test completeness. Arrays occupy 113,030,040 serialized bytes and 113,029,400 expanded bytes. Export took 478.469 seconds with 641,093,632 peak process bytes before final reload validation. In a separate verifier process, loading plus full validation took 3.188 seconds and peaked at 181,694,464 process bytes before constructing the training model. One thousand warm local Python lookups over 100 fixed sampled seeds measured p50 0.0073 ms and p95 0.0132 ms. These exclude startup, HTTP, database, network, and deployment overhead; no API latency target is claimed.

The full export was built once. Validation replay is byte-identical, and every exported evaluation ranking matches, but a second full-export rebuild was not performed. The local artifact remains ignored and contains no listener histories. No new event download or paid compute occurred. The [completion decision](evidence/stage-7-decision.json) closes Stage 7 only. Stage 8 requires a new user go; catalog metadata and serving integration remain future work.

Recheck the saved artifact without retraining or changing the experiment:

```powershell
.venv/Scripts/python.exe -m ml.verify_stage7_artifact --artifact artifacts/stage-7-cf-v1 --manifest-sha256 ac341968aef80dc9f5eb9459eea5e5ba119e9112c9b2dc38026dda00bc92f122 --output data/processed/stage-7-artifact-recheck.json
```

Use a fresh output path for each verification. The verifier uses assert-based acceptance checks; run normal Python without optimization flags. All model-source hashes remain those selected before the final test. The added verifier was exercised on the real artifact; the 48 model/audit tests and their successful CI run remain unchanged.
