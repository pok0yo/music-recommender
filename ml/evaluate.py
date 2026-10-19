"""Binary-relevance ranking metrics on frozen queries, with paired uncertainty."""

from collections import defaultdict
import json

import numpy as np

from ml.audit_support import sha256
from ml.recommend import K

BOOTSTRAP_SEED = 20261019
BOOTSTRAP_REPLICATES = 1000


def metrics(ranking, relevant):
    if not relevant or len(ranking) > K or len(set(ranking)) != len(ranking):
        raise ValueError("Metrics require nonempty relevance and unique bounded rankings")
    hits = np.array([item in relevant for item in ranking], dtype=np.float64)
    discount = 1/np.log2(np.arange(2, K+2))
    ideal = discount[:min(K, len(relevant))].sum()
    return np.array([np.dot(hits, discount[:len(hits)])/ideal,
                     hits.sum()/len(relevant), hits.sum()/K])


def queries(path, expected_hash, model):
    if sha256(path) != expected_hash:
        raise ValueError("Frozen query file hash differs")
    result, seen = [], set()
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            query = json.loads(line)
            if query["user_id"] in seen:
                raise ValueError("Bootstrap requires one query per listener per window")
            seen.add(query["user_id"])
            if not query["scorable"]:
                continue
            seed = model.index(query["seed"])
            relevant = {model.index(r) for r in query["relevant"]}
            if seed is None or not relevant or None in relevant or seed in relevant:
                raise ValueError("Scorable query differs from frozen catalog/task")
            result.append((seed, relevant))
    return result


def paired_interval(differences):
    values = np.asarray(differences, dtype=np.float64)
    if not len(values) or not np.isfinite(values).all():
        raise ValueError("Bootstrap requires finite paired observations")
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    means = np.array([values[rng.integers(len(values), size=len(values))].mean()
                      for _ in range(BOOTSTRAP_REPLICATES)])
    lo, hi = np.quantile(means, [.025, .975])
    return dict(mean_difference=float(values.mean()), lower_95=float(lo), upper_95=float(hi),
                replicates=BOOTSTRAP_REPLICATES, seed=BOOTSTRAP_SEED, unit="listener/query")


def summarize(query_rows, rankings, support, catalog_size):
    values = np.array([metrics(rankings[seed], relevant) for seed, relevant in query_rows])
    if not len(values):
        raise ValueError("Cannot evaluate an empty scorable query set")
    names = ("ndcg_at_10", "recall_at_10", "precision_at_10")
    seed_values = defaultdict(list)
    for (seed, _), value in zip(query_rows, values):
        seed_values[seed].append(value)
    lengths = [len(rankings[seed]) for seed, _ in query_rows]
    recommended = {int(i) for seed, _ in query_rows for i in rankings[seed]}
    cohorts = {}
    for label, mask in [("5_to_19", [support[s] < 20 for s, _ in query_rows]),
                        ("20_or_more", [support[s] >= 20 for s, _ in query_rows])]:
        subset = values[np.asarray(mask)]
        cohorts[label] = dict(queries=len(subset), metrics=dict(zip(names,subset.mean(axis=0).tolist())) if len(subset) else None)
    result = dict(queries=len(values), distinct_seeds=len(seed_values),
                  macro=dict(zip(names, values.mean(axis=0).tolist())),
                  seed_balanced=dict(zip(names, np.array([np.mean(v, axis=0) for v in seed_values.values()]).mean(axis=0).tolist())),
                  support_cohorts=cohorts, recommended_unique_items=len(recommended),
                  catalog_coverage=len(recommended)/catalog_size, mean_list_length=float(np.mean(lengths)),
                  full_list_share=float(np.mean(np.array(lengths) == K)),
                  empty_list_share=float(np.mean(np.array(lengths) == 0)),
                  zero_hit_query_share=float(np.mean(values[:, 1] == 0)),
                  mean_recommended_training_listeners=float(np.mean([support[i] for seed, _ in query_rows for i in rankings[seed]])) if recommended else None,
                  fallback_items_used=0)
    return result, values
