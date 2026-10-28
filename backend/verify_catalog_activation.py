"""Verify the imported release, retained rollback, read-only role and active local HTTP API."""

from datetime import datetime, timezone
import json
from pathlib import Path

from fastapi.testclient import TestClient
import httpx

from backend.catalog import Catalog, search_text
from backend.expand_catalog import OUTPUT, save
from backend.main import create_app
from ml.serving_artifact import Artifact


def verify():
    release=json.loads((OUTPUT/'release.json').read_text(encoding='utf-8'))
    previous=json.loads(Path('data/processed/stage-8-catalog-v1/release.json').read_text())
    connections=json.loads(Path('artifacts/local-postgres/connections.json').read_text())
    catalog=Catalog(connections['reader'],release);catalog.check(full=True)
    Catalog(connections['reader'],previous).check(full=True)
    stored=catalog.query('SELECT payload,search_text,starter FROM music_catalog.recordings WHERE version=%s ORDER BY recording_id',(release['catalog_version'],))
    assert len(stored)==4996 and sum(r['starter'] for r in stored)==32
    assert all(r['search_text']==search_text(r['payload']) for r in stored)
    privileges=catalog.query("SELECT has_table_privilege(current_user,'music_catalog.recordings','SELECT') as read, has_table_privilege(current_user,'music_catalog.recordings','INSERT') as insert, has_table_privilege(current_user,'music_catalog.recordings','UPDATE') as update, has_table_privilege(current_user,'music_catalog.recordings','DELETE') as delete")[0]
    assert privileges==dict(read=True,insert=False,update=False,delete=False)
    artifact=Artifact('artifacts/stage-7-cf-v1',release['model_manifest_sha256'])
    starters=catalog.starters();seeds={r['recording_id'] for r in starters}
    seeds|={r['recording_mbid'] for s in sorted(seeds) for r in artifact.recommend(s)['items']}
    seeds|={r['payload']['recording_id'] for r in stored[::50]}
    with TestClient(create_app(catalog,artifact,release,rate_limit=10000)) as client:
        assert client.get('/health/ready').json()['status']=='ready'
        for seed in sorted(seeds):
            response=client.get('/v1/recommendations/'+seed);assert response.status_code==200
            body=response.json();ranked=artifact.recommend(seed)['items']
            known=catalog.get_many([r['recording_mbid'] for r in ranked])
            expected=[(i,r) for i,r in enumerate(ranked,1) if r['recording_mbid'] in known]
            assert [(r['rank'],r['recording_id'],r['shared_training_listeners']) for r in body['results']]==[(i,r['recording_mbid'],r['shared_training_listeners']) for i,r in expected]
            assert body['omitted_metadata_count']==len(ranked)-len(expected)
            assert body['meta']['catalog_version']==release['catalog_version'] and body['meta']['data_mode']=='real'
    with httpx.Client(base_url='http://127.0.0.1:8000',timeout=10,headers={'Origin':'http://127.0.0.1:3000'}) as client:
        def get(path,**kwargs):
            response=client.get(path,**kwargs);assert response.status_code==200
            assert response.headers.get('access-control-allow-origin')=='http://127.0.0.1:3000'
            body=response.json();assert body['meta']['catalog_version']==release['catalog_version'] and body['meta']['data_mode']=='real'
            return body
        assert get('/health/ready')['status']=='ready'
        assert len(get('/v1/catalog/starters')['results'])==32
        for artist in ['nate sib','Tiffany Day','che','2hollis','Lucy Bedroque','beabadoobee','Daniel Caesar','Steve Lacy','Bruno Mars','Giveon']:
            assert get('/v1/catalog/search',params={'q':artist,'limit':20})['results']
        cases=json.loads((OUTPUT/'ui-cases.json').read_text(encoding='utf-8'))
        for seed,expected in list(cases['recommendations'].items())[:6]:
            assert get('/v1/recommendations/'+seed)['results']==expected['results']
        assert client.get('/v1/catalog/search',params={'q':"' OR 1=1 --"}).json()['results']==[]
        assert client.get('/v1/recommendations/00000000-0000-0000-0000-000000000000').status_code==404
    result=dict(verified_at=datetime.now(timezone.utc).isoformat(),activated=True,catalog_version=release['catalog_version'],
        verified_postgres_records=len(stored),approved_starters=len(starters),postgres_api_seed_queries=len(seeds),
        live_artist_searches=10,live_recommendation_queries=min(6,len(cases['recommendations'])),
        ranks_support_and_omissions_verified=True,unaccented_search_verified=True,reader_privileges=privileges,
        rollback_catalog_verified=previous['catalog_version'],previous_records=previous['recording_count'],
        model_manifest_sha256=release['model_manifest_sha256'],
        limitations=['Local activation, not a public deployment','Not a new recommendation-quality evaluation'])
    save(Path('docs/evidence/catalog-expansion-v2-activation.json'),result);print(json.dumps(result))


if __name__=='__main__':verify()
