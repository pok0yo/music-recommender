"""Clean a complete cohort acquisition into chronological, auditable split files."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from ml.acquire_events import COHORT, START, END
from ml.audit_events import MBID
from ml.inspect_spark import save
from ml.probe_spark import URL, ETAG

DAY = 86400 * 10**9
TRAIN_END = 1785542400000000000  # 2026-08-01 UTC.
VALIDATION_END = 1787961600000000000  # 2026-08-29 UTC.
SPLITS = {"train":(START,TRAIN_END), "validation":(TRAIN_END,VALIDATION_END),
          "test":(VALIDATION_END,END)}
EVENT_COLUMNS = ["user_id", "recording_mbid", "listened_at", "created"]


class Cleaner:
    def __init__(self):
        self.counts = Counter()
        self.previous_time = None
        self.border_time = None
        self.border_keys = set()

    def clean(self, table):
        self.counts["input_rows"] += len(table)
        for name in ("user_id", "listened_at", "created"):
            if table[name].null_count:
                raise ValueError(f"Missing required field: {name}")
        if not pa.types.is_integer(table["user_id"].type):
            raise ValueError("Listener ID must be an integer")
        for name in ("listened_at", "created"):
            if not pa.types.is_timestamp(table[name].type):
                raise ValueError("Date field must be a timestamp")
            table = table.set_column(table.schema.get_field_index(name), name,
                                     pc.cast(table[name],pa.timestamp("ns")))
        dates = pc.cast(table["listened_at"],pa.int64())
        if len(table):
            first, last = dates[0].as_py(), dates[-1].as_py()
            if ((self.previous_time is not None and first < self.previous_time) or
                    pc.any(pc.less(dates.slice(1),dates.slice(0,len(dates)-1))).as_py()):
                raise ValueError("Nonchronological input would invalidate boundary deduplication")
            self.previous_time = last
        delay = pc.subtract(pc.cast(table["created"],pa.int64()), dates)
        self.counts["created_before_listened_input_rows"] += pc.sum(pc.less(delay,0)).as_py() or 0
        self.counts["created_over_one_day_late_input_rows"] += pc.sum(pc.greater(delay,DAY)).as_py() or 0
        in_window = pc.and_(pc.greater_equal(dates,START),pc.less(dates,END))
        self.counts["excluded_outside_interval"] += len(table)-(pc.sum(in_window).as_py() or 0)
        table = table.filter(in_window)
        positive = pc.greater(table["user_id"],0)
        self.counts["excluded_nonpositive_listener"] += len(table)-(pc.sum(positive).as_py() or 0)
        table = table.filter(positive)
        ids = pc.utf8_lower(pc.utf8_trim_whitespace(table["recording_mbid"]))
        self.counts["normalized_id_rows"] += pc.sum(pc.not_equal(ids,table["recording_mbid"])).as_py() or 0
        self.counts["excluded_missing_recording"] += ids.null_count
        valid = pc.fill_null(pc.match_substring_regex(ids, "^"+MBID.pattern+"$"), False)
        self.counts["excluded_malformed_recording"] += len(table)-ids.null_count-(pc.sum(valid).as_py() or 0)
        table = table.set_column(table.schema.get_field_index("recording_mbid"),"recording_mbid",ids).filter(valid)
        table = table.select(EVENT_COLUMNS)
        if not len(table):
            return table
        # Keep the first source row for duplicate keys, including its submitted-created value.
        unique = table.group_by(EVENT_COLUMNS[:3],use_threads=False).aggregate([("created","first")])
        unique = unique.rename_columns(EVENT_COLUMNS).sort_by(
            [("listened_at","ascending"),("user_id","ascending"),("recording_mbid","ascending")])
        self.counts["excluded_duplicate"] += len(table)-len(unique)
        times = pc.cast(unique["listened_at"],pa.int64())
        if self.border_time is not None:
            old_border = pc.equal(times,self.border_time)
            drop = [False]*len(unique)
            indices = pc.indices_nonzero(old_border).to_pylist()
            for index in indices:
                key = (unique["user_id"][index].as_py(),unique["recording_mbid"][index].as_py())
                drop[index] = key in self.border_keys
            self.counts["excluded_duplicate"] += sum(drop)
            unique = unique.filter(pc.invert(pa.array(drop)))
        if len(unique):
            times = pc.cast(unique["listened_at"],pa.int64())
            last = times[-1].as_py()
            if last != self.border_time:
                self.border_keys.clear()
            self.border_time = last
            border = unique.filter(pc.equal(times,last))
            self.border_keys.update(zip(border["user_id"].to_pylist(),border["recording_mbid"].to_pylist()))
        self.counts["output_rows"] += len(unique)
        return unique


def partition(table):
    dates = pc.cast(table["listened_at"],pa.int64())
    return {name:table.filter(pc.and_(pc.greater_equal(dates,start),pc.less(dates,end)))
            for name,(start,end) in SPLITS.items()}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=Path("data/processed/cohort-v1"))
    args=parser.parse_args()
    root=Path("data/interim/cohort-v1")
    source=root/"acquisition.json"
    acquired=json.loads(source.read_text())
    if (not acquired["complete"] or len(acquired["files"]) != 149 or
            (acquired["source_url"],acquired["etag"],acquired["cohort_rule"],acquired["start_ns"],acquired["end_ns"]) !=
            (URL,ETAG,COHORT,START,END)):
        raise ValueError("Acquisition incomplete or provenance differs; no partial-data splits")
    temporary=args.output.with_name(args.output.name+".building")
    if args.output.exists() or temporary.exists():
        raise FileExistsError("Preserving existing output/partial run; choose a new output path")
    for name in SPLITS:
        (temporary/name).mkdir(parents=True,exist_ok=False)
    cleaner=Cleaner()
    report=dict(source_manifest_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                source_url=URL,etag=ETAG,cohort_rule=COHORT,complete=False,
                task="Retrospective reconstruction by listen time, not an as-of deployment replay",
                duplicate_policy="First source row for (listener, normalized recording MBID, listen time)",
                split_bounds_ns=SPLITS,counts={},splits={name:{"rows":0,"created_at_or_after_split_end":0} for name in SPLITS},
                files={},training_approved=False)
    for name,item in sorted(acquired["files"].items(),key=lambda pair:int(Path(pair[0]).stem)):
        source_file=root/name
        with source_file.open("rb") as stream:
            if hashlib.file_digest(stream,"sha256").hexdigest() != item["sha256"]:
                raise ValueError("Acquisition checkpoint hash differs")
        writers={}
        try:
            for batch in pq.ParquetFile(source_file).iter_batches(batch_size=65536,columns=EVENT_COLUMNS):
                clean=cleaner.clean(pa.Table.from_batches([batch]))
                for split,table in partition(clean).items():
                    if not len(table):
                        continue
                    if split not in writers:
                        writers[split]=pq.ParquetWriter(temporary/split/name,table.schema,compression="zstd")
                    writers[split].write_table(table)
                    report["splits"][split]["rows"] += len(table)
                    report["splits"][split]["created_at_or_after_split_end"] += pc.sum(pc.greater_equal(
                        pc.cast(table["created"],pa.int64()),SPLITS[split][1])).as_py()
        finally:
            for writer in writers.values():
                writer.close()
        for split in writers:
            path=temporary/split/name
            with path.open("rb") as stream:
                digest=hashlib.file_digest(stream,"sha256").hexdigest()
            report["files"][f"{split}/{name}"]=dict(bytes=path.stat().st_size,sha256=digest)
        report["counts"]=dict(cleaner.counts)
        save(temporary/"manifest.json",report)
        print(json.dumps(dict(member=name,clean_rows=cleaner.counts["output_rows"])),flush=True)
    removed=sum(value for key,value in cleaner.counts.items() if key.startswith("excluded_"))
    if removed+cleaner.counts["output_rows"] != cleaner.counts["input_rows"]:
        raise ValueError("Cleaning counts do not reconcile")
    report["complete"]=True
    save(temporary/"manifest.json",report)
    temporary.rename(args.output)


if __name__ == "__main__":
    main()
