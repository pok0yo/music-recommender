"""Allowlisted recording destinations and an optional version-pinned link release."""

import json
import re
from urllib.parse import urlsplit, parse_qs, urlencode

from ml.audit_support import sha256


def destination(url):
    try:
        p=urlsplit(url)
        if p.scheme!='https' or p.username or p.password or p.port or p.fragment:return None
        query=parse_qs(p.query)
        if p.netloc=='open.spotify.com':
            match=re.fullmatch(r'/(?:intl-[a-z]{2}/)?track/([A-Za-z0-9]{22})',p.path)
            if match:return 'spotify',match[1],'https://open.spotify.com/track/'+match[1]
        if p.netloc=='music.apple.com':
            match=re.fullmatch(r'/[a-z]{2}/song/(?:[^/]+/)?([0-9]+)',p.path)
            if match:return 'apple_music',match[1],url
            if re.fullmatch(r'/[a-z]{2}/album/[^/]+/[0-9]+',p.path) and len(query.get('i',[]))==1 and re.fullmatch(r'[0-9]+',query['i'][0]):
                return 'apple_music',query['i'][0],p._replace(query=urlencode({'i':query['i'][0]})).geturl()
        if p.netloc=='music.youtube.com' and p.path=='/watch' and len(query.get('v',[]))==1 and re.fullmatch(r'[A-Za-z0-9_-]{11}',query['v'][0]):
            return 'youtube_music',query['v'][0],'https://music.youtube.com/watch?'+urlencode({'v':query['v'][0]})
    except (ValueError,TypeError):pass
    return None


def load_release(catalog, path):
    from pathlib import Path
    from backend.schemas import ListeningLink
    release=json.loads(Path(path).read_text(encoding='utf-8'))
    if release['catalog_version']!=catalog.release['catalog_version']:raise ValueError('Links target a different catalog')
    metadata=catalog.query('SELECT * FROM music_catalog.link_releases WHERE version=%s',(release['links_version'],))
    if len(metadata)!=1 or any(metadata[0][key]!=release[key] for key in ('catalog_version','content_sha256','link_count')):raise ValueError('Link release metadata differs')
    rows=catalog.query('SELECT recording_id,canonical_recording_id,payload FROM music_catalog.recording_links WHERE version=%s ORDER BY recording_id,provider',(release['links_version'],))
    payloads=[dict(recording_id=str(r['recording_id']),canonical_recording_id=str(r['canonical_recording_id']),**r['payload']) for r in rows]
    from backend.catalog import content_hash
    if len(rows)!=release['link_count'] or content_hash(payloads)!=release['content_sha256']:raise ValueError('Link release contents differ')
    result={}
    for row in payloads:
        link=ListeningLink.model_validate({k:v for k,v in row.items() if k not in ('recording_id','canonical_recording_id')})
        source=catalog.get(row['recording_id'])
        if not source or str(source['canonical_recording_id'])!=row['canonical_recording_id']:raise ValueError('Link identity differs')
        result.setdefault(row['recording_id'],[]).append(link.model_dump(mode='json'))
    return result


def import_release():
    from pathlib import Path
    import psycopg
    from psycopg.types.json import Jsonb
    from backend.catalog import Catalog,content_hash
    from backend.schemas import ListeningLink
    root=Path('data/processed/listening-links-v1')
    report=json.loads(Path('docs/evidence/listening-links-pilot.json').read_text(encoding='utf-8'))
    release=json.loads((root/'release.json').read_text(encoding='utf-8'))
    if not report['complete'] or release!=report['release'] or sha256(root/'links.json')!=report['links_file_sha256'] or sha256(root/'provenance.json')!=report['provenance_sha256']:raise ValueError('Link preparation differs')
    rows=json.loads((root/'links.json').read_text(encoding='utf-8'))
    if len(rows)!=release['link_count'] or content_hash(rows)!=release['content_sha256']:raise ValueError('Link contents differ')
    active=json.loads(Path('data/processed/catalog-expansion-v2/release.json').read_text())
    if active['catalog_version']!=release['catalog_version']:raise ValueError('Catalog binding differs')
    connections=json.loads(Path('artifacts/local-postgres/connections.json').read_text())
    catalog=Catalog(connections['reader'],active);catalog.check(full=True)
    if len({(r['recording_id'],r['provider']) for r in rows})!=len(rows):raise ValueError('Duplicate provider link')
    for row in rows:
        ListeningLink.model_validate({k:v for k,v in row.items() if k not in ('recording_id','canonical_recording_id')})
        track=catalog.get(row['recording_id'])
        if not track or track['canonical_recording_id']!=row['canonical_recording_id']:raise ValueError('Recording identity differs')
    with psycopg.connect(connections['admin']) as db:
        db.execute(Path('backend/listening_links.sql').read_text())
        existing=db.execute('SELECT content_sha256 FROM music_catalog.link_releases WHERE version=%s',(release['links_version'],)).fetchone()
        if existing and existing[0]!=release['content_sha256']:raise ValueError('Refusing to replace link release')
        if not existing:
            db.execute('INSERT INTO music_catalog.link_releases VALUES (%s,%s,%s,%s)',(release['links_version'],release['catalog_version'],release['content_sha256'],release['link_count']))
            for row in rows:
                payload={k:v for k,v in row.items() if k not in ('recording_id','canonical_recording_id')}
                db.execute('INSERT INTO music_catalog.recording_links VALUES (%s,%s,%s,%s,%s)',(release['links_version'],row['recording_id'],row['canonical_recording_id'],row['provider'],Jsonb(payload)))
    load_release(catalog,root/'release.json')
    print(json.dumps(dict(imported=True,activated=False,**release)))


if __name__=='__main__':import_release()
