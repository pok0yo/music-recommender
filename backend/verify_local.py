"""Verify real HTTP responses, database privileges, and outage recovery locally."""

import json
from pathlib import Path
import subprocess
import sys
import time

import httpx
import psycopg

from backend.main import MODEL_SHA
from ml.inspect_spark import save
from ml.serving_artifact import Artifact


def verify():
    artifact = Artifact("artifacts/stage-7-cf-v1", MODEL_SHA)
    connections = json.loads(Path("artifacts/local-postgres/connections.json").read_text())
    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=10) as client:
        assert client.get("/health/ready").status_code == 200
        starters = client.get("/v1/catalog/starters").json()["results"]
        assert len(starters) == 32
        durations = []
        for seed in starters:
            started = time.perf_counter()
            response = client.get("/v1/recommendations/" + seed["recording_id"])
            durations.append((time.perf_counter()-started)*1000)
            assert response.status_code == 200
            body = response.json()
            expected = artifact.recommend(seed["recording_id"])["items"]
            assert body["status"] == "ok" and body["omitted_metadata_count"] == 0
            assert body["meta"]["data_mode"] == "real"
            assert [r["recording_id"] for r in body["results"]] == [r["recording_mbid"] for r in expected]
            for actual, reference in zip(body["results"], expected):
                assert actual["shared_training_listeners"] == reference["shared_training_listeners"]
                assert actual["external_link"] is None
        assert client.get("/v1/catalog/search", params={"q":"nate sib"}).json()["results"]
        assert client.get("/v1/catalog/search", params={"q":"' OR 1=1 --"}).json()["results"] == []
        assert client.get("/v1/catalog/search", params={"q":"  "}).status_code == 422
        assert client.get("/v1/recommendations/00000000-0000-0000-0000-000000000000").status_code == 404
        assert client.get("/v1/recommendations/" + starters[0]["recording_id"], params={"lambda":"0"}).status_code == 422
        assert "RecommendationResponse" in client.get("/openapi.json").json()["components"]["schemas"]
        subprocess.run([sys.executable, "-m", "backend.local_postgres", "stop"], check=True)
        try:
            assert client.get("/health/ready").status_code == 503
            assert client.get("/health/live").status_code == 200
            assert client.get("/v1/catalog/starters").status_code == 503
        finally:
            subprocess.run([sys.executable, "-m", "backend.local_postgres", "start"], check=True)
        assert client.get("/health/ready").status_code == 200
        assert client.get("/v1/catalog/starters").status_code == 200
    with psycopg.connect(connections["reader"], autocommit=True) as db:
        version = db.execute("SHOW server_version").fetchone()[0]
        privileges = db.execute("SELECT has_table_privilege(current_user,'music_catalog.recordings','SELECT'), has_table_privilege(current_user,'music_catalog.recordings','INSERT'), has_table_privilege(current_user,'music_catalog.recordings','UPDATE'), has_table_privilege(current_user,'music_catalog.recordings','DELETE')").fetchone()
        assert privileges == (True, False, False, False)
        for statement in ("DELETE FROM music_catalog.recordings WHERE false", "CREATE TABLE music_catalog.forbidden(id integer)"):
            try:
                db.execute(statement)
            except psycopg.errors.InsufficientPrivilege:
                pass
            else:
                raise AssertionError("Reader can mutate catalog")
        plan = db.execute("EXPLAIN (FORMAT JSON) SELECT payload FROM music_catalog.recordings WHERE position(%s in search_text)>0 LIMIT 20", ("nate sib",)).fetchone()[0]
    ordered = sorted(durations)
    report = dict(observed_on="2026-10-20", real_model_and_database=True,
        supported_starter_queries_verified=32, all_rankings_and_shared_counts_exact=True,
        postgres_version=version, reader_select_only_verified=True,
        actual_database_outage_and_recovery_verified=True, input_and_injection_checks_pass=True,
        http_local_warm_ms=dict(calls=32, median=ordered[16], maximum=max(ordered)),
        timing_scope="Local sequential HTTP requests including version/readiness checks and PostgreSQL; excludes startup and external network",
        search_query_plan=plan, verifier_sha256=__import__('hashlib').sha256(Path(__file__).read_bytes()).hexdigest(),
        limitations=["215-recording catalog; no deployed service, load test, playback or outbound links",
            "32 starter queries are verification cases, not a fresh recommendation-quality experiment"])
    save(Path("docs/evidence/stage-8-local-verification.json"), report)
    print(json.dumps({k:v for k,v in report.items() if k != "search_query_plan"}))


if __name__ == "__main__":
    verify()
