"""Check the local active pilot, immutable catalog and no-link rollback without provider requests."""

from collections import Counter
from datetime import datetime,timezone
import json
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
import httpx

from backend.catalog import Catalog
from backend.listening_links import load_release
from backend.main import create_app
from backend.prepare_listening_links import OUTPUT,verify
from ml.serving_artifact import Artifact


def run():
    verify()
    release=json.loads(Path('data/processed/catalog-expansion-v2/release.json').read_text())
    previous=json.loads(Path('data/processed/stage-8-catalog-v1/release.json').read_text())
    links_release=json.loads((OUTPUT/'release.json').read_text())
    connections=json.loads(Path('artifacts/local-postgres/connections.json').read_text())
    catalog=Catalog(connections['reader'],release);catalog.check(full=True)
    Catalog(connections['reader'],previous).check(full=True)
    mapping=load_release(catalog,OUTPUT/'release.json')
    permissions=catalog.query("SELECT tablename,has_table_privilege(current_user,'music_catalog.'||tablename,'SELECT') AS read,has_table_privilege(current_user,'music_catalog.'||tablename,'INSERT') AS insert,has_table_privilege(current_user,'music_catalog.'||tablename,'UPDATE') AS update,has_table_privilege(current_user,'music_catalog.'||tablename,'DELETE') AS delete FROM pg_tables WHERE schemaname='music_catalog' AND tablename IN ('recording_links','link_releases') ORDER BY tablename")
    assert len(permissions)==2 and all(row['read'] and not any(row[key] for key in ('insert','update','delete')) for row in permissions)
    artifact=Artifact('artifacts/stage-7-cf-v1',release['model_manifest_sha256'])
    seeds={*mapping,*[track['recording_id'] for track in catalog.starters()]}
    with patch.dict('os.environ',{'LISTENING_LINKS_RELEASE':str((OUTPUT/'release.json').resolve())}):
        with TestClient(create_app(catalog,artifact,release,rate_limit=10000)) as client:
            for seed in sorted(seeds):
                response=client.get('/v1/recommendations/'+seed);assert response.status_code==200
                body=response.json();assert body['seed']['listening_links']==mapping.get(seed,[])
                ranked=artifact.recommend(seed)['items'];known=catalog.get_many([row['recording_mbid'] for row in ranked])
                expected=[(rank,row['recording_mbid']) for rank,row in enumerate(ranked,1) if row['recording_mbid'] in known]
                assert [(row['rank'],row['recording_id']) for row in body['results']]==expected
                assert body['omitted_metadata_count']==len(ranked)-len(expected)
                assert all(row['listening_links']==mapping.get(row['recording_id'],[]) for row in body['results'])
    with patch.dict('os.environ',{'LISTENING_LINKS_RELEASE':''}):
        with TestClient(create_app(Catalog(connections['reader'],release),artifact,release)) as client:
            assert client.get('/health/ready').status_code==200
            assert all(not row['listening_links'] for row in client.get('/v1/catalog/starters').json()['results'])
    with httpx.Client(base_url='http://127.0.0.1:8000',timeout=30) as client:
        ready=client.get('/health/ready');assert ready.status_code==200 and ready.json()['meta']['catalog_version']==release['catalog_version']
        response=client.get('/v1/catalog/starters');assert response.status_code==200
        starters=response.json()['results'];assert len(starters)==32
        assert all(row['listening_links']==mapping.get(row['recording_id'],[]) for row in starters)
    result=dict(verified_at=datetime.now(timezone.utc).isoformat(),local_activation=True,release=links_release,link_count=sum(map(len,mapping.values())),recordings_with_links=len(mapping),counts_by_provider=dict(Counter(link['provider'] for links in mapping.values() for link in links)),starters_with_links=sum(bool(row['listening_links']) for row in starters),recommendation_seed_queries=len(seeds),ranks_and_omissions_preserved=True,catalog_hash_verified=True,rollback_catalog_verified=True,no_link_rollback_verified=True,reader_privileges=permissions,new_acquisition_requests=0,limitations=['Local activation only','Provider playback, Safari and physical devices not checked'])
    Path('docs/evidence/listening-links-activation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result))


if __name__=='__main__':run()
