"""Prepare an inactive repair using the existing metadata allowance; never import or activate."""

from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.error import HTTPError

from backend.catalog import Catalog, content_hash
from backend.expand_catalog import coverage, payload, save, unique_recordings, url
from backend.metadata_cache import MetadataCache
from backend.schemas import ListeningLink
from ml.audit_support import sha256
from ml.serving_artifact import Artifact

BASE = Path('data/processed/catalog-expansion-v2')
OUTPUT = Path('data/processed/catalog-gap-repair-v3')
EVIDENCE = Path('docs/evidence/catalog-gap-repair-v3.json')


class RepairCache(MetadataCache):
    def disk_bytes(self):
        # The original output still counts against the same disk allowance.
        return super().disk_bytes() + sum(p.stat().st_size for p in BASE.rglob('*') if p.is_file())


def select_gaps(artifact, rows, artist_ids):
    known = {r['recording_id'] for r in rows}
    empty = [r for r in rows if not any(n['recording_mbid'] in known
             for n in artifact.recommend(r['recording_id'])['items'])]
    empty.sort(key=lambda r: (not any(c['artist_id'] in artist_ids for c in r['artist_credits']), r['recording_id']))
    candidates = list(dict.fromkeys(n['recording_mbid'] for r in empty
                      for n in artifact.recommend(r['recording_id'])['items']))
    return [r['recording_id'] for r in empty], candidates


def prepare_links(records, release, root=Path('data/processed/listening-links-v1')):
    previous = json.loads((root/'release.json').read_text(encoding='utf-8'))
    links = json.loads((root/'links.json').read_text(encoding='utf-8'))
    if content_hash(links) != previous['content_sha256'] or len(links) != previous['link_count']:
        raise ValueError('Existing listening links changed')
    indexed = {r['recording_id']: r for r in records}
    for row in links:
        ListeningLink.model_validate({k:v for k,v in row.items() if k not in ('recording_id','canonical_recording_id')})
        if row['recording_id'] not in indexed or indexed[row['recording_id']]['canonical_recording_id'] != row['canonical_recording_id']:
            raise ValueError('Listening link identity changed')
    binding = dict(catalog_version=release['catalog_version'], content_sha256=previous['content_sha256'])
    manifest = dict(links_version='links-v2-'+content_hash(binding), **binding, link_count=len(links))
    return links, manifest


def verify(artifact, records, release, original, empty_seeds, artists, links):
    from fastapi.testclient import TestClient
    from backend.main import create_app
    from backend.verify_catalog_expansion import SnapshotCatalog
    known = {r['recording_id'] for r in records}
    previous = {r['recording_id']:r for r in original}
    indexed = {r['recording_id']:r for r in records}
    if len(known) != len(records) or len({r['canonical_recording_id'] for r in records}) != len(records):
        raise ValueError('Duplicate recording identity')
    if any(indexed.get(k) != row for k,row in previous.items()):
        raise ValueError('Existing recordings were removed or changed')
    if not known <= {v.decode() for v in artifact.arrays['ids']} or content_hash(records) != release['content_sha256']:
        raise ValueError('Unsupported seed or content hash mismatch')
    for row in records:
        Catalog.track(row)
    catalog = SnapshotCatalog(records, release)
    # Snapshot presentation follows the existing loader's verified ID-to-link mapping.
    for row in links:
        catalog.records[row['recording_id']].setdefault('listening_links', []).append(
            {k:v for k,v in row.items() if k not in ('recording_id','canonical_recording_id')})
    queries = 0
    with TestClient(create_app(catalog, artifact, release, rate_limit=50_000)) as client:
        assert client.get('/health/ready').json()['status'] == 'ready'
        assert len(client.get('/v1/catalog/starters').json()['results']) == 32
        for seed in sorted(known):
            response = client.get('/v1/recommendations/'+seed)
            assert response.status_code == 200
            body = response.json(); ranked = artifact.recommend(seed)['items']
            expected = [(rank,n) for rank,n in enumerate(ranked,1) if n['recording_mbid'] in known]
            assert body['meta']['data_mode'] == 'real' and body['meta']['catalog_version'] == release['catalog_version']
            assert body['omitted_metadata_count'] == len(ranked)-len(expected) and body['model_result_count'] == len(ranked)
            assert [(r['rank'],r['recording_id'],r['shared_training_listeners']) for r in body['results']] == [
                (rank,n['recording_mbid'],n['shared_training_listeners']) for rank,n in expected]
            assert body['status'] == ('no_connections' if not ranked else 'ok' if len(expected)==10 else 'limited')
            queries += 1
        for artist in artists:
            assert client.get('/v1/catalog/search', params={'q':artist['name'],'limit':10}).json()['results']
        assert client.get('/v1/catalog/search', params={'q':'Giveon'}).json()['results']
        assert client.get('/v1/recommendations/00000000-0000-0000-0000-000000000000').status_code == 404
    def summary(seeds):
        result = coverage(artifact, seeds, known)
        result['zero_results'] = sum(not any(n['recording_mbid'] in known for n in artifact.recommend(s)['items']) for s in seeds)
        return result
    old = set(previous); added = known-old
    starters = set(catalog.starter_ids); frontier = starters; journeys = []
    for depth in range(1,6):
        journeys.append(dict(round=depth, **summary(frontier)))
        frontier = {n['recording_mbid'] for s in frontier for n in artifact.recommend(s)['items'] if n['recording_mbid'] in known}
    return dict(api_seed_queries=queries, before=coverage(artifact,old,old), existing_catalog=summary(old), original_empty_seeds=summary(set(empty_seeds)),
                added_seeds=summary(added), all_seeds=summary(known), journeys=journeys,
                new_empty_seed_ids=sorted(s for s in added if not any(n['recording_mbid'] in known for n in artifact.recommend(s)['items'])),
                original_artist_coverage={a['name']:summary({r['recording_id'] for r in records
                    if any(c['artist_id']==a['mbid'] for c in r['artist_credits'])}) for a in artists})


def run(verify_only=False):
    previous = json.loads((BASE/'release.json').read_text(encoding='utf-8'))
    original = json.loads((BASE/'recordings.json').read_text(encoding='utf-8'))
    if content_hash(original) != previous['content_sha256']:
        raise ValueError('Base catalog changed')
    artifact = Artifact('artifacts/stage-7-cf-v1', previous['model_manifest_sha256'])
    artists = json.loads(Path('docs/coverage-panel.json').read_text(encoding='utf-8'))['artists']
    empty, candidates = select_gaps(artifact, original, {a['mbid'] for a in artists})
    audit = json.loads(Path('docs/evidence/recommendation-coverage-audit-2026-11-02.json').read_text(encoding='utf-8'))
    inventory = json.dumps(sorted(candidates), indent=2)+'\n'
    from hashlib import sha256 as digest
    # The approved audit file used native Windows newlines; accept either serialization of the exact IDs.
    inventory_hashes = {digest(text.encode()).hexdigest() for text in (inventory,inventory.replace('\n','\r\n'))}
    if previous['catalog_version'] != audit['catalog_version'] or audit['target_inventory_sha256'] not in inventory_hashes:
        raise ValueError('Target differs from the approved audit')
    selection = dict(previous_release=previous, model_manifest_sha256=previous['model_manifest_sha256'],
                     rules='Existing zero-display seeds, original artist credits first, model rank then recording ID; no new graph expansion',
                     empty_seeds=empty, candidates=candidates)
    frozen = OUTPUT/'selection.json'
    if frozen.exists() and json.loads(frozen.read_text(encoding='utf-8')) != selection:
        raise ValueError('Frozen repair selection changed')
    save(frozen, selection)
    old_ledger = Path('data/raw/spark-columns/ledger.sqlite'); old_hash = sha256(old_ledger)
    cache = RepairCache(output=OUTPUT)
    try:
        acquired = {}; unavailable = []; redirects = []
        if verify_only:
            records = json.loads((OUTPUT/'recordings.json').read_text(encoding='utf-8'))
            release = json.loads((OUTPUT/'release.json').read_text(encoding='utf-8'))
            receipt = json.loads(EVIDENCE.read_text(encoding='utf-8'))
            if sha256(OUTPUT/'recordings.json') != receipt['catalog_sha256']:
                raise ValueError('Prepared repair changed')
        else:
            for start in range(0,len(candidates),25):
                batch = candidates[start:start+25]
                source = url(query='rid:('+' OR '.join(batch)+')', limit=100)
                response, checksum = cache.get(source)
                if not isinstance(response.get('recordings'),list):
                    raise ValueError('Invalid recording search response')
                for raw in response['recordings']:
                    if raw['id'] not in batch:raise ValueError('Unrequested recording ID')
                    acquired[raw['id']] = payload(raw,raw['id'],source,checksum)
                progress = dict(checked=min(start+25,len(candidates)), targets=len(candidates), found=len(acquired), budget=cache.summary())
                save(OUTPUT/'progress.json',progress); print(json.dumps(progress),flush=True)
            for recording in candidates:
                if recording in acquired:continue
                source = f'https://musicbrainz.org/ws/2/recording/{recording}?inc=artist-credits&fmt=json'
                try:raw,checksum = cache.get(source)
                except HTTPError as error:
                    if error.code not in (404,410):raise
                    unavailable.append(recording);continue
                row = payload(raw,recording,source,checksum)
                if raw['id'] != recording:
                    target = f"https://musicbrainz.org/ws/2/recording/{raw['id']}?inc=artist-credits&fmt=json"
                    canonical,check = cache.get(target)
                    if any(canonical[k] != raw[k] for k in ('id','title','artist-credit')):
                        raise ValueError('Redirect identity differs')
                    redirects.append(dict(recording_id=recording,canonical_recording_id=raw['id'],verification_sha256=check))
                acquired[recording] = row
                print(json.dumps(dict(individual=recording,found=len(acquired),budget=cache.summary())),flush=True)
            records, aliases = unique_recordings(original+list(acquired.values()), {r['recording_id'] for r in original})
            checksum = content_hash(records)
            release = dict(catalog_version='catalog-v3-'+checksum,content_sha256=checksum,recording_count=len(records),
                           model_manifest_sha256=previous['model_manifest_sha256'],data_mode='real')
            save(OUTPUT/'recordings.json',records);save(OUTPUT/'release.json',release)
            save(OUTPUT/'identity-resolution.json',dict(unavailable=unavailable,redirects=redirects,excluded_aliases=aliases))
        # Each newly served row must be reproduced from a checksummed source response.
        old_ids = {r['recording_id'] for r in original}
        for row in records:
            if row['recording_id'] in old_ids:continue
            source = cache.db.execute('SELECT body FROM responses WHERE sha256=?',(row['source_sha256'],)).fetchone()
            if source is None or digest(source[0]).hexdigest() != row['source_sha256']:raise ValueError('Missing verified source')
            raw = json.loads(source[0]); matches = [r for r in raw.get('recordings',[raw]) if r.get('id')==row['canonical_recording_id']]
            if len(matches)!=1 or payload(matches[0],row['recording_id'],row['source_url'],row['source_sha256']) != row:
                raise ValueError('Display metadata differs from source')
        links, link_release = prepare_links(records,release)
        save(OUTPUT/'links/links.json',links);save(OUTPUT/'links/release.json',link_release)
        validation = verify(artifact,records,release,original,empty,artists,links)
        if old_hash != sha256(old_ledger):raise ValueError('Stage 6 ledger changed')
        report = dict(observed_at=datetime.now(timezone.utc).isoformat(),complete=True,activated=False,
                      previous_release=previous,new_release=release,selection_sha256=sha256(frozen),
                      catalog_sha256=sha256(OUTPUT/'recordings.json'),script_sha256=sha256(Path(__file__)),
                      link_release=link_release,links_file_sha256=sha256(OUTPUT/'links/links.json'),
                      identity_resolution=json.loads((OUTPUT/'identity-resolution.json').read_text(encoding='utf-8')),
                      validation=validation,budget=cache.summary(),stage_6_ledger_unchanged=True,
                      limitations=['Inactive snapshot; no database import or public activation','Not a recommendation-accuracy evaluation',
                                   'Existing provider links retained without new destination checks; new songs use labeled searches'])
        save(EVIDENCE,report);print(json.dumps(report),flush=True)
    finally:
        cache.close()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only',action='store_true')
    run(parser.parse_args().verify_only)
