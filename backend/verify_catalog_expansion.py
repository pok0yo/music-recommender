"""Verify an inactive catalog snapshot through the real API without importing or activating it."""

import json
from pathlib import Path
import sqlite3

from fastapi.testclient import TestClient

from backend.catalog import Catalog, content_hash, normalized, search_text
from backend.expand_catalog import OUTPUT, EVIDENCE, save
from backend.main import create_app
from backend.metadata_cache import ROOT
from ml.audit_support import sha256
from ml.serving_artifact import Artifact


class SnapshotCatalog:
    def __init__(self, rows, release):
        self.release=release
        self.records={r['recording_id']:Catalog.track(r) for r in rows}
        self.search_rows=sorted(self.records.values(),key=lambda r:(search_text(r),r['recording_id']))
        self.starter_ids={r['recording_mbid'] for r in json.loads(Path('docs/evidence/stage-6-support-audit-v2.json').read_text())['panel'] if r['supported']}

    def check(self,full=False):
        if len(self.records)!=self.release['recording_count']:raise ValueError('Snapshot size differs')

    def get(self,recording):return self.records.get(recording)

    def get_many(self,recordings):return {r:self.records[r] for r in recordings if r in self.records}

    def starters(self):return [r for r in self.search_rows if r['recording_id'] in self.starter_ids]

    def search(self,text,limit):
        return [r for r in self.search_rows if normalized(text) in search_text(r)][:limit]


def verify():
    report=json.loads(EVIDENCE.read_text(encoding='utf-8'))
    release=json.loads((OUTPUT/'release.json').read_text())
    if not report['complete'] or report['activated']:raise ValueError('Expected complete inactive preparation')
    if sha256(OUTPUT/'recordings.json')!=report['catalog_sha256']:raise ValueError('Prepared file changed')
    rows=json.loads((OUTPUT/'recordings.json').read_text(encoding='utf-8'))
    if content_hash(rows)!=release['content_sha256'] or release!=report['new_release']:raise ValueError('Release contents differ')
    artifact=Artifact('artifacts/stage-7-cf-v1',release['model_manifest_sha256'])
    model_ids={v.decode() for v in artifact.arrays['ids']}
    if len({r['canonical_recording_id'] for r in rows})!=len(rows):raise ValueError('Duplicate canonical IDs')
    if not {r['recording_id'] for r in rows}<=model_ids:raise ValueError('Unsupported model seed')
    # Re-hash the preserved raw responses that prove each display row.
    raw_sources={}
    for directory in ['data/interim/panel-identity-lookups','data/interim/stage-8-metadata']:
        for p in Path(directory).glob('*.json'):
            if 'receipt' not in p.name:raw_sources[sha256(p)]=json.loads(p.read_text(encoding='utf-8'))
    with sqlite3.connect((ROOT/'ledger.sqlite').resolve().as_uri()+'?mode=ro',uri=True) as db:
        from hashlib import sha256 as digest
        for body,expected in db.execute('SELECT body,sha256 FROM responses'):
            if digest(body).hexdigest()!=expected:raise ValueError('Cached source changed')
            raw_sources[expected]=json.loads(body)
    for row in rows:
        raw=raw_sources[row['source_sha256']]
        candidates=raw.get('recordings',[raw])
        matched=[r for r in candidates if r.get('id')==row['canonical_recording_id']]
        if len(matched)!=1:raise ValueError('Missing unique source identity')
        raw=matched[0]
        credits=[dict(name=c['name'],artist_id=c['artist']['id'],joinphrase=c.get('joinphrase','')) for c in raw['artist-credit']]
        if row['title']!=raw['title'] or row['artist_credits']!=credits or row['disambiguation']!=(raw.get('disambiguation') or None):raise ValueError('Display fields differ from source')
    catalog=SnapshotCatalog(rows,release)
    seeds=set(catalog.starter_ids)
    seeds|={r['recording_mbid'] for s in sorted(seeds) for r in artifact.recommend(s)['items']}
    # An evenly spaced, deterministic sample also exercises the expanded search boundary.
    seeds|={rows[i]['recording_id'] for i in range(0,len(rows),max(1,len(rows)//100))}
    limited=0;requests=0
    with TestClient(create_app(catalog,artifact,release,rate_limit=10000)) as client:
        assert client.get('/health/ready').json()['status']=='ready'
        assert len(client.get('/v1/catalog/starters').json()['results'])==32
        for seed in sorted(seeds):
            body=client.get('/v1/recommendations/'+seed).json();requests+=1
            ranked=artifact.recommend(seed)['items']
            expected=[(rank,item) for rank,item in enumerate(ranked,1) if item['recording_mbid'] in catalog.records]
            assert body['meta']['catalog_version']==release['catalog_version'] and body['meta']['data_mode']=='real'
            assert body['omitted_metadata_count']==len(ranked)-len(expected)
            assert [(r['rank'],r['recording_id'],r['shared_training_listeners']) for r in body['results']]==[(rank,r['recording_mbid'],r['shared_training_listeners']) for rank,r in expected]
            limited+=body['status']=='limited'
        for artist in report['original_artist_counts']:
            result=client.get('/v1/catalog/search',params={'q':artist,'limit':20})
            assert result.status_code==200 and result.json()['results']
        assert client.get('/v1/catalog/search',params={'q':'Giveon'}).json()['results']
        assert client.get('/v1/catalog/search',params={'q':"' OR 1=1 --"}).json()['results']==[]
        assert client.get('/v1/recommendations/00000000-0000-0000-0000-000000000000').status_code==404
        old_ids={r['recording_id'] for r in json.loads(Path('data/processed/stage-8-catalog-v1/recordings.json').read_text())}
        cases=dict(starters=client.get('/v1/catalog/starters').json(),searches={},recommendations={},selections={})
        for artist in ['nate sib','Tiffany Day','Daniel Caesar']:
            search=client.get('/v1/catalog/search',params={'q':artist,'limit':10}).json()
            candidate=next(r for r in search['results'] if r['recording_id'] not in old_ids)
            body=client.get('/v1/recommendations/'+candidate['recording_id']).json()
            assert body['results']
            cases['searches'][artist]=search;cases['selections'][artist]=candidate
            cases['recommendations'][candidate['recording_id']]=body
            child=body['results'][0]['recording_id']
            cases['recommendations'][child]=client.get('/v1/recommendations/'+child).json()
        save(OUTPUT/'ui-cases.json',cases)
    result=dict(complete=True,activated=False,verified_source_rows=len(rows),model_supported_rows=len(rows),
        api_seed_queries=requests,limited_queries=limited,original_artist_searches=10,
        metadata_omissions_and_ranks_preserved=True,model_manifest_sha256=release['model_manifest_sha256'],
        catalog_version=release['catalog_version'],limitations=['API snapshot verification, not a PostgreSQL import or active website switch','Not a new accuracy or human-usefulness study'])
    save(Path('docs/evidence/catalog-expansion-v2-verification.json'),result)
    print(json.dumps(result))


if __name__=='__main__':verify()
