"""Offline real-model/catalog footprint inside a Linux memory/CPU scope; no hosted-DB claim."""
import json
from pathlib import Path
import resource
import sys
import time

if sys.platform != "linux":
    raise SystemExit("Run in the documented Linux scope")

started = time.monotonic()
cgroup = Path("/sys/fs/cgroup") / Path("/proc/self/cgroup").read_text().strip().split("::", 1)[1].lstrip("/")
memory_limit = (cgroup / "memory.max").read_text().strip()
cpu_limit = (cgroup / "cpu.max").read_text().strip()
assert memory_limit == "512000000", memory_limit
assert cpu_limit == "10000 100000", cpu_limit

sys.path.insert(0, str(Path.cwd()))
import backend.main  # Include the same API/scientific imports as the deployed service.
from backend.catalog import content_hash
from backend.schemas import Track, ListeningLink
from ml.serving_artifact import Artifact

model = Artifact("artifacts/stage-7-cf-v1", backend.main.MODEL_SHA)
rows = json.loads(Path("data/processed/catalog-expansion-v2/recordings.json").read_text())
release = json.loads(Path("data/processed/catalog-expansion-v2/release.json").read_text())
assert content_hash(rows) == release["content_sha256"]
for row in rows:
    Track.model_validate({k: v for k, v in row.items() if not k.startswith("source_")})
    assert model.recommend(row["recording_id"])["status"] != "unknown_or_unsupported_seed"
links = json.loads(Path("data/processed/listening-links-v1/links.json").read_text())
for row in links:
    ListeningLink.model_validate({k: v for k, v in row.items() if k not in ("recording_id", "canonical_recording_id")})
report = {"platform": sys.platform, "python": sys.version.split()[0], "memory_limit_bytes": int(memory_limit),
    "cpu_quota": cpu_limit, "peak_rss_bytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024,
    "cgroup_memory_peak_bytes": int((cgroup / "memory.peak").read_text()),
    "seconds": round(time.monotonic() - started, 3), "model_items": len(model.arrays["ids"]),
    "verified_catalog_records": len(rows), "verified_links": len(links),
    "scope": "Real frozen model, all serving seeds, metadata/link validation and API imports. No HTTP server or database connection; not Render cold-start or network performance."}
Path("docs/evidence/release-phase-4-linux.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
