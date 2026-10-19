"""Check the real serving export against frozen experiments and training evidence."""

import argparse
import json
from pathlib import Path
import time

import numpy as np

from ml.audit_support import sha256
from ml.inspect_spark import save, peak_process_bytes
from ml.run_stage7 import verified_model
from ml.serving_artifact import Artifact


def verify(root, expected_hash, output):
    if output.exists():
        raise FileExistsError("Preserving existing verification report")
    started = time.perf_counter()
    artifact = Artifact(root, expected_hash)
    load_seconds = time.perf_counter() - started
    load_peak = peak_process_bytes()
    arrays = artifact.arrays
    rng = np.random.default_rng(20261019)
    sample = rng.choice(len(arrays["ids"]), 100, replace=False)
    durations = []
    for seed in np.resize(sample, 1000):
        recording = arrays["ids"][seed].decode()
        started = time.perf_counter()
        artifact.recommend(recording)
        durations.append((time.perf_counter() - started) * 1000)
    assert artifact.recommend("00000000-0000-0000-0000-000000000000") == dict(
        status="unknown_or_unsupported_seed", items=[])
    experiment_checks = {}
    for phase in ("validation", "test"):
        directory = Path(f"data/processed/stage-7-{phase}-v2")
        report = json.loads((directory / "report.json").read_text())
        for filename, digest in report["local_artifact_sha256"].items():
            assert sha256(directory / filename) == digest
        seeds = np.load(directory / "seed-indices.npy", allow_pickle=False)
        expected = np.load(directory / "cf_lambda_50-rankings.npy", allow_pickle=False)
        np.testing.assert_array_equal(arrays["neighbors"][seeds], expected)
        experiment_checks[phase] = dict(seeds=len(seeds), exact_ranking_match=True)
    model, _ = verified_model()
    np.testing.assert_array_equal(arrays["ids"], model.ids)
    np.testing.assert_array_equal(arrays["support"], model.counts)
    panel = json.loads(Path("docs/evidence/stage-6-support-audit-v2.json").read_text())["panel"]
    supported = [model.index(row["recording_mbid"]) for row in panel if row["supported"]]
    checked = sorted(set(sample.tolist() + supported))
    for seed in checked:
        expected = model.recommend(model.ids[seed].decode(), artifact.manifest["lambda"])
        actual = artifact.recommend(model.ids[seed].decode())
        for item in actual["items"]:
            assert item.pop("explanation_kind") == "shared_training_listeners"
        assert actual == expected
    for row in panel:
        if row["resolved"] and not row["supported"]:
            assert artifact.recommend(row["recording_mbid"])["status"] == "unknown_or_unsupported_seed"
    lengths = (arrays["neighbors"] >= 0).sum(axis=1)
    assert all(lengths[seed] == 10 for seed in supported)
    for length in (0, 1, 9):
        candidates = np.flatnonzero(lengths == length)
        if len(candidates):
            response = artifact.recommend(model.ids[candidates[0]].decode())
            assert response["status"] == "insufficient_connections" and len(response["items"]) == length
    result = dict(verified=True, manifest_sha256=expected_hash,
        verifier_sha256=sha256(Path(__file__)), experiment_checks=experiment_checks,
        training_comparison_seeds=len(checked), supported_panel_full_lists=len(supported),
        catalog_items=len(lengths), list_length_histogram=np.bincount(lengths, minlength=11).tolist(),
        load_and_validation_seconds=load_seconds, load_peak_process_memory_bytes=load_peak,
        warm_lookup=dict(calls=1000, distinct_seeds=100, random_seed=20261019,
            p50_ms=float(np.percentile(durations, 50)), p95_ms=float(np.percentile(durations, 95))),
        scope="Local Python lookup only; includes result objects, excludes API/network/database and startup",
        full_export_builds=1, full_export_rebuild_reproducibility_checked=False)
    save(output, result)
    print(json.dumps(result))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    verify(args.artifact, args.manifest_sha256, args.output)
