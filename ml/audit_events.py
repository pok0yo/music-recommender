"""Report event quality and artist presence in a bounded pilot, never model quality."""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

MBID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
COLUMNS = ["listened_at", "created", "user_id", "recording_mbid", "artist_credit_mbids", "artist_name"]


def audit(table, artists):
    if not len(table):
        raise ValueError("Empty event pilot")
    for column in ("listened_at", "created", "user_id"):
        if table[column].null_count:
            raise ValueError(f"Null required field: {column}")
    if not pa.types.is_integer(table["user_id"].type):
        raise ValueError("Expected integer listener IDs")
    for column in ("listened_at", "created"):
        if not pa.types.is_timestamp(table[column].type):
            raise ValueError(f"Expected timestamp field: {column}")
    rows = table["recording_mbid"].to_pylist()
    valid = pa.array([isinstance(value, str) and MBID.fullmatch(value) is not None for value in rows])
    mapped = table.filter(valid)
    unique = mapped.select(["user_id", "recording_mbid", "listened_at"]).group_by(
        ["user_id", "recording_mbid", "listened_at"]).aggregate([])
    matched = Counter()
    mapped_counts = Counter()
    users, recordings = defaultdict(set), defaultdict(set)
    artist_ids = {a["mbid"] for a in artists}
    for batch in table.select(["user_id", "recording_mbid", "artist_credit_mbids"]).to_batches(max_chunksize=65536):
        for row in batch.to_pylist():
            for artist in artist_ids.intersection(row["artist_credit_mbids"] or []):
                matched[artist] += 1
                users[artist].add(row["user_id"])
                recording = row["recording_mbid"]
                if isinstance(recording, str) and MBID.fullmatch(recording):
                    mapped_counts[artist] += 1
                    recordings[artist].add(recording)
    listen_ns = table["listened_at"].cast(pa.timestamp("ns")).cast(pa.int64())
    created_ns = table["created"].cast(pa.timestamp("ns")).cast(pa.int64())
    delay = pc.subtract(created_ns, listen_ns)
    return {
        "rows":len(table), "valid_recording_id_rows":len(mapped),
        "missing_recording_id_rows":table["recording_mbid"].null_count,
        "malformed_recording_id_rows":len(table)-len(mapped)-table["recording_mbid"].null_count,
        "duplicate_mapped_user_recording_timestamp_rows":len(mapped)-len(unique),
        "nonpositive_listener_id_rows":pc.sum(pc.less_equal(table["user_id"],0)).as_py(),
        "created_before_listened_rows":pc.sum(pc.less(delay,0)).as_py(),
        "created_over_one_day_after_listened_rows":pc.sum(pc.greater(delay,86400*10**9)).as_py(),
        "distinct_listeners":len(pc.unique(table["user_id"])),
        "distinct_mapped_recordings":len(pc.unique(mapped["recording_mbid"])),
        "artist_presence":[dict(name=a["name"],mbid=a["mbid"],
            source_url="https://musicbrainz.org/artist/"+a["mbid"],
            event_rows=matched[a["mbid"]], mapped_event_rows=mapped_counts[a["mbid"]],
            distinct_listeners= len(users[a["mbid"]]),
            distinct_mapped_recordings=len(recordings[a["mbid"]])) for a in artists],
        "artist_match_method":"Exact membership in source artist_credit_mbids; names are not identity matches",
        "training_approved":False,
        "coverage_gate_measured":False,
        "limitation":"One deliberately selected chronological file, not a random listener sample or a training interval. Presence does not establish track support, neighbors, or quality."
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--panel",type=Path,default=Path("docs/coverage-panel.json"))
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():
        parser.error("Preserving existing evidence; select another output")
    if args.input.stat().st_size > 256*1024**2:
        parser.error("Pilot exceeds 256 MiB bound")
    file=pq.ParquetFile(args.input)
    if file.metadata.num_rows > 3_000_000:
        parser.error("Pilot exceeds 3 million row bound")
    result=audit(file.read(columns=COLUMNS),json.loads(args.panel.read_text(encoding="utf-8"))["artists"])
    with args.input.open("rb") as source:
        result["input_sha256"]=hashlib.file_digest(source,"sha256").hexdigest()
    result["input_file"]=args.input.name
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with args.output.open("x",encoding="utf-8") as output:
        json.dump(result,output,indent=2)
        output.write("\n")
    print(json.dumps(result,indent=2))


if __name__ == "__main__":
    main()
