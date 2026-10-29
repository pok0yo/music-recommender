"""Version-pinned PostgreSQL reads and a separate offline import command."""

import hashlib
import json
from pathlib import Path
from threading import BoundedSemaphore
import unicodedata

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from backend.schemas import Track
from ml.audit_support import sha256
from ml.inspect_spark import save


def normalized(value):
    return unicodedata.normalize("NFKC", value).casefold().strip()


def search_text(row):
    text=normalized(row['title']+' '+' '.join(c['name'] for c in row['artist_credits']))
    folded=''.join(c for c in unicodedata.normalize('NFKD',text) if not unicodedata.combining(c))
    return text if text==folded else text+' '+folded


def content_hash(rows):
    return hashlib.sha256(json.dumps(rows, sort_keys=True, ensure_ascii=False,
        separators=(",", ":")).encode()).hexdigest()


class Catalog:
    def __init__(self, dsn, release):
        self.dsn, self.release = dsn, release
        self.listening_links = {}
        self.slots = BoundedSemaphore(4)

    def query(self, statement, parameters=()):
        if not self.slots.acquire(blocking=False):
            raise psycopg.OperationalError("Catalog concurrency limit")
        try:
            with psycopg.connect(self.dsn, connect_timeout=3, row_factory=dict_row,
                    options="-c default_transaction_read_only=on -c statement_timeout=2000") as db:
                return db.execute(statement, parameters).fetchall()
        finally:
            self.slots.release()

    def check(self, full=False):
        rows = self.query("SELECT * FROM music_catalog.releases WHERE version=%s", (self.release["catalog_version"],))
        if not rows or any(rows[0][key] != self.release[key] for key in
                ("model_manifest_sha256", "content_sha256", "recording_count")):
            raise ValueError("Catalog release mismatch")
        if full:
            items = self.query("SELECT payload FROM music_catalog.recordings WHERE version=%s ORDER BY recording_id",
                (self.release["catalog_version"],))
            payloads = [item["payload"] for item in items]
            if len(payloads) != self.release["recording_count"] or content_hash(payloads) != self.release["content_sha256"]:
                raise ValueError("Catalog contents mismatch")
            for row in payloads:
                Track.model_validate({k:v for k,v in row.items() if not k.startswith("source_")})

    def get(self, recording):
        rows = self.query("SELECT payload FROM music_catalog.recordings WHERE version=%s AND recording_id=%s",
            (self.release["catalog_version"], recording))
        return self.present(rows[0]["payload"]) if rows else None

    def get_many(self, recordings):
        rows = self.query("SELECT payload FROM music_catalog.recordings WHERE version=%s AND recording_id=ANY(%s::uuid[])",
            (self.release["catalog_version"], recordings))
        return {row["payload"]["recording_id"]: self.present(row["payload"]) for row in rows}

    def present(self,payload):
        track=self.track(payload)
        track['listening_links']=self.listening_links.get(track['recording_id'],[])
        return track

    @staticmethod
    def track(payload):
        return Track.model_validate({k:v for k,v in payload.items() if not k.startswith("source_")}).model_dump(mode="json")

    def search(self, text, limit):
        rows = self.query("SELECT payload FROM music_catalog.recordings WHERE version=%s AND position(%s in search_text)>0 ORDER BY search_text COLLATE \"C\",recording_id LIMIT %s",
            (self.release["catalog_version"], normalized(text), limit))
        return [self.present(row["payload"]) for row in rows]

    def starters(self):
        rows = self.query("SELECT payload FROM music_catalog.recordings WHERE version=%s AND starter ORDER BY search_text COLLATE \"C\",recording_id LIMIT 32",
            (self.release["catalog_version"],))
        return [self.present(row["payload"]) for row in rows]


def import_catalog(directory=Path("data/processed/stage-8-catalog-v1"), report_path=Path("docs/evidence/stage-8-catalog-preparation.json")):
    directory, report_path = Path(directory), Path(report_path)
    report = json.loads(report_path.read_text(encoding='utf-8'))
    path = directory / "recordings.json"
    if not report["complete"] or sha256(path) != report["catalog_sha256"]:
        raise ValueError("Prepared catalog is incomplete or its checksum differs")
    rows = json.loads(path.read_text(encoding='utf-8'))
    digest = content_hash(rows)
    version = report.get("new_release", {}).get("catalog_version", "catalog-v1-" + digest)
    release = dict(catalog_version=version, content_sha256=digest, recording_count=len(rows),
        model_manifest_sha256=report["artifact_manifest_sha256"], data_mode="real")
    if "new_release" in report and report["new_release"] != release:
        raise ValueError("Prepared release manifest differs")
    panel = json.loads(Path("docs/evidence/stage-6-support-audit-v2.json").read_text())["panel"]
    starters = {r["recording_mbid"] for r in panel if r["supported"]}
    if not starters <= {row["recording_id"] for row in rows} or len({row["canonical_recording_id"] for row in rows}) != len(rows):
        raise ValueError("Missing approved starter or duplicate canonical recording")
    if len({row["recording_id"] for row in rows}) != len(rows):
        raise ValueError("Duplicate model recording ID")
    for row in rows:
        Catalog.track(row)
    from ml.serving_artifact import Artifact
    trusted = json.loads(Path('docs/evidence/stage-7-decision.json').read_text())['evidence_sha256']['stage-7-artifact-manifest.json']
    if release['model_manifest_sha256'] != trusted:
        raise ValueError('Catalog is not tied to the frozen model')
    artifact = Artifact('artifacts/stage-7-cf-v1', trusted)
    if not {row['recording_id'] for row in rows} <= {value.decode() for value in artifact.arrays['ids']}:
        raise ValueError('Catalog contains unsupported model recordings')
    connections = json.loads(Path("artifacts/local-postgres/connections.json").read_text())
    with psycopg.connect(connections["admin"]) as db:
        db.execute(Path("backend/schema.sql").read_text())
        existing = db.execute("SELECT content_sha256 FROM music_catalog.releases WHERE version=%s", (version,)).fetchone()
        if existing:
            if existing[0] != digest:
                raise ValueError('Existing release differs; refusing overwrite')
        else:
            db.execute("INSERT INTO music_catalog.releases VALUES (%s,%s,%s,%s)",
                (version, release["model_manifest_sha256"], digest, len(rows)))
            for row in rows:
                Catalog.track(row)
                search = search_text(row)
                db.execute("INSERT INTO music_catalog.recordings VALUES (%s,%s,%s,%s,%s)",
                    (version, row["recording_id"], Jsonb(row), search, row["recording_id"] in starters))
    Catalog(connections["reader"], release).check(full=True)
    save(directory / "release.json", release)
    print(json.dumps(release))


if __name__ == "__main__":
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',type=Path,default=Path('data/processed/stage-8-catalog-v1'))
    parser.add_argument('--report',type=Path,default=Path('docs/evidence/stage-8-catalog-preparation.json'))
    args=parser.parse_args()
    import_catalog(args.directory,args.report)
