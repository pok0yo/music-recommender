"""Prepare the approved small serving catalog with cached, bounded core metadata lookups."""

import hashlib
import json
from pathlib import Path

from ml.acquire_events import Cache, ROOT
from ml.audit_support import sha256
from ml.inspect_spark import save
from ml.resolve_panel import fetch


def prepare():
    audit = json.loads(Path("docs/evidence/stage-8-catalog-readiness.json").read_text())
    inventory = Path("data/processed/stage-8-catalog-audit/required-recordings.json")
    assert sha256(inventory) == audit["required_id_inventory_sha256"]
    required = json.loads(inventory.read_text())
    assert len(required) == audit["starter_and_neighbor_unique_ids"] == 215
    cache = Path("data/interim/stage-8-metadata")
    cache.mkdir(parents=True, exist_ok=True)
    lookups = json.loads(Path("docs/evidence/stage-6-identity-lookups.json").read_text())["lookups"]
    reusable = {row["canonical_mbid"]: row for row in lookups}
    rows, unavailable, redirects = [], [], []
    budget = Cache(ROOT)
    try:
        for index, recording in enumerate(required):
            url = f"https://musicbrainz.org/ws/2/recording/{recording}?inc=artist-credits&fmt=json"
            path = cache / (recording + ".json")
            receipt = cache / (recording + ".receipt.json")
            if recording in reusable:
                previous = reusable[recording]
                path = Path("data/interim/panel-identity-lookups") / (previous["requested_mbid"] + ".json")
                assert sha256(path) == previous["response_sha256"]
                url = previous["url"]
            elif path.exists():
                assert receipt.exists()
                saved = json.loads(receipt.read_text())
                assert saved["url"] == url and sha256(path) == saved["sha256"]
            else:
                raw = fetch(budget.db, url)
                path.write_bytes(raw)
                save(receipt, dict(url=url, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw)))
            raw = json.loads(path.read_text(encoding="utf-8"))
            if raw.get("id") != recording:
                canonical = raw["id"]
                verification = cache / (canonical + ".redirect-verification.json")
                verification_receipt = verification.with_suffix(".receipt.json")
                verification_url = f"https://musicbrainz.org/ws/2/recording/{canonical}?inc=artist-credits&fmt=json"
                if not verification.exists():
                    verified = fetch(budget.db, verification_url)
                    verification.write_bytes(verified)
                    save(verification_receipt, dict(url=verification_url, sha256=sha256(verification)))
                receipt_data = json.loads(verification_receipt.read_text())
                assert receipt_data["url"] == verification_url and sha256(verification) == receipt_data["sha256"]
                verified = json.loads(verification.read_text(encoding="utf-8"))
                assert verified["id"] == canonical and verified["title"] == raw["title"]
                assert verified["artist-credit"] == raw["artist-credit"]
                redirects.append(dict(model_recording_id=recording, canonical_recording_id=canonical,
                    lookup_sha256=sha256(path), verification_sha256=sha256(verification)))
            credits = raw.get("artist-credit", [])
            if (not raw.get("title", "").strip() or not credits
                    or not all(c.get("name") and c.get("artist", {}).get("id") for c in credits)):
                unavailable.append(recording)
                continue
            rows.append(dict(recording_id=recording, title=raw["title"],
                canonical_recording_id=raw["id"],
                artist_credits=[dict(name=c["name"], artist_id=c["artist"]["id"],
                    joinphrase=c.get("joinphrase", "")) for c in credits],
                disambiguation=raw.get("disambiguation") or None,
                external_link=None, source_url=url, source_sha256=sha256(path)))
            if index % 16 == 0:
                print(json.dumps(dict(checked=index + 1, required=len(required))), flush=True)
    finally:
        budget.close()
    output = Path("data/processed/stage-8-catalog-v1")
    output.mkdir(parents=True, exist_ok=True)
    save(output / "recordings.json", rows)
    report = dict(observed_on="2026-10-20", scope="Approved starters and immediate top-ten neighbors",
        required_recordings=len(required), prepared_recordings=len(rows), unavailable_ids=unavailable,
        complete=not unavailable, catalog_sha256=sha256(output / "recordings.json"),
        verified_metadata_redirects=redirects,
        required_ids_sha256=sha256(inventory), artifact_manifest_sha256=audit["artifact_manifest_sha256"],
        external_links_verified=False, model_ranking_changed=False,
        provenance="MusicBrainz core metadata; no submitted labels, audio, artwork, tags or ratings")
    save(Path("docs/evidence/stage-8-catalog-preparation.json"), report)
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    prepare()
