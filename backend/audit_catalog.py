"""Audit cached display metadata against the frozen real model, without network access."""

import json
from pathlib import Path

from ml.audit_support import sha256
from ml.inspect_spark import save
from ml.serving_artifact import Artifact


def run():
    evidence = Path("docs/evidence")
    decision_path = evidence / "stage-7-decision.json"
    decision = json.loads(decision_path.read_text())
    assert decision["stage_7_complete"]
    for name, digest in decision["evidence_sha256"].items():
        assert sha256(evidence / name) == digest
    artifact = Artifact("artifacts/stage-7-cf-v1",
        decision["evidence_sha256"]["stage-7-artifact-manifest.json"])
    lookup_path = evidence / "stage-6-identity-lookups.json"
    lookup = json.loads(lookup_path.read_text())
    assert lookup["complete"] and len(lookup["lookups"]) == lookup["inventory_count"]
    metadata = {}
    for row in lookup["lookups"]:
        response = Path("data/interim/panel-identity-lookups") / (row["requested_mbid"] + ".json")
        assert sha256(response) == row["response_sha256"]
        raw = json.loads(response.read_text(encoding="utf-8"))
        assert raw["id"] == row["canonical_mbid"] and raw["title"] == row["title"]
        credits = raw.get("artist-credit", [])
        if raw["title"].strip() and credits and all(c.get("name") and c.get("artist", {}).get("id") for c in credits):
            metadata[raw["id"]] = raw
    ids = artifact.arrays["ids"]
    known = set(metadata)
    panel = json.loads((evidence / "stage-6-support-audit-v2.json").read_text())["panel"]
    starters = [r["recording_mbid"] for r in panel if r["supported"]]
    required = set(starters)
    complete = 0
    for seed in starters:
        results = artifact.recommend(seed)
        neighbors = {r["recording_mbid"] for r in results["items"]}
        assert len(neighbors) == 10 and seed not in neighbors
        required.update(neighbors)
        complete += {seed, *neighbors} <= known
    missing = sorted(required - known)
    output = Path("data/processed/stage-8-catalog-audit")
    output.mkdir(parents=True, exist_ok=True)
    save(output / "missing-starter-neighbor-metadata.json", missing)
    save(output / "required-recordings.json", sorted(required))
    matched = sum(recording.decode() in known for recording in ids)
    assert 0 <= complete <= len(starters) and matched <= len(ids)
    report = dict(observed_on="2026-10-20", stage_8_authorized=True,
        stage_7_decision_sha256=sha256(decision_path),
        artifact_manifest_sha256=decision["evidence_sha256"]["stage-7-artifact-manifest.json"],
        identity_lookup_sha256=sha256(lookup_path), cached_lookup_responses_verified=len(lookup["lookups"]),
        cached_canonical_records_with_title_and_credits=len(metadata),
        model_catalog_items=len(ids), model_items_with_cached_metadata=matched,
        approved_supported_starters=len(starters), starter_and_neighbor_unique_ids=len(required),
        starter_and_neighbor_ids_missing_metadata=len(missing),
        starters_with_all_ten_results_describable=complete,
        complete_catalog_metadata_ready=matched == len(ids),
        missing_id_inventory_sha256=sha256(output / "missing-starter-neighbor-metadata.json"),
        required_id_inventory_sha256=sha256(output / "required-recordings.json"),
        limitations=["Cached core fields checked for presence and response identity, not a new catalog-wide identity review",
            "No release/link validation, database, API, or network access in this audit",
            "Submitted listening labels are not independently reconciled metadata"])
    save(evidence / "stage-8-catalog-readiness.json", report)
    print(json.dumps(report))


if __name__ == "__main__":
    run()
