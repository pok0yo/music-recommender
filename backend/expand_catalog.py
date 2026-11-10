"""Acquire and prepare an inactive catalog release; no database or API activation."""

from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode

from backend.catalog import Catalog, content_hash
from backend.metadata_cache import MetadataCache, OUTPUT
from ml.audit_support import sha256
from ml.serving_artifact import Artifact

EVIDENCE = Path("docs/evidence/catalog-expansion-v2.json")
BASE = Path("data/processed/stage-8-catalog-v1")


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temporary.replace(path)


def url(**parameters):
    return 'https://musicbrainz.org/ws/2/recording/?' + urlencode(dict(parameters, fmt='json'))


def payload(raw, recording, source_url, digest):
    credits = raw.get('artist-credit', [])
    row = dict(recording_id=recording,canonical_recording_id=raw['id'],title=raw['title'],
        artist_credits=[dict(name=c['name'],artist_id=c['artist']['id'],joinphrase=c.get('joinphrase','')) for c in credits],
        disambiguation=raw.get('disambiguation') or None,external_link=None,source_url=source_url,source_sha256=digest)
    if not row['title'].strip():
        raise ValueError('Blank recording title')
    Catalog.track(row)
    return row


def select(artifact, starters, existing, artists, target=5000):
    ids = artifact.arrays['ids']
    index = {r.decode():i for i,r in enumerate(ids)}
    # Protect four rounds from the approved panel before filling around additional artist recordings.
    chosen = {index[r] for r in starters}
    for _ in range(4):
        chosen |= {int(j) for i in sorted(chosen) for j in artifact.arrays['neighbors'][i] if j>=0}
    chosen |= {index[r] for r in existing | artists if r in index}
    if len(chosen)>target:
        raise ValueError('Protected original-artist coverage exceeds target; review before changing selection')
    queue = sorted(chosen, key=lambda i:(-int(artifact.arrays['support'][i]),ids[i]))
    cursor=0
    while len(chosen)<target and cursor<len(queue):
        i=queue[cursor];cursor+=1
        for j in artifact.arrays['neighbors'][i]:
            if j>=0 and int(j) not in chosen:
                chosen.add(int(j));queue.append(int(j))
                if len(chosen)==target:break
    return sorted(ids[i].decode() for i in chosen)


def coverage(artifact, seeds, known):
    counts=[];missing=0;rankings=[];model_short=0
    for recording in sorted(seeds):
        ranked=[r['recording_mbid'] for r in artifact.recommend(recording)['items']]
        visible=[r for r in ranked if r in known];counts.append(len(visible));missing+=len(ranked)-len(visible)
        rankings.append(tuple(visible));model_short+=len(ranked)<10
    return dict(seeds=len(counts),complete_ten=sum(n==10 for n in counts),
        complete_ten_share=sum(n==10 for n in counts)/len(counts) if counts else 0,
        mean_results=sum(counts)/len(counts) if counts else 0,missing_metadata_positions=missing,
        model_short_lists=model_short,distinct_rankings=len(set(rankings)))


def unique_recordings(rows, previous_ids):
    # Official canonical redirects prove these aliases equivalent; keep v1 identities stable.
    kept={};excluded=[]
    for row in sorted(rows,key=lambda r:(r['recording_id'] not in previous_ids,r['recording_id']!=r['canonical_recording_id'],r['recording_id'])):
        canonical=row['canonical_recording_id']
        if canonical in kept:
            excluded.append(dict(model_recording_id=row['recording_id'],canonical_recording_id=canonical,
                retained_model_recording_id=kept[canonical]['recording_id'],reason='Verified canonical alias; not a distinct recording'))
        else:kept[canonical]=row
    return sorted(kept.values(),key=lambda r:r['recording_id']),excluded


def run():
    previous=json.loads((BASE/'release.json').read_text())
    artifact=Artifact('artifacts/stage-7-cf-v1',previous['model_manifest_sha256'])
    original=json.loads((BASE/'recordings.json').read_text())
    if content_hash(original)!=previous['content_sha256']:raise ValueError('Base release changed')
    panel=json.loads(Path('docs/coverage-panel.json').read_text(encoding='utf-8'))['artists']
    starters={r['recording_mbid'] for r in json.loads(Path('docs/evidence/stage-6-support-audit-v2.json').read_text())['panel'] if r['supported']}
    index={r.decode():i for i,r in enumerate(artifact.arrays['ids'])}
    old_ledger=Path('data/raw/spark-columns/ledger.sqlite');old_hash=sha256(old_ledger)
    rows={r['recording_id']:r for r in original};unavailable=[];redirects=[];artist_rows={};artist_stats={}
    cache=MetadataCache()
    try:
        # Reuse checksummed source responses, never submitted listening labels.
        lookups=json.loads(Path('docs/evidence/stage-6-identity-lookups.json').read_text())['lookups']
        for item in lookups:
            p=Path('data/interim/panel-identity-lookups')/(item['requested_mbid']+'.json')
            if sha256(p)!=item['response_sha256']:raise ValueError('Identity cache changed')
            raw=json.loads(p.read_text(encoding='utf-8'))
            if raw['id'] in index and raw['id'] not in rows:
                rows[raw['id']]=payload(raw,raw['id'],item['url'],item['response_sha256'])
        for artist in panel:
            offset=0;matches=set()
            while True:
                source=url(artist=artist['mbid'],inc='artist-credits',limit=100,offset=offset)
                response,digest=cache.get(source)
                recordings=response.get('recordings')
                if not isinstance(recordings,list):raise ValueError('Invalid artist browse response')
                for raw in recordings:
                    if raw['id'] in index and any(c.get('artist',{}).get('id')==artist['mbid'] for c in raw.get('artist-credit',[])):
                        artist_rows[raw['id']]=payload(raw,raw['id'],source,digest);matches.add(raw['id'])
                offset+=len(recordings)
                if offset>=response['recording-count']:break
                if not recordings or offset>10000:raise ValueError('Artist browse did not finish within bounds')
            artist_stats[artist['name']]=dict(browsed_recordings=offset,model_supported_recordings=len(matches))
            print(json.dumps(dict(artist=artist['name'],**artist_stats[artist['name']],budget=cache.summary())),flush=True)
        rows.update({k:v for k,v in artist_rows.items() if k not in rows})
        required=select(artifact,starters,{r['recording_id'] for r in original},set(artist_rows))
        selection=dict(model_manifest_sha256=previous['model_manifest_sha256'],target=5000,
            rules='Four-round approved-panel closure, existing catalog, original artists intersected with model; then support-ordered breadth-first neighbors in model rank order',
            original_artist_counts=artist_stats,recording_ids=required)
        selection_path=OUTPUT/'selection.json'
        if selection_path.exists():
            frozen=json.loads(selection_path.read_text(encoding='utf-8'))
            if any(frozen[k]!=selection[k] for k in ('model_manifest_sha256','target','rules','recording_ids')):
                raise ValueError('Selection changed on resume; review instead of replacing frozen candidates')
        save(selection_path,selection)
        pending=[r for r in required if r not in rows]
        for start in range(0,len(pending),25):
            batch=pending[start:start+25];source=url(query='rid:('+' OR '.join(batch)+')',limit=100)
            response,digest=cache.get(source)
            for raw in response.get('recordings',[]):
                if raw['id'] not in batch:raise ValueError('Search returned an unrequested recording ID')
                rows[raw['id']]=payload(raw,raw['id'],source,digest)
            print(json.dumps(dict(checked=min(start+25,len(pending)),missing_total=len(pending),budget=cache.summary())),flush=True)
        for recording in required:
            if recording in rows:continue
            source=f'https://musicbrainz.org/ws/2/recording/{recording}?inc=artist-credits&fmt=json'
            try:raw,digest=cache.get(source)
            except HTTPError as error:
                if error.code not in (404,410):raise
                unavailable.append(recording);continue
            row=payload(raw,recording,source,digest)
            if raw['id']!=recording:
                canonical_source=f"https://musicbrainz.org/ws/2/recording/{raw['id']}?inc=artist-credits&fmt=json"
                canonical,canonical_digest=cache.get(canonical_source)
                if canonical['id']!=raw['id'] or canonical['title']!=raw['title'] or canonical['artist-credit']!=raw['artist-credit']:
                    raise ValueError('Canonical redirect verification differs')
                redirects.append(dict(model_recording_id=recording,canonical_recording_id=raw['id'],verification_sha256=canonical_digest))
            rows[recording]=row
        prepared,excluded_aliases=unique_recordings([rows[r] for r in required if r in rows],{r['recording_id'] for r in original})
        canonical=Counter(r['canonical_recording_id'] for r in prepared)
        duplicates={k:v for k,v in canonical.items() if v>1}
        known={r['recording_id'] for r in prepared};old_known={r['recording_id'] for r in original}
        artist_coverage={artist['name']:coverage(artifact,{r['recording_id'] for r in prepared
            if any(c['artist_id']==artist['mbid'] for c in r['artist_credits'])},known) for artist in panel}
        frontier=set(starters);journeys=[]
        for depth in range(1,6):
            journeys.append(dict(round=depth,coverage=coverage(artifact,frontier,known)))
            frontier={r['recording_mbid'] for s in frontier for r in artifact.recommend(s)['items']}
        record_path=OUTPUT/'recordings.json';save(record_path,prepared)
        digest=content_hash(prepared)
        release=dict(catalog_version='catalog-v2-'+digest,content_sha256=digest,recording_count=len(prepared),
            model_manifest_sha256=previous['model_manifest_sha256'],data_mode='real')
        save(OUTPUT/'release.json',release)
        report=dict(observed_at=datetime.now(timezone.utc).isoformat(),complete=len(prepared)>=4900 and starters<=known and all(j['coverage']['complete_ten']==j['coverage']['seeds'] for j in journeys[:3]) and not duplicates,activated=False,model_changed=False,
            required_recordings=len(required),prepared_recordings=len(prepared),unavailable_ids=unavailable,
            duplicate_canonical_ids=duplicates,excluded_canonical_aliases=excluded_aliases,verified_metadata_redirects=redirects,
            artifact_manifest_sha256=previous['model_manifest_sha256'],catalog_sha256=sha256(record_path),
            selection_sha256=sha256(selection_path),previous_release=previous,new_release=release,
            original_artist_counts=artist_stats,original_artist_coverage=artist_coverage,
            before=coverage(artifact,old_known,old_known),existing_catalog_after=coverage(artifact,old_known,known),after=coverage(artifact,known,known),
            journeys=journeys,budget=cache.summary(),old_ledger_unchanged=old_hash==sha256(old_ledger),
            limitations=['Coverage is not a new accuracy evaluation','New release remains inactive','Search metadata can lag live recording lookups; exact requested IDs required'])
        if not report['old_ledger_unchanged']:raise ValueError('Old acquisition ledger changed')
        save(EVIDENCE,report);print(json.dumps(report),flush=True)
    finally:
        cache.close()


if __name__=='__main__':run()
