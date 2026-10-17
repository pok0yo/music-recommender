"""Acquire and inspect the pinned ListenBrainz sample without extracting it.

Requires Python 3.14+ for standard-library Zstandard support. This is a source
feasibility audit, not a training-data importer or recommendation implementation.
"""

import argparse
from collections import Counter
from compression import zstd
import hashlib
import json
from pathlib import Path
import tarfile
import time
from urllib.request import Request, urlopen


FILENAME = "listenbrainz-sample-dump-20250610-094311.tar.zst"
URL = (
    "https://data.metabrainz.org/pub/musicbrainz/listenbrainz/sample/"
    "listenbrainz-sample-20250610-094311-full/" + FILENAME
)
SHA256 = "509282544c50b324db8dfb4e33a5af4012f514c153da077a0fb07f093956168b"
COMPRESSED_BYTES = 246_734_240
MAX_EXPANDED_BYTES = 4 * 1024**3
# The pinned artist metadata contains a measured 94 MB JSON row.
MAX_LINE_BYTES = 128 * 1024**2
USER_AGENT = "MusicRecommenderAudit/0.1 (https://github.com/pok0yo/music-recommender)"


def sha256_file(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify(path):
    if path.stat().st_size != COMPRESSED_BYTES or sha256_file(path) != SHA256:
        raise ValueError("Archive differs from the pinned size or SHA-256")


def download(path):
    """Never overwrite an existing archive, including an invalid one."""
    if path.exists():
        verify(path)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    partial = path.with_suffix(path.suffix + ".part")
    if partial.exists():
        raise FileExistsError(f"Inspect/remove the interrupted download first: {partial}")
    request = Request(URL, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response, partial.open("xb") as output:
        size = 0
        while chunk := response.read(1024**2):
            size += len(chunk)
            if size > COMPRESSED_BYTES:
                raise ValueError("Download exceeds the pinned byte limit")
            output.write(chunk)
    verify(partial)
    if path.exists():
        raise FileExistsError(path)
    partial.rename(path)


def inspect_tar(stream):
    """Inventory all members; inspect JSON/CSV schemas, never execute/extract."""
    members = []
    total_bytes = 0
    event_rows = 0
    event_members = []
    schema_sequence = None
    with tarfile.open(fileobj=stream, mode="r|") as archive:
        for member in archive:
            if len(members) >= 10_000:
                raise ValueError("Archive exceeds member limit")
            if not member.isfile():
                if member.isdir():
                    continue
                raise ValueError("Archive contains a link or special member")
            total_bytes += member.size
            if total_bytes > MAX_EXPANDED_BYTES:
                raise ValueError("Archive exceeds expanded byte limit")
            item = {"path": member.name, "bytes": member.size}
            source = archive.extractfile(member)
            name = Path(member.name).name
            if name == "SCHEMA_SEQUENCE":
                if member.size > 64:
                    raise ValueError("Unexpected schema marker size")
                schema_sequence = source.read().decode("utf-8").strip()
            elif name.endswith((".jsonl", ".listens")):
                rows = 0
                fields = Counter()
                largest_line = 0
                while line := source.readline(MAX_LINE_BYTES + 1):
                    if len(line) > MAX_LINE_BYTES:
                        raise ValueError(f"JSON line exceeds byte limit in {member.name}")
                    largest_line = max(largest_line, len(line))
                    row = json.loads(line)
                    if not isinstance(row, dict):
                        raise ValueError("Expected one JSON object per line")
                    rows += 1
                    fields.update(row.keys())
                    if "listened_at" in row and ("user_id" in row or "user_name" in row):
                        event_rows += 1
                item.update(rows=rows, max_line_bytes=largest_line, field_counts=dict(sorted(fields.items())))
            elif name.endswith(".csv"):
                header = source.readline(MAX_LINE_BYTES + 1)
                if len(header) > MAX_LINE_BYTES:
                    raise ValueError("CSV header exceeds byte limit")
                item["header"] = header.decode("utf-8").strip().split(",")
            elif name.endswith(".parquet"):
                item["inspection"] = "inventory_only; excluded from training"
            if name.endswith(".listens"):
                event_members.append(member.name)
            members.append(item)
    return {
        "schema_sequence": schema_sequence,
        "expanded_file_bytes": total_bytes,
        "file_count": len(members),
        "json_event_rows_detected": event_rows,
        "listen_members": event_members,
        "members": members,
        "parquet_contents_verified": False,
        "training_approved": False,
        "decision": (
            "No JSON listening events detected; source review required"
            if event_rows == 0 else "Events detected; identity/time/license audit still required"
        ),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--archive", type=Path, default=Path("data/raw") / FILENAME)
    parser.add_argument("--output", type=Path, default=Path("data/interim/sample-audit.json"))
    args = parser.parse_args()
    if args.output.resolve() == args.archive.resolve():
        parser.error("Audit output cannot replace the source archive")
    if args.output.exists():
        parser.error("Audit output exists; use another path to preserve prior evidence")
    started = time.perf_counter()
    if args.download:
        download(args.archive)
    verify(args.archive)
    with zstd.open(args.archive, "rb") as stream:
        report = inspect_tar(stream)
    report.update(
        source_url=URL, sha256=SHA256, compressed_bytes=COMPRESSED_BYTES,
        elapsed_seconds=round(time.perf_counter() - started, 3),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(report, output, indent=2, sort_keys=True)
        output.write("\n")
    print(json.dumps({key: value for key, value in report.items() if key != "members"}, indent=2))


if __name__ == "__main__":
    main()
