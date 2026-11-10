"""Synthetic contract tests; real PostgreSQL/model checks are recorded separately."""

from copy import deepcopy
import unittest
from uuid import UUID
from unittest.mock import patch

from fastapi.testclient import TestClient
import psycopg

from backend.main import create_app, MODEL_SHA


SEED, NEIGHBOR, UNKNOWN = (str(UUID(int=n)) for n in (1, 2, 99))
RELEASE = dict(catalog_version="fixture-v1", model_manifest_sha256=MODEL_SHA, data_mode="demo")


def track(recording):
    return dict(recording_id=recording, canonical_recording_id=recording, title="Fixture track",
        artist_credits=[dict(name="Fixture artist", artist_id=SEED, joinphrase="")],
        disambiguation=None, external_link=None)


class FixtureCatalog:
    def __init__(self):
        self.release, self.failed = deepcopy(RELEASE), False
        self.records = {SEED: track(SEED), NEIGHBOR: track(NEIGHBOR)}

    def check(self, full=False):
        if self.failed:
            raise psycopg.OperationalError("secret database details")

    def get(self, recording):
        return self.records.get(recording)

    def get_many(self, recordings):
        return {r:self.records[r] for r in recordings if r in self.records}

    def search(self, text, limit):
        return [] if text == "absent" else list(self.records.values())[:limit]

    def starters(self):
        return [self.records[SEED]]


class FixtureArtifact:
    manifest = dict(model_id="fixture-only", schema_version=1)

    def __init__(self):
        self.items = [dict(recording_mbid=NEIGHBOR, shared_training_listeners=3,
            seed_training_listeners=5, candidate_training_listeners=5)]

    def recommend(self, recording):
        return dict(items=self.items)


class APITests(unittest.TestCase):
    def setUp(self):
        self.catalog, self.artifact = FixtureCatalog(), FixtureArtifact()

    def client(self, rate_limit=100):
        return TestClient(create_app(self.catalog, self.artifact, deepcopy(RELEASE),
            origins=("http://localhost:3000",), rate_limit=rate_limit))

    def test_contract_and_real_demo_label(self):
        with self.client() as client:
            body = client.get(f"/v1/recommendations/{SEED}").json()
            self.assertEqual(body["status"], "limited")
            self.assertEqual(body["meta"]["data_mode"], "demo")
            self.assertEqual(body["results"][0]["reason_code"], "shared_listeners")
            self.assertNotIn("score", body["results"][0])
            self.assertEqual(client.get("/v1/catalog/search?q=absent").json()["results"], [])
            self.assertIn("RecommendationResponse", client.get("/openapi.json").json()["components"]["schemas"])

    def test_availability_is_catalog_bound_batched_and_does_not_mutate_payloads(self):
        self.catalog.records[UNKNOWN] = track(UNKNOWN)
        def ranked(recording):
            ids = [NEIGHBOR, UNKNOWN] if recording == SEED else []
            return dict(items=[dict(recording_mbid=i,shared_training_listeners=3,
                seed_training_listeners=5,candidate_training_listeners=5) for i in ids])
        self.artifact.recommend = ranked
        original = deepcopy(self.catalog.records)
        with self.client() as client, patch.object(self.catalog,'get_many',wraps=self.catalog.get_many) as batch:
            results = client.get('/v1/catalog/search?q=Fixture').json()['results']
            self.assertEqual({r['recording_id']:r['available_recommendations'] for r in results}, {SEED:2,NEIGHBOR:0,UNKNOWN:0})
            self.assertEqual(batch.call_count,1)
            self.assertEqual(set(batch.call_args.args[0]),{NEIGHBOR,UNKNOWN})
            self.assertEqual(client.get('/v1/catalog/starters').json()['results'][0]['available_recommendations'],2)
            body = client.get('/v1/recommendations/'+SEED+'?limit=1').json()
            self.assertEqual(body['seed']['available_recommendations'],2)
            self.assertEqual(body['results'][0]['available_recommendations'],0)
            self.assertEqual(body['results'][0]['rank'],1)
            del self.catalog.records[UNKNOWN]
            self.assertEqual(client.get('/v1/catalog/starters').json()['results'][0]['available_recommendations'],1)
            self.assertEqual(self.catalog.records,{k:v for k,v in original.items() if k!=UNKNOWN})

    def test_failed_availability_read_is_an_error_not_a_zero_hint(self):
        with self.client() as client, patch.object(self.catalog,'get_many',side_effect=psycopg.OperationalError('private')):
            response = client.get('/v1/catalog/search?q=Fixture')
            self.assertEqual(response.status_code,503)
            self.assertNotIn('private',response.text)
            self.assertNotIn('available_recommendations',response.text)

    def test_availability_contract_rejects_coercion_and_out_of_range_counts(self):
        from backend.schemas import Track
        for count in (-1,11,1.5,True,'0'):
            with self.assertRaises(ValueError):Track.model_validate(dict(track(SEED),available_recommendations=count))
        for count in (None,0,10):
            self.assertEqual(Track.model_validate(dict(track(SEED),available_recommendations=count)).available_recommendations,count)

    def test_input_bounds_safe_errors_and_stable_request_ids(self):
        with self.client() as client:
            for path in ("/v1/catalog/search?q= ", "/v1/catalog/search?q=xx&limit=21",
                    "/v1/catalog/search?q=xx&q=yy", "/v1/catalog/starters?lambda=0",
                    f"/v1/recommendations/{SEED}?limit=11", "/v1/recommendations/not-a-uuid"):
                response = client.get(path)
                self.assertEqual(response.status_code, 422, path)
                self.assertEqual(response.json()["request_id"], response.headers["X-Request-ID"])
            self.assertEqual(client.get(f"/v1/recommendations/{UNKNOWN}").status_code, 404)
            self.assertEqual(set(client.get("/missing").json()), {"code", "message", "request_id"})

    def test_missing_metadata_empty_connections_and_outage_recovery(self):
        with self.client() as client:
            self.artifact.items.append(dict(self.artifact.items[0], recording_mbid=UNKNOWN))
            body = client.get(f"/v1/recommendations/{SEED}?limit=2").json()
            self.assertEqual((body["status"], body["omitted_metadata_count"]), ("limited", 1))
            self.assertEqual(body["results"][0]["rank"], 1)
            self.artifact.items = []
            self.assertEqual(client.get(f"/v1/recommendations/{SEED}").json()["status"], "no_connections")
            self.catalog.failed = True
            response = client.get("/health/ready")
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("secret", response.text)
            self.assertEqual(client.get("/health/live").status_code, 200)
            self.catalog.failed = False
            self.assertEqual(client.get("/health/ready").status_code, 200)
            self.catalog.release["catalog_version"] = "wrong"
            self.assertEqual(client.get("/health/ready").status_code, 503)

    def test_cors_and_single_process_rate_limit(self):
        with self.client(rate_limit=1) as client:
            response = client.get("/v1/catalog/starters", headers={"Origin":"http://localhost:3000"})
            self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")
            response = client.get("/v1/catalog/starters", headers={"Origin":"https://unapproved.example"})
            self.assertEqual(response.status_code, 429)
            self.assertIn("Retry-After", response.headers)
            self.assertNotIn("access-control-allow-origin", response.headers)

    def test_artifact_failure_and_unexpected_error_are_safe(self):
        with patch.dict("os.environ", {"MODEL_DIRECTORY":"artifacts/does-not-exist"}):
            with TestClient(create_app(self.catalog, None, deepcopy(RELEASE))) as client:
                self.assertEqual(client.get("/health/live").status_code, 200)
                self.assertEqual(client.get("/health/ready").status_code, 503)
        self.catalog.search = lambda *args: (_ for _ in ()).throw(RuntimeError("secret connection string"))
        with TestClient(create_app(self.catalog, self.artifact, deepcopy(RELEASE)),
                raise_server_exceptions=False) as client:
            response = client.get("/v1/catalog/search?q=test")
            self.assertEqual(response.status_code, 500)
            self.assertNotIn("secret", response.text)
            self.assertEqual(response.json()["request_id"], response.headers["X-Request-ID"])


if __name__ == "__main__":
    unittest.main()
