"""Resume a pinned seven-column acquisition under a durable 16 GiB allowance."""

import hashlib
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPSConnection, HTTPException
import json
import os
from pathlib import Path
import shutil
import sqlite3
import time
from urllib.parse import urlsplit

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from ml.inspect_spark import header, save
from ml.probe_spark import ETAG, SIZE, URL, RangeReader

CAP = 16 * 1024**3
CHUNK = 4 * 1024**2
OVERHEAD = 16 * 1024 + 1  # Conservative application allowance, not packet accounting.
ROOT = Path("data/raw/spark-columns")
COLUMNS = ["listened_at", "created", "user_id", "recording_mbid",
           "artist_name", "recording_name", "artist_credit_mbids"]
COHORT = "music-recommender-stage6-v1"
START = 1769904000000000000  # 2026-02-01 UTC, nanoseconds.
END = 1790380800000000000  # 2026-09-26 UTC, exclusive.


def reserve_transfer(db, offset, size):
    with db:
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT * FROM source").fetchall() != [(URL, ETAG, CAP)]:
            raise ValueError("Budget provenance differs")
        total = db.execute("SELECT COALESCE(SUM(reserved),0) FROM requests").fetchone()[0]
        if total + size + OVERHEAD > CAP:
            raise ValueError("Additional 16 GiB allowance exhausted; no request sent")
        db.execute("INSERT INTO requests(offset,size,reserved) VALUES(?,?,?)",
                   (offset, size, size + OVERHEAD))


class Cache:
    def __init__(self, root, reader=None):
        root.mkdir(parents=True, exist_ok=True)
        self.root = root
        # A separate OS-backed SQLite lock survives process crashes without stale locks.
        self.lock = sqlite3.connect(root / "process-lock.sqlite", timeout=0)
        try:
            self.lock.execute("BEGIN EXCLUSIVE")
        except sqlite3.OperationalError:
            self.lock.close()
            raise
        self.db = sqlite3.connect(root / "ledger.sqlite")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS source(url TEXT, etag TEXT, cap INTEGER);
            CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY, offset INTEGER,
                size INTEGER, reserved INTEGER);
            CREATE TABLE IF NOT EXISTS chunks(offset INTEGER, size INTEGER, sha256 TEXT,
                PRIMARY KEY(offset,size));
        """)
        with self.db:
            if not self.db.execute("SELECT * FROM source").fetchone():
                self.db.execute("INSERT INTO source VALUES(?,?,?)", (URL, ETAG, CAP))
        if self.db.execute("SELECT * FROM source").fetchall() != [(URL, ETAG, CAP)]:
            self.close()
            raise ValueError("Acquisition source or cap differs; refusing to reset ledger")
        connection = HTTPSConnection(urlsplit(URL).hostname, timeout=60) if reader is None else None
        self.reader = reader or RangeReader(max_requests=10000, max_bytes=CAP,
                                            max_read=CHUNK, connection=connection)
        self.reader.reserve = self.reserve

    def reserve(self, offset, size):
        reserve_transfer(self.db, offset, size)

    def fetch(self, offset, size):
        if not 0 < size <= CHUNK or not 0 <= offset < offset+size <= SIZE:
            raise ValueError("Range outside acquisition bounds")
        path = self.root / f"{offset}-{size}.bin"
        receipt = self.db.execute("SELECT sha256 FROM chunks WHERE offset=? AND size=?",
                                  (offset, size)).fetchone()
        if receipt:
            data = path.read_bytes()
            if len(data) != size or hashlib.sha256(data).hexdigest() != receipt[0]:
                raise ValueError("Cached range corrupted; preserving evidence and stopping")
            return data
        for attempt in range(3):
            self.reader.seek(offset)
            try:
                data = self.reader.read(size)
                break
            except (OSError, HTTPException):
                if self.reader.connection:
                    self.reader.connection.close()
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        self.store(offset, data)
        return data

    def store(self, offset, data):
        size = len(data)
        path = self.root / f"{offset}-{size}.bin"
        part = path.with_suffix(".part")
        with part.open("wb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        part.replace(path)
        with self.db:
            self.db.execute("INSERT INTO chunks VALUES(?,?,?)",
                            (offset, size, hashlib.sha256(data).hexdigest()))

    def prefetch(self, ranges):
        def request(offset, size):
            connection = HTTPSConnection(urlsplit(URL).hostname, timeout=60) if self.reader.connection else None
            reader = RangeReader(max_requests=1,max_bytes=size+1,max_read=CHUNK,connection=connection)
            reader.seek(offset)
            try:
                return reader.read(size)
            finally:
                if connection:
                    connection.close()

        pending = [(offset,size) for offset,size in ranges if not self.db.execute(
            "SELECT 1 FROM chunks WHERE offset=? AND size=?", (offset,size)).fetchone()]
        with ThreadPoolExecutor(max_workers=4) as pool:
            for index in range(0,len(pending),4):
                futures=[]
                for offset,size in pending[index:index+4]:
                    if not 0 < size <= CHUNK or not 0 <= offset < offset+size <= SIZE:
                        raise ValueError("Range outside prefetch bounds")
                    self.reserve(offset,size)
                    futures.append((offset,pool.submit(request,offset,size)))
                for offset,future in futures:
                    self.store(offset,future.result())

    def close(self):
        if hasattr(self, "reader") and self.reader.connection:
            self.reader.connection.close()
        self.db.close()
        self.lock.close()

    def summary(self):
        requests, reserved = self.db.execute(
            "SELECT COUNT(*), COALESCE(SUM(reserved),0) FROM requests").fetchone()
        chunks, retained = self.db.execute(
            "SELECT COUNT(*), COALESCE(SUM(size),0) FROM chunks").fetchone()
        return dict(requests=requests, reserved_bytes=reserved, cap_bytes=CAP,
                    verified_cached_ranges=chunks, cached_body_bytes=retained)


def projected_file(cache, member):
    size, offset = member["bytes"], member["offset"]
    if not 65536 <= size <= 256*1024**2 or not 1536 <= offset < offset+size <= SIZE:
        raise ValueError("Member outside bounded projection")
    # Feed the existing tar-header validator only the cached header range.
    import io
    local = io.BytesIO(cache.fetch(offset-1536, 4096))
    verified = header(local, 0)
    if verified["path"] != member["path"] or verified["bytes"] != size or verified["offset"] != 1536:
        raise ValueError("Member no longer matches pinned inventory")
    buffer = bytearray(size)
    buffer[:4] = cache.fetch(offset, 4)
    if buffer[:4] != b"PAR1":
        raise ValueError("Invalid Parquet magic")
    buffer[-65536:] = cache.fetch(offset+size-65536, 65536)
    metadata = pq.read_metadata(pa.BufferReader(buffer))
    if metadata.num_rows != member["rows"]:
        raise ValueError("Row count differs from inventory")
    observed = {}
    ranges = []
    for i in range(metadata.num_row_groups):
        for j in range(metadata.num_columns):
            column = metadata.row_group(i).column(j)
            name = column.path_in_schema
            observed[name] = observed.get(name, 0) + column.total_compressed_size
            if name.split(".")[0] not in COLUMNS:
                continue
            start = min(x for x in (column.dictionary_page_offset, column.data_page_offset)
                        if x is not None and x > 0)
            stop = start + column.total_compressed_size
            if not 4 <= start < stop <= size-8:
                raise ValueError("Column outside member")
            for position in range(start, stop, CHUNK):
                length = min(CHUNK, stop-position)
                ranges.append((offset+position,length))
    if observed != member["column_bytes"]:
        raise ValueError("Column lengths differ from inventory")
    cache.prefetch(ranges)
    for absolute,length in ranges:
        buffer[absolute-offset:absolute-offset+length] = cache.fetch(absolute,length)
    # This sparse container is temporary and is never saved as an original source file.
    return pq.ParquetFile(pa.BufferReader(buffer))


def cohort_user(user):
    return int.from_bytes(hashlib.sha256(f"{COHORT}:{user}".encode()).digest()[:8], "big") % 10 == 0


def extract(file, output):
    part = output.with_suffix(".part")
    schema = file.schema_arrow.remove_metadata()
    schema = pa.schema([schema.field(name) for name in COLUMNS])
    result = dict(source_rows=0, interval_rows=0, cohort_rows=0, min_ns=None, max_ns=None)
    with pq.ParquetWriter(part, schema, compression="zstd") as writer:
        for batch in file.iter_batches(batch_size=65536, columns=COLUMNS):
            table = pa.Table.from_batches([batch]).replace_schema_metadata(None)
            dates = pc.cast(table["listened_at"], pa.int64())
            if dates.null_count or table["user_id"].null_count:
                raise ValueError("Missing required date or listener")
            bounds = pc.min_max(dates).as_py()
            if (result["max_ns"] is not None and bounds["min"] < result["max_ns"]) or (
                    len(dates)>1 and pc.any(pc.less(dates.slice(1), dates.slice(0,len(dates)-1))).as_py()):
                raise ValueError("Source timestamps are not chronological")
            if result["min_ns"] is None:
                result["min_ns"] = bounds["min"]
            result["max_ns"] = bounds["max"]
            result["source_rows"] += len(table)
            table = table.filter(pc.and_(pc.greater_equal(dates, START), pc.less(dates, END)))
            result["interval_rows"] += len(table)
            users = [u for u in pc.unique(table["user_id"]).to_pylist() if u > 0 and cohort_user(u)]
            table = table.filter(pc.is_in(table["user_id"], value_set=pa.array(users,type=pa.int64())))
            result["cohort_rows"] += len(table)
            writer.write_table(table)
    part.replace(output)
    result.update(bytes=output.stat().st_size, sha256=hashlib.sha256(output.read_bytes()).hexdigest())
    return result


def main():
    evidence = json.loads(Path("docs/evidence/stage-6-spark-acquisition.json").read_text())
    if (evidence["source_url"], evidence["etag"]) != (URL, ETAG):
        raise ValueError("Inventory provenance differs")
    members = sorted((m for m in evidence["tail_inventory"]["members"]
                      if 1349 <= int(Path(m["path"]).stem) <= 1497), key=lambda m:m["offset"])
    if len(members) != 149:
        raise ValueError("Incomplete acquisition inventory")
    output = Path("data/interim/cohort-v1")
    output.mkdir(parents=True, exist_ok=True)
    report_path = output / "acquisition.json"
    report = json.loads(report_path.read_text()) if report_path.exists() else dict(
        source_url=URL, etag=ETAG, cohort_rule=COHORT, cohort_fraction="hash64 modulo 10 = 0",
        start_ns=START, end_ns=END, files={}, complete=False, full_source_checksum_verified=False)
    if (report["source_url"], report["etag"], report["cohort_rule"], report["start_ns"], report["end_ns"]) != (URL, ETAG, COHORT, START, END):
        raise ValueError("Checkpoint configuration differs")
    report["complete"] = False
    cache = Cache(ROOT)
    try:
        previous = None
        for member in members:
            name = Path(member["path"]).name
            path = output / name
            if name in report["files"]:
                item = report["files"][name]
                if hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
                    raise ValueError("Cohort checkpoint hash differs")
            else:
                if shutil.disk_usage(output).free < 4*1024**3:
                    raise ValueError("Less than 4 GiB free; preserve progress and stop")
                file = projected_file(cache, member)
                item = extract(file, path)
                file.close()
                report["files"][name] = item
            if previous is not None and item["min_ns"] < previous:
                raise ValueError("Cross-file chronology failed")
            previous = item["max_ns"]
            report["budget"] = cache.summary()
            save(report_path, report)
            print(json.dumps(dict(member=name, completed=len(report["files"]),
                                  cohort_rows=item["cohort_rows"], **cache.summary())), flush=True)
        report["complete"] = True
    finally:
        report["budget"] = cache.summary()
        save(report_path, report)
        cache.close()


if __name__ == "__main__":
    main()
