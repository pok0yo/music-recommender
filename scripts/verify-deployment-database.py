"""Local-only import/restore rehearsal in new disposable databases; preserves the working catalog."""
import hashlib
import argparse
from copy import deepcopy
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
from backend.catalog import Catalog, import_catalog, search_text
from backend.listening_links import import_release, load_release

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--candidate-directory',type=Path)
parser.add_argument('--candidate-report',type=Path)
parser.add_argument('--report',type=Path)
args=parser.parse_args()
if bool(args.candidate_directory)!=bool(args.candidate_report) or (args.candidate_directory and not args.report):
    parser.error('A candidate requires its directory, preparation report and a separate output report')
connections = json.loads(Path("artifacts/local-postgres/connections.json").read_text())
if not all(conninfo_to_dict(value).get('host')=='127.0.0.1' for value in connections.values()):
    raise ValueError('Local rehearsal requires loopback connections for both roles')
name = "music_phase4_" + secrets.token_hex(4)
names = [name, name + "_restore"]
root = Path("artifacts/phase-4-verification") / name
root.mkdir(parents=True)
release = json.loads(Path("data/processed/catalog-expansion-v2/release.json").read_text())


def state(dsn, selected=release, links_path="data/processed/listening-links-v1/release.json"):
    catalog = Catalog(dsn, selected)
    catalog.check(full=True)
    links = load_release(catalog, links_path)
    return {"records": catalog.query("SELECT count(*) n FROM music_catalog.recordings WHERE version=%s", (selected["catalog_version"],))[0]["n"],
        "links": sum(map(len, links.values())), "catalog_version": selected["catalog_version"]}


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
    candidate=None
    if args.candidate_directory:
        candidate_root=root/'candidate'
        shutil.copytree(args.candidate_directory,candidate_root)
        candidate=json.loads((candidate_root/'release.json').read_text(encoding='utf-8'))
        with patch.dict(os.environ, {"CATALOG_ADMIN_DATABASE_URL": writer, "DATABASE_URL": reader}):
            for _ in range(2):
                import_catalog(candidate_root,args.candidate_report)
                import_release(candidate_root/'links',args.candidate_report,candidate_root/'release.json')
            candidate_loaded=state(reader,candidate,candidate_root/'links/release.json')
            assert state(reader)==before
            records=json.loads((candidate_root/'recordings.json').read_text(encoding='utf-8'))
            receipt=json.loads(args.candidate_report.read_text(encoding='utf-8'))
            fault_root=root/'fault-catalog';fault_root.mkdir()
            shutil.copyfile(candidate_root/'recordings.json',fault_root/'recordings.json')
            fault_receipt=deepcopy(receipt)
            fault_receipt['new_release']['catalog_version']='catalog-rehearsal-fault-'+secrets.token_hex(4)
            (fault_root/'receipt.json').write_text(json.dumps(fault_receipt),encoding='utf-8')
            # Fail after a release and its first row were inserted, exercising a real transaction rollback.
            with patch('backend.catalog.search_text',side_effect=[search_text(records[0]),ValueError('rehearsal fault')]):
                try:import_catalog(fault_root,fault_root/'receipt.json')
                except ValueError as error:assert str(error)=='rehearsal fault'
                else:raise AssertionError('Faulted catalog import succeeded')
            with psycopg.connect(reader) as db:
                assert db.execute('SELECT count(*) FROM music_catalog.releases WHERE version=%s',(fault_receipt['new_release']['catalog_version'],)).fetchone()[0]==0
                assert db.execute('SELECT count(*) FROM music_catalog.recordings WHERE version=%s',(fault_receipt['new_release']['catalog_version'],)).fetchone()[0]==0
            fault_links=root/'fault-links';fault_links.mkdir()
            shutil.copyfile(candidate_root/'links/links.json',fault_links/'links.json')
            link_manifest=json.loads((candidate_root/'links/release.json').read_text(encoding='utf-8'))
            bad_link=deepcopy(link_manifest);bad_link['links_version']='links-rehearsal-fault-'+secrets.token_hex(4)
            fault_receipt=deepcopy(receipt);fault_receipt['link_release']=bad_link
            (fault_links/'release.json').write_text(json.dumps(bad_link),encoding='utf-8')
            (fault_links/'receipt.json').write_text(json.dumps(fault_receipt),encoding='utf-8')
            from psycopg.types.json import Jsonb
            first=json.loads((fault_links/'links.json').read_text(encoding='utf-8'))[0]
            payload={k:v for k,v in first.items() if k not in ('recording_id','canonical_recording_id')}
            with patch('psycopg.types.json.Jsonb',side_effect=[Jsonb(payload),ValueError('rehearsal fault')]):
                try:import_release(fault_links,fault_links/'receipt.json',candidate_root/'release.json')
                except ValueError as error:assert str(error)=='rehearsal fault'
                else:raise AssertionError('Faulted link import succeeded')
            with psycopg.connect(reader) as db:
                for table in ('link_releases','recording_links'):
                    assert db.execute(sql.SQL('SELECT count(*) FROM music_catalog.{} WHERE version=%s').format(sql.Identifier(table)),(bad_link['links_version'],)).fetchone()[0]==0
            bad_link['links_version']=json.loads(Path('data/processed/listening-links-v1/release.json').read_text())['links_version']
            fault_receipt['link_release']=bad_link
            (fault_links/'release.json').write_text(json.dumps(bad_link),encoding='utf-8')
            (fault_links/'receipt.json').write_text(json.dumps(fault_receipt),encoding='utf-8')
            try:import_release(fault_links,fault_links/'receipt.json',candidate_root/'release.json')
            except ValueError as error:assert 'Refusing to replace' in str(error)
            else:raise AssertionError('An immutable link version was rebound')
        assert state(reader)==before and state(reader,candidate,candidate_root/'links/release.json')==candidate_loaded
        from backend.main import create_app,MODEL_SHA
        from ml.serving_artifact import Artifact
        from fastapi.testclient import TestClient
        catalog=Catalog(reader,candidate);catalog.listening_links=load_release(catalog,candidate_root/'links/release.json')
        with TestClient(create_app(catalog,Artifact('artifacts/stage-7-cf-v1',MODEL_SHA),candidate,rate_limit=1000)) as client:
            response=client.get('/v1/catalog/starters');assert response.status_code==200
            assert len(response.json()['results'])==32 and all(t['available_recommendations']==10 for t in response.json()['results'])
            response=client.get('/v1/recommendations/d2d8f010-6dbb-4b4a-9723-67b92d0d1a7c');assert response.status_code==200
            assert len(response.json()['results'])==10
            response=client.get('/v1/recommendations/d9654d83-e687-4221-b808-86498d8f01f4');assert response.status_code==200
            assert len(response.json()['results'])==9 and response.json()['omitted_metadata_count']==1
            response=client.get('/v1/catalog/search?q=YOASOBI');assert response.status_code==200
            assert any(t['available_recommendations']==0 for t in response.json()['results'])
            response=client.get('/v1/recommendations/17c054ec-feee-477b-89ac-55140f3b4e56');assert response.status_code==200
            assert not response.json()['results'] and response.json()['seed']['available_recommendations']==0
            assert response.json()['meta']['data_mode']=='real'
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
    if candidate:
        assert state(make_conninfo(connections['reader'],dbname=names[1]),candidate,candidate_root/'links/release.json')==candidate_loaded
    report = {"scope": "Isolated loopback PostgreSQL; no cloud project modified", "imported": loaded,
        "idempotent_import": True, "reader_writes_rejected": True, "restored": restored,
        "working_database_unchanged": True, "managed_database_public_grants_preserved": True, "backup_bytes": dump.stat().st_size,
        "backup_sha256": hashlib.sha256(dump.read_bytes()).hexdigest()}
    if candidate:
        report.update(candidate=candidate_loaded,both_versions_coexist=True,catalog_failure_rolled_back=True,
            link_failure_rolled_back=True,immutable_link_rebinding_rejected=True,rollback_to_previous_pair_verified=True,
            candidate_restored=True,real_candidate_api_checked=True,cloud_modified=False)
    destination=args.report or Path('docs/evidence/release-phase-4-database.json')
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(report, indent=2) + "\n",encoding='utf-8')
    print(json.dumps(report))
finally:
    with psycopg.connect(admin, autocommit=True) as db:
        for target in created:
            assert target in names and target.startswith("music_phase4_")
            db.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(target)))
