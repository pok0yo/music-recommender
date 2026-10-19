# Stage 7 — recommendation models and evaluation

Status: implementation and 47 correctness/regression tests completed; real-data validation is in progress. Final test results, serving export, and the Stage 7 completion decision are pending. Stage 8 is not authorized.

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
.venv/Scripts/python.exe -u -m ml.run_stage7 validation --output data/processed/stage-7-validation-v1
# Freeze and commit the validation report and selection before the next command.
.venv/Scripts/python.exe -u -m ml.run_stage7 test --output data/processed/stage-7-test-v1 --selection data/processed/stage-7-validation-v1/selection.json
.venv/Scripts/python.exe -u -m ml.serving_artifact --selection data/processed/stage-7-validation-v1/selection.json --test-report data/processed/stage-7-test-v1/report.json --output artifacts/stage-7-cf-v1
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
