"""Measure Stage 6 train support and query feasibility; no model ranking or tuning."""

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import sqlite3
import time

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from ml.inspect_spark import save, peak_process_bytes
from ml.prepare_events import SPLITS, DAY


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream,"sha256").hexdigest()


def files(root, manifest, split):
    for name,item in sorted(manifest["files"].items(),key=lambda x:(x[0].split("/")[0],int(Path(x[0]).stem))):
        if name.split("/")[0] != split:
            continue
        path=root/name
        if sha256(path) != item["sha256"]:
            raise ValueError("Cleaned input hash differs")
        yield path


def distribution(values):
    values=sorted(values)
    if not values:
        return dict(count=0)
    return dict(count=len(values),min=values[0],max=values[-1],
                **{f"p{p}":values[max(0,math.ceil(len(values)*p/100)-1)] for p in (50,95,99)})


def create_tables(db):
    db.executescript("""
        CREATE TABLE pairs(recording TEXT NOT NULL,user INTEGER NOT NULL,
            PRIMARY KEY(recording,user)) WITHOUT ROWID;
        CREATE TABLE activity(user INTEGER PRIMARY KEY,events INTEGER NOT NULL);
    """)


def add_training(db, table):
    dates=pc.cast(table["listened_at"],pa.int64())
    if pc.any(pc.or_(pc.less(dates,SPLITS["train"][0]),pc.greater_equal(dates,SPLITS["train"][1]))).as_py():
        raise ValueError("Held-out event entered training index")
    pairs=table.select(["recording_mbid","user_id"]).group_by(["recording_mbid","user_id"]).aggregate([])
    pairs=pairs.sort_by([("recording_mbid","ascending"),("user_id","ascending")])
    db.executemany("INSERT OR IGNORE INTO pairs VALUES(?,?)",zip(pairs["recording_mbid"].to_pylist(),pairs["user_id"].to_pylist()))
    activity=table.group_by("user_id").aggregate([("recording_mbid","count")])
    db.executemany("INSERT INTO activity VALUES(?,?) ON CONFLICT(user) DO UPDATE SET events=events+excluded.events",
                   zip(activity["user_id"].to_pylist(),activity["recording_mbid_count"].to_pylist()))


def finish_training(db):
    db.executescript("""
        CREATE INDEX pairs_by_user ON pairs(user,recording);
        CREATE TABLE support AS SELECT recording,COUNT(*) AS listeners FROM pairs GROUP BY recording;
        CREATE UNIQUE INDEX support_recording ON support(recording);
    """)
    events=[r[0] for r in db.execute("SELECT events FROM activity")]
    unique_items=[r[0] for r in db.execute("SELECT COUNT(*) FROM pairs GROUP BY user")]
    listeners=[r[0] for r in db.execute("SELECT listeners FROM support")]
    return dict(events=sum(events),listeners=len(events),recordings=len(listeners),
                binary_pairs=sum(listeners),eligible_recordings=sum(n>=5 for n in listeners),
                item_listener_distribution=distribution(listeners),
                listener_event_distribution=distribution(events),
                listener_unique_item_distribution=distribution(unique_items),
                top_one_percent_listener_event_share=(sum(sorted(events,reverse=True)[:math.ceil(len(events)*.01)])/sum(events)) if events else None)


def training_index(root, manifest, output):
    path=output/"training.sqlite"
    receipt=output/"training-index.json"
    manifest_hash=sha256(root/"manifest.json")
    if receipt.exists():
        saved=json.loads(receipt.read_text())
        if saved["manifest_sha256"] != manifest_hash or saved["database_sha256"] != sha256(path):
            raise ValueError("Training index provenance differs")
        return saved
    if path.exists():
        raise FileExistsError("Preserving incomplete training index; choose a different output directory")
    started=time.monotonic()
    db=sqlite3.connect(path)
    # Bound the cache at 1 GiB to reduce repeated disk reads on the verified 16 GiB machine.
    db.execute("PRAGMA cache_size=-1048576")
    db.execute("PRAGMA temp_store=FILE")
    rows=0
    try:
        create_tables(db)
        for source in files(root,manifest,"train"):
            with db:
                for batch in pq.ParquetFile(source).iter_batches(batch_size=65536):
                    table=pa.Table.from_batches([batch])
                    add_training(db,table)
                    rows+=len(table)
            print(json.dumps(dict(phase="train_index",file=source.name,events=rows)),flush=True)
        if rows != manifest["splits"]["train"]["rows"]:
            raise ValueError("Training row totals differ")
        stats=finish_training(db)
        db.commit()
    finally:
        db.close()
    result=dict(manifest_sha256=manifest_hash,database_sha256=sha256(path),statistics=stats,
                seconds=round(time.monotonic()-started,3))
    save(receipt,result)
    return result


def panel_support(db, tracks):
    result=[]
    for track in tracks:
        recording=track["resolved_recording_mbid"]
        row=db.execute("SELECT listeners FROM support WHERE recording=?",(recording,)).fetchone()
        listeners=row[0] if row else 0
        neighbors=0
        if listeners>=5:
            neighbors=db.execute("""SELECT COUNT(*) FROM (
                SELECT other.recording FROM pairs seed
                JOIN pairs other ON other.user=seed.user
                JOIN support s ON s.recording=other.recording AND s.listeners>=5
                WHERE seed.recording=? AND other.recording<>?
                GROUP BY other.recording HAVING COUNT(*)>=3
            )""",(recording,recording)).fetchone()[0]
        result.append(dict(artist=track["artist"],title=track["title"],recording_mbid=recording,
                           resolved=recording is not None,training_listeners=listeners,
                           qualifying_neighbors=neighbors,supported=listeners>=5 and neighbors>=3,
                           ten_neighbors_available=listeners>=5 and neighbors>=10))
    return result


class Queries:
    def __init__(self, start, end):
        self.start,self.end=start,end
        self.previous=None
        self.active=set()
        self.states={}

    def add(self, users, recordings, dates):
        for user,recording,date in zip(users,recordings,dates):
            if not self.start<=date<self.end or (self.previous is not None and date<self.previous):
                raise ValueError("Holdout is outside its window or not chronological")
            self.previous=date
            self.active.add(user)
            state=self.states.get(user)
            if state is None:
                if date<self.start+21*DAY:
                    self.states[user]=[recording,date,set()]
                continue
            if date==state[1]:
                # Ties use recording ID, never future targets or support.
                state[0]=min(state[0],recording)
            elif state[1]<date<state[1]+7*DAY and recording!=state[0]:
                state[2].add(recording)

    def summarize(self, catalog, output=None):
        counts=Counter(active_window_listeners=len(self.active),constructed_queries=len(self.states),
                       listeners_without_seed_in_first_21_days=len(self.active)-len(self.states))
        scorable_seeds=set()
        for user,(seed,date,targets) in sorted(self.states.items()):
            relevant=targets & catalog
            supported=seed in catalog
            scorable=supported and bool(relevant)
            counts["unsupported_seed_queries"]+=not supported
            counts["zero_target_queries"]+=not targets
            counts["all_targets_outside_catalog_queries"]+=bool(targets) and not relevant
            counts["target_pairs"]+=len(targets)
            counts["in_catalog_target_pairs"]+=len(relevant)
            counts["out_of_catalog_target_pairs"]+=len(targets)-len(relevant)
            counts["scorable_queries"]+=scorable
            if scorable:
                scorable_seeds.add(seed)
            if output:
                output.write(json.dumps(dict(user_id=user,seed=seed,time_ns=date,targets=sorted(targets),
                                             relevant=sorted(relevant),scorable=scorable))+"\n")
        return dict(counts,distinct_scorable_seeds=len(scorable_seeds),
                    scorable_share=counts["scorable_queries"]/len(self.states) if self.states else 0,
                    gate_pass=counts["scorable_queries"]>=500 and len(scorable_seeds)>=100)


def audit_queries(root,manifest,split,catalog,output):
    queries=Queries(*SPLITS[split])
    rows=0
    for source in files(root,manifest,split):
        for batch in pq.ParquetFile(source).iter_batches(batch_size=65536,columns=["user_id","recording_mbid","listened_at"]):
            table=pa.Table.from_batches([batch])
            queries.add(table["user_id"].to_pylist(),table["recording_mbid"].to_pylist(),
                        pc.cast(table["listened_at"],pa.int64()).to_pylist())
            rows+=len(table)
    if rows!=manifest["splits"][split]["rows"]:
        raise ValueError("Holdout row totals differ")
    path=output/f"{split}-queries.jsonl"
    with path.open("w",encoding="utf-8",newline="\n") as stream:
        result=queries.summarize(catalog,stream)
    result.update(events=rows,artifact_sha256=sha256(path))
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=Path("data/processed/support-v1"))
    parser.add_argument("--input",type=Path,default=Path("data/processed/cohort-v1"))
    args=parser.parse_args()
    root=args.input
    manifest=json.loads((root/"manifest.json").read_text())
    if not manifest["complete"] or manifest["split_bounds_ns"]!={k:list(v) for k,v in SPLITS.items()}:
        raise ValueError("Cleaned splits incomplete or boundaries differ")
    panel_path=Path("docs/evidence/stage-6-panel-resolution.json")
    panel=json.loads(panel_path.read_text())
    approved=json.loads(Path("docs/coverage-panel.json").read_text())
    expected={(a["mbid"],title) for a in approved["artists"] for title in a["tracks"]}
    actual={(t["artist_mbid"],t["title"]) for t in panel["tracks"]}
    if len(panel["tracks"])!=40 or actual!=expected or not panel["complete"] or not panel.get("resolution_review_complete"):
        raise ValueError("Panel search inventory is incomplete or differs from approved titles")
    args.output.mkdir(parents=True,exist_ok=True)
    started=time.monotonic()
    training=training_index(root,manifest,args.output)
    db=sqlite3.connect(f"file:{(args.output/'training.sqlite').as_posix()}?mode=ro",uri=True)
    try:
        catalog={row[0] for row in db.execute("SELECT recording FROM support WHERE listeners>=5")}
        tracks=panel_support(db,panel["tracks"])
    finally:
        db.close()
    report=dict(stage=6,training=training,cleaned_manifest_sha256=sha256(root/"manifest.json"),
                panel_resolution_sha256=sha256(panel_path),panel=tracks,
                catalog_sha256=hashlib.sha256("\n".join(sorted(catalog)).encode()).hexdigest(),
                eligible_catalog_items=len(catalog),panel_supported=sum(t["supported"] for t in tracks),
                panel_with_ten_neighbors=sum(t["ten_neighbors_available"] for t in tracks),
                panel_resolved=sum(t["resolved"] for t in tracks),holdouts={},model_results_measured=False)
    report["panel_gate_pass"]=report["panel_supported"]>=32
    save(args.output/"audit.json",report)
    for split in ("validation","test"):
        report["holdouts"][split]=audit_queries(root,manifest,split,catalog,args.output)
        save(args.output/"audit.json",report)
        print(json.dumps(dict(phase=split,**report["holdouts"][split])),flush=True)
    report["data_gates_pass"]=report["panel_gate_pass"] and all(h["gate_pass"] for h in report["holdouts"].values())
    report["seconds_this_run"]=round(time.monotonic()-started,3)
    report["peak_process_memory_bytes"]=peak_process_bytes()
    save(args.output/"audit.json",report)
    print(json.dumps({k:report[k] for k in ("panel_supported","panel_resolved","eligible_catalog_items","data_gates_pass")}),flush=True)


if __name__=="__main__":
    main()
