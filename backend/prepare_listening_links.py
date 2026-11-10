"""215-record recording-relationship pilot; prepares links without importing or activating them."""

from collections import Counter
from datetime import datetime,timezone
import json
import ssl
import sqlite3
import hashlib
from pathlib import Path
import time
from urllib.error import HTTPError,URLError
from urllib.parse import urljoin
from urllib.request import Request,build_opener,HTTPSHandler
import certifi

from backend.catalog import content_hash
from backend.expand_catalog import save
from backend.listening_links import destination
from backend.metadata_cache import MetadataCache,NoRedirect,response_limit
from backend.schemas import ListeningLink
from ml.audit_sample import USER_AGENT
from ml.audit_support import sha256

ROOT=Path('data/interim/listening-links-v1')
OUTPUT=Path('data/processed/listening-links-v1')


def probe(cache,url,retry_unconfirmed=False):
    """Bound each provider hop; a changed recording identity is never accepted."""
    cached=cache.db.execute('SELECT result FROM provider_checks WHERE url=?',(url,)).fetchone()
    if cached:
        previous=json.loads(cached[0])
        if not retry_unconfirmed or previous['reason']!='network_unconfirmed':return previous
        with cache.db:
            cache.db.execute('CREATE TABLE IF NOT EXISTS provider_check_history(url TEXT,result TEXT,PRIMARY KEY(url,result))')
            cache.db.execute('INSERT OR IGNORE INTO provider_check_history VALUES (?,?)',(url,cached[0]))
    context=ssl.create_default_context();context.load_verify_locations(certifi.where())
    identity=destination(url);current=url;result=dict(reachable=False,reason='unconfirmed')
    for _ in range(4):
        last=cache.db.execute('SELECT max(started) FROM requests').fetchone()[0] or 0
        time.sleep(max(0,1.1-(time.time()-last)))
        request_id=cache.reserve(current)
        try:
            with build_opener(NoRedirect,HTTPSHandler(context=context)).open(Request(current,headers={'User-Agent':USER_AGENT,'Accept-Encoding':'identity'}),timeout=20) as response:
                status=response.status
                # Headers and the exact source-linked resource identity establish reachability, not playback entitlement.
                received=len(response.read(1024))
            with cache.db:cache.db.execute('UPDATE requests SET status=?,received=? WHERE id=?',(status,received,request_id))
            result=dict(reachable=status==200,reason='http_200' if status==200 else 'http_'+str(status),final_url=current)
            break
        except HTTPError as error:
            code=error.code;location=error.headers.get('Location','');error.close()
            with cache.db:cache.db.execute('UPDATE requests SET status=? WHERE id=?',(code,request_id))
            if code in (301,302,303,307,308) and location:
                target=urljoin(current,location);parsed=destination(target)
                if not parsed or parsed[:2]!=identity[:2]:result=dict(reachable=False,reason='redirect_identity_changed');break
                current=target;continue
            result=dict(reachable=False,reason='http_'+str(code));break
        except (URLError,TimeoutError):result=dict(reachable=False,reason='network_unconfirmed');break
    result['checked_at']=datetime.now(timezone.utc).isoformat()
    with cache.db:cache.db.execute('INSERT INTO provider_checks VALUES (?,?) ON CONFLICT(url) DO UPDATE SET result=excluded.result',(url,json.dumps(result)))
    return result


def run(retry_unconfirmed=False):
    active=json.loads(Path('data/processed/catalog-expansion-v2/release.json').read_text())
    recordings=json.loads(Path('data/processed/stage-8-catalog-v1/recordings.json').read_text(encoding='utf-8'))
    assert len(recordings)==215
    ledger=Path('data/interim/catalog-expansion-v2/ledger.sqlite');old_hash=sha256(ledger)
    cache=MetadataCache(ROOT,OUTPUT,allowed_url=lambda value:destination(value) is not None)
    cache.db.execute('CREATE TABLE IF NOT EXISTS provider_checks(url TEXT PRIMARY KEY,result TEXT)');cache.db.commit()
    rows=[];counts=Counter();unresolved=[];provenance=[]
    try:
        for i,recording in enumerate(recordings):
            source=f"https://musicbrainz.org/ws/2/recording/{recording['canonical_recording_id']}?inc=artist-credits+url-rels&fmt=json"
            try:raw,digest=cache.get(source)
            except HTTPError as error:
                if error.code not in (404,410):raise
                unresolved.append(dict(recording_id=recording['recording_id'],reason='source_unavailable'));continue
            if raw['id']!=recording['canonical_recording_id']:
                unresolved.append(dict(recording_id=recording['recording_id'],reason='canonical_identity_changed'));continue
            expected={c['artist_id'] for c in recording['artist_credits']};actual={c['artist']['id'] for c in raw.get('artist-credit',[])}
            if expected!=actual:
                unresolved.append(dict(recording_id=recording['recording_id'],reason='artist_identity_changed'));continue
            providers={}
            for relation in raw.get('relations',[]):
                if relation.get('ended') or relation.get('type') not in ('streaming','free streaming'):continue
                resource=relation.get('url',{}).get('resource','');parsed=destination(resource)
                if not parsed:continue
                provider,_,target=parsed
                if provider in providers:continue
                checked=probe(cache,target,retry_unconfirmed)
                provenance.append(dict(recording_id=recording['recording_id'],source_url=source,source_sha256=digest,url=target,**checked))
                if not checked['reachable']:continue
                link=ListeningLink(provider=provider,url=target,verified_at=checked['checked_at'],verification='recording_relationship_and_destination').model_dump(mode='json')
                providers[provider]=link;counts[provider]+=1
            rows.extend(dict(recording_id=recording['recording_id'],canonical_recording_id=recording['canonical_recording_id'],**link) for link in providers.values())
            print(json.dumps(dict(checked=i+1,total=215,links=dict(counts),budget=cache.summary())),flush=True)
        rows.sort(key=lambda r:(r['recording_id'],r['provider']))
        save(OUTPUT/'links.json',rows);save(OUTPUT/'provenance.json',provenance)
        release=dict(links_version='links-v1-'+content_hash(rows),catalog_version=active['catalog_version'],content_sha256=content_hash(rows),link_count=len(rows))
        save(OUTPUT/'release.json',release)
        report=dict(complete=True,activated=False,pilot_recordings=215,records_with_verified_links=len({r['recording_id'] for r in rows}),
            counts_by_provider={p:counts[p] for p in ['spotify','apple_music','youtube_music']},unresolved=unresolved,
            destination_check_outcomes=dict(Counter(p['reason'] for p in provenance)),release=release,
            links_file_sha256=sha256(OUTPUT/'links.json'),provenance_sha256=sha256(OUTPUT/'provenance.json'),
            budget=cache.summary(),catalog_metadata_ledger_unchanged=sha256(ledger)==old_hash,
            limitations=['Pilot only; no catalog-wide acquisition','HTTP reachability does not establish regional or account playback entitlement','Blocked destinations are not promoted to verified links'])
        save(Path('docs/evidence/listening-links-pilot.json'),report);print(json.dumps(report),flush=True)
    finally:cache.close()


def verify():
    """Offline check against cached source relationships and charged destination receipts."""
    report=json.loads(Path('docs/evidence/listening-links-pilot.json').read_text())
    release=json.loads((OUTPUT/'release.json').read_text())
    rows=json.loads((OUTPUT/'links.json').read_text())
    provenance=json.loads((OUTPUT/'provenance.json').read_text())
    recordings={r['recording_id']:r for r in json.loads(Path('data/processed/stage-8-catalog-v1/recordings.json').read_text(encoding='utf-8'))}
    active=json.loads(Path('data/processed/catalog-expansion-v2/release.json').read_text())
    assert report['complete'] and release==report['release'] and release['catalog_version']==active['catalog_version']
    assert sha256(OUTPUT/'links.json')==report['links_file_sha256'] and sha256(OUTPUT/'provenance.json')==report['provenance_sha256']
    assert len(rows)==release['link_count'] and content_hash(rows)==release['content_sha256']
    assert len({(r['recording_id'],r['provider']) for r in rows})==len(rows)
    with sqlite3.connect((ROOT/'ledger.sqlite').resolve().as_uri()+'?mode=ro',uri=True) as db:
        for row in rows:
            source=recordings[row['recording_id']]
            assert row['canonical_recording_id']==source['canonical_recording_id']
            ListeningLink.model_validate({k:v for k,v in row.items() if k not in ('recording_id','canonical_recording_id')})
            evidence=[p for p in provenance if p['recording_id']==row['recording_id'] and p['url']==row['url'] and p['reachable']]
            assert len(evidence)==1
            receipt=evidence[0]
            body,digest=db.execute('SELECT body,sha256 FROM responses WHERE sha256=?',(receipt['source_sha256'],)).fetchone()
            assert hashlib.sha256(body).hexdigest()==digest
            raw=json.loads(body)
            assert raw['id']==row['canonical_recording_id']
            assert {c['artist']['id'] for c in raw['artist-credit']}=={c['artist_id'] for c in source['artist_credits']}
            assert any(not relation.get('ended') and relation.get('type') in ('streaming','free streaming') and destination(relation.get('url',{}).get('resource',''))==destination(row['url']) for relation in raw.get('relations',[]))
            checked=json.loads(db.execute('SELECT result FROM provider_checks WHERE url=?',(row['url'],)).fetchone()[0])
            assert checked['reachable'] and checked['reason']=='http_200' and checked['checked_at']==receipt['checked_at']
            assert datetime.fromisoformat(row['verified_at'])==datetime.fromisoformat(checked['checked_at'])
            assert destination(checked['final_url'])[:2]==destination(row['url'])[:2]
        assert db.execute('SELECT sum(reserved) FROM requests').fetchone()[0]<=report['budget']['download_cap_bytes']
    print(json.dumps(dict(offline_verified=True,link_count=len(rows),records_with_links=len({r['recording_id'] for r in rows}),activation_checked=False)))


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--retry-unconfirmed',action='store_true')
    parser.add_argument('--verify-only',action='store_true')
    args=parser.parse_args()
    verify() if args.verify_only else run(args.retry_unconfirmed)
