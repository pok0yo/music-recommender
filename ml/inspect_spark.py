"""Index pinned Spark members and inspect bounded Parquet inputs; no training."""

import argparse
import hashlib
from http.client import HTTPSConnection
import io
import json
from pathlib import Path
import struct
import tarfile
import time
from urllib.parse import urlsplit

from ml.probe_spark import ETAG, SIZE, URL, RangeReader


def time_bounds(column):
    import pyarrow as pa
    import pyarrow.compute as pc

    result = pc.min_max(column)
    return {key:pc.cast(result[key], pa.string()).as_py() for key in ("min", "max")}


def header(reader, offset):
    reader.seek(offset)
    block = reader.read(min(4096, SIZE - offset))
    if block[:1024] == bytes(1024):
        return None
    with tarfile.open(fileobj=io.BytesIO(block), mode="r:") as archive:
        member = archive.next()
    if member is None or not member.isfile() or member.offset_data > 4096:
        raise ValueError("Unexpected tar header/member; stop rather than skip")
    base = "listenbrainz-spark-dump-2722-20261015-000002-full/"
    if not member.name.startswith(base) or "/" in member.name[len(base):]:
        raise ValueError("Unexpected archive member path")
    start = offset + member.offset_data
    end = start + ((member.size + 511) // 512) * 512
    if not offset < end <= SIZE:
        raise ValueError("Member outside archive")
    return {"path": member.name, "bytes": member.size, "offset": start, "next_header": end}


def save(path, data):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def last_member(reader, end=SIZE):
    """Locate a Parquet footer, then verify its inferred start against a tar header."""
    import pyarrow.parquet as pq

    start = max(0, end - 65536)
    reader.seek(start)
    block = reader.read(end-start)
    stop = block.rfind(b"PAR1") + 4
    if stop < 8:
        raise ValueError("No Parquet footer in bounded tail")
    length = struct.unpack("<I", block[stop-8:stop-4])[0]
    if not 0 < length <= stop-8:
        raise ValueError("Parquet footer exceeds bounded tail")
    footer = block[stop-8-length:stop]
    metadata = pq.read_metadata(io.BytesIO(b"PAR1" + footer))
    chunks = [metadata.row_group(i).column(j) for i in range(metadata.num_row_groups)
              for j in range(metadata.num_columns)]
    data_end = max(min(x for x in (c.dictionary_page_offset, c.data_page_offset)
                       if x is not None and x > 0) + c.total_compressed_size for c in chunks)
    base = start + stop - 8 - length - data_end
    # shortcut: assumes 1536-byte PAX headers, upgrade if a future export changes layout.
    member = header(reader, base-1536)
    if (member is None or member["offset"] != base or
            member["bytes"] != data_end + len(footer) or member["next_header"] > end):
        raise ValueError("Parquet location does not match tar header")
    member["rows"] = metadata.num_rows
    member["column_bytes"] = {
        name:sum(c.total_compressed_size for c in chunks if c.path_in_schema == name)
        for name in sorted({c.path_in_schema for c in chunks})}
    return member


def download_member(reader, member, path):
    if not (0 < member["bytes"] <= 256*1024**2 and
            0 <= member["offset"] < member["offset"]+member["bytes"] <= SIZE):
        raise ValueError("Member outside acquisition bounds")
    if path.exists() or path.with_suffix(".part").exists():
        raise FileExistsError("Preserving existing payload or partial download")
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_suffix(".part")
    digest = hashlib.sha256()
    reader.seek(member["offset"])
    left = member["bytes"]
    with part.open("xb") as output:
        while left:
            data = reader.read(min(left, reader.max_read))
            if not data:
                raise ValueError("Truncated archive member")
            output.write(data)
            digest.update(data)
            left -= len(data)
    part.rename(path)
    return digest.hexdigest()


def timestamp_bounds(reader, member):
    """Decode only the timestamp column; zero-filled gaps are never treated as source data."""
    import pyarrow as pa
    import pyarrow.compute as pc
    import pyarrow.parquet as pq

    size = member["bytes"]
    if not 65536 <= size <= 256*1024**2:
        raise ValueError("Member outside timestamp probe bounds")
    buffer = bytearray(size)
    buffer[:4] = b"PAR1"
    ranges = []

    def fetch(offset, length):
        reader.seek(member["offset"] + offset)
        data = bytearray()
        while len(data) < length:
            chunk = reader.read(min(length-len(data), reader.max_read))
            if not chunk:
                raise ValueError("Truncated column")
            data.extend(chunk)
        buffer[offset:offset+length] = data
        ranges.append(dict(relative_offset=offset, bytes=length,
                           sha256=hashlib.sha256(data).hexdigest()))

    fetch(size-65536,65536)
    metadata = pq.read_metadata(pa.BufferReader(buffer))
    for i in range(metadata.num_row_groups):
        for j in range(metadata.num_columns):
            column = metadata.row_group(i).column(j)
            if column.path_in_schema == "listened_at":
                start = min(x for x in (column.dictionary_page_offset,column.data_page_offset)
                            if x is not None and x>0)
                if not 4 <= start < start+column.total_compressed_size <= size-8:
                    raise ValueError("Timestamp chunk outside member")
                fetch(start,column.total_compressed_size)
    table = pq.read_table(pa.BufferReader(buffer), columns=["listened_at"])
    return dict(bounds=time_bounds(table["listened_at"]),
                rows=len(table), fetched_ranges=ranges, full_file_checksum_verified=False)


def tail_index(path, limit):
    if path.exists():
        report = json.loads(path.read_text(encoding="utf-8"))
        if (report["source_url"], report["etag"]) != (URL, ETAG):
            raise ValueError("Index provenance differs")
    else:
        report = dict(source_url=URL, etag=ETAG, members=[], full_inventory=False,
                      requests=0, reserved_bytes=0, transferred_bytes=0)
    connection = HTTPSConnection(urlsplit(URL).hostname, timeout=30)
    reader = RangeReader(max_requests=512-report["requests"],
                         max_bytes=32*1024**2-report["reserved_bytes"], connection=connection)
    end = report["members"][-1]["offset"]-1536 if report["members"] else SIZE
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        while len(report["members"]) < limit:
            member = last_member(reader, end)
            report["members"].append(member)
            end = member["offset"]-1536
            save(path, {**report, "requests":report["requests"]+reader.requests,
                        "reserved_bytes":report["reserved_bytes"]+reader.reserved_bytes,
                        "transferred_bytes":report["transferred_bytes"]+reader.bytes_read})
            if len(report["members"]) % 10 == 0:
                print(json.dumps({"members":len(report["members"]), "last":member["path"]}),flush=True)
    finally:
        connection.close()
        report["requests"] += reader.requests
        report["reserved_bytes"] += reader.reserved_bytes
        report["transferred_bytes"] += reader.bytes_read
        save(path, report)
    return report


def inspect_file(path):
    import pyarrow.compute as pc
    import pyarrow.parquet as pq

    file = pq.ParquetFile(path)
    table = file.read(columns=["listened_at", "created", "user_id", "recording_mbid"])
    return dict(file=path.name, bytes=path.stat().st_size,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                rows=len(table), schema=str(file.schema_arrow),
                row_groups=file.num_row_groups,
                listened_at=time_bounds(table["listened_at"]),
                created=time_bounds(table["created"]),
                distinct_listeners=len(pc.unique(table["user_id"])),
                unmapped_recordings=table["recording_mbid"].null_count)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", type=Path, default=Path("data/interim/spark-tail-index.json"))
    parser.add_argument("--members", type=int, default=40)
    parser.add_argument("--latest", action="store_true", help="Verify and acquire newest Parquet member")
    parser.add_argument("--dates", type=int, nargs="+", help="Decode dates for up to eight already-indexed file numbers")
    args = parser.parse_args()
    if not 1 <= args.members <= 200:
        parser.error("Member bound must be 1..200")
    started = time.monotonic()
    if args.dates:
        if len(args.dates) > 8 or args.latest:
            parser.error("Choose at most eight date probes, separately from --latest")
        inventory = json.loads(args.index.read_text(encoding="utf-8"))
        if (inventory["source_url"], inventory["etag"]) != (URL, ETAG):
            parser.error("Index provenance differs")
        members = {int(Path(m["path"]).stem):m for m in inventory["members"]}
        if any(number not in members for number in args.dates):
            parser.error("Date probes require already-indexed member numbers")
        output = Path("data/interim/spark-date-probes.json")
        report = json.loads(output.read_text(encoding="utf-8")) if output.exists() else dict(
            source_url=URL, etag=ETAG, probes={}, requests=0, reserved_bytes=0, transferred_bytes=0)
        if (report["source_url"], report["etag"]) != (URL, ETAG):
            parser.error("Date evidence provenance differs")
        connection = HTTPSConnection(urlsplit(URL).hostname, timeout=30)
        reader = RangeReader(max_requests=128-report["requests"],
                             max_bytes=64*1024**2-report["reserved_bytes"],
                             max_read=4*1024**2, connection=connection)
        try:
            for number in args.dates:
                key = str(number)
                if key not in report["probes"]:
                    report["probes"][key] = timestamp_bounds(reader, members[number])
                print(json.dumps({"member":number, **report["probes"][key]["bounds"]}),flush=True)
        finally:
            connection.close()
            report["requests"] += reader.requests
            report["reserved_bytes"] += reader.reserved_bytes
            report["transferred_bytes"] += reader.bytes_read
            save(output, report)
        return
    if args.latest:
        output = Path("data/interim/spark-latest.json")
        if output.exists():
            parser.error("Latest-member evidence already exists; inspect it before another acquisition")
        connection = HTTPSConnection(urlsplit(URL).hostname, timeout=30)
        reader = RangeReader(max_requests=128, max_bytes=256*1024**2,
                             max_read=4*1024**2, connection=connection)
        report = dict(source_url=URL, etag=ETAG, training_approved=False)
        try:
            member = last_member(reader)
            report["member"] = member
            payload = Path("data/raw/spark-latest") / Path(member["path"]).name
            report["download_sha256"] = download_member(reader, member, payload)
            report["inspection"] = inspect_file(payload)
        finally:
            connection.close()
            report.update(requests=reader.requests, transferred_bytes=reader.bytes_read,
                          reserved_bytes=reader.reserved_bytes)
            output.parent.mkdir(parents=True, exist_ok=True)
            save(output, report)
        print(json.dumps(report, indent=2))
        return
    report = tail_index(args.index, args.members)
    print(json.dumps({"members":len(report["members"]), "full_inventory":report["full_inventory"],
                      "transferred_bytes":report["transferred_bytes"],
                      "seconds":round(time.monotonic()-started,2)}))


if __name__ == "__main__":
    main()
