"""Local-only import/restore rehearsal in new disposable databases; preserves the working catalog."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
from unittest.mock import patch

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

sys.path.insert(0, str(Path.cwd()))
from backend.catalog import Catalog, import_catalog
from backend.listening_links import import_release, load_release

connections = json.loads(Path("artifacts/local-postgres/connections.json").read_text())
assert conninfo_to_dict(connections["admin"])["host"] == "127.0.0.1"
name = "music_phase4_" + secrets.token_hex(4)
names = [name, name + "_restore"]
root = Path("artifacts/phase-4-verification") / name
root.mkdir(parents=True)
release = json.loads(Path("data/processed/catalog-expansion-v2/release.json").read_text())


def state(dsn):
    catalog = Catalog(dsn, release)
    catalog.check(full=True)
    links = load_release(catalog, "data/processed/listening-links-v1/release.json")
    return {"records": catalog.query("SELECT count(*) n FROM music_catalog.recordings WHERE version=%s", (release["catalog_version"],))[0]["n"],
        "links": sum(map(len, links.values())), "catalog_version": release["catalog_version"]}


def pg_env(dsn):
    values = conninfo_to_dict(dsn)
    return {**os.environ, **{"PG" + k.upper(): v for k, v in values.items() if k in ("host", "port", "user", "password")}, "PGDATABASE": values["dbname"]}


before = state(connections["reader"])
admin = make_conninfo(connections["admin"], dbname="postgres")
created = []
try:
    with psycopg.connect(admin, autocommit=True) as db:
        for target in names:
            db.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
            created.append(target)
    writer = make_conninfo(connections["admin"], dbname=name)
    reader = make_conninfo(connections["reader"], dbname=name)
    shutil.copytree("data/processed/catalog-expansion-v2", root / "catalog")
    with psycopg.connect(writer) as db:
        db.execute(Path("deploy/roles.sql").read_text())
        public_query = "SELECT ARRAY(SELECT privilege_type FROM pg_database d, LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a WHERE d.datname=current_database() AND a.grantee=0 ORDER BY privilege_type)"
        public_before = db.execute(public_query).fetchone()[0]
    with patch.dict(os.environ, {"CATALOG_ADMIN_DATABASE_URL": writer, "DATABASE_URL": reader}):
        for _ in range(2):
            import_catalog(root / "catalog", Path("docs/evidence/catalog-expansion-v2.json"))
            import_release()
    loaded = state(reader)
    assert loaded == before
    with psycopg.connect(writer) as db:
        assert db.execute(public_query).fetchone()[0] == public_before
    with psycopg.connect(reader, autocommit=True) as db:
        for statement in ["DELETE FROM music_catalog.recordings", "CREATE TABLE music_catalog.must_not_exist(id int)"]:
            try:
                db.execute(statement)
            except psycopg.errors.InsufficientPrivilege:
                pass
            else:
                raise AssertionError("Reader unexpectedly allowed a write")
    dump = root / "music_catalog.dump"
    binary = Path("artifacts/local-postgres/pgsql/bin")
    subprocess.run([str(binary / "pg_dump.exe"), "--format=custom", "--schema=music_catalog", "--no-owner", "--no-acl", "--file", str(dump)], env=pg_env(writer), check=True)
    restored_writer = make_conninfo(connections["admin"], dbname=names[1])
    subprocess.run([str(binary / "pg_restore.exe"), "--exit-on-error", "--no-owner", "--no-acl", "--dbname", names[1], str(dump)], env=pg_env(restored_writer), check=True)
    with psycopg.connect(restored_writer) as db:
        db.execute(Path("backend/schema.sql").read_text())
        db.execute(Path("backend/listening_links.sql").read_text())
    restored = state(make_conninfo(connections["reader"], dbname=names[1]))
    assert restored == loaded and state(connections["reader"]) == before
    report = {"scope": "Isolated loopback PostgreSQL; no cloud project modified", "imported": loaded,
        "idempotent_import": True, "reader_writes_rejected": True, "restored": restored,
        "working_database_unchanged": True, "managed_database_public_grants_preserved": True, "backup_bytes": dump.stat().st_size,
        "backup_sha256": hashlib.sha256(dump.read_bytes()).hexdigest()}
    Path("docs/evidence/release-phase-4-database.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
finally:
    with psycopg.connect(admin, autocommit=True) as db:
        for target in created:
            assert target in names and target.startswith("music_phase4_")
            db.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(target)))
