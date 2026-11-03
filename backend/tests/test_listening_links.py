from copy import deepcopy
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from backend.catalog import Catalog,content_hash
from backend.listening_links import destination,load_release,import_release
from backend.schemas import Track,ListeningLink
from backend.prepare_listening_links import probe
from backend.metadata_cache import MetadataCache
from backend.tests.test_api import track,SEED,NEIGHBOR,FixtureCatalog,FixtureArtifact,RELEASE
from backend.main import create_app
from fastapi.testclient import TestClient

URL='https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6'
LINK=dict(provider='spotify',url=URL,verified_at='2026-10-28T20:00:00+00:00',verification='recording_relationship_and_destination')


class ListeningTests(unittest.TestCase):
    def test_rebound_import_preserves_provenance_and_refuses_version_rebinding(self):
        from ml.audit_support import sha256
        with TemporaryDirectory() as directory:
            old=Path.cwd();os.chdir(directory)
            try:
                root=Path('candidate');root.mkdir();pilot=Path('data/processed/listening-links-v1');pilot.mkdir(parents=True)
                Path('backend').mkdir();Path('backend/listening_links.sql').write_text('fixture schema')
                proof=Path('docs/evidence/listening-links-pilot.json');proof.parent.mkdir(parents=True)
                row=dict(recording_id=SEED,canonical_recording_id=SEED,**LINK)
                (root/'links.json').write_text(json.dumps([row]));(root/'recordings.json').write_text(json.dumps([track(SEED)]))
                (pilot/'provenance.json').write_text('verified original provenance')
                catalog={'catalog_version':'candidate'};catalog_path=root/'catalog.json';catalog_path.write_text(json.dumps(catalog))
                release=dict(links_version='links-new',catalog_version='candidate',content_sha256=content_hash([row]),link_count=1)
                (root/'release.json').write_text(json.dumps(release))
                original=dict(complete=True,release=dict(release,links_version='old',catalog_version='old'),links_file_sha256=sha256(root/'links.json'),provenance_sha256=sha256(pilot/'provenance.json'))
                proof.write_text(json.dumps(original))
                report=dict(complete=True,link_release=release,new_release=catalog,links_file_sha256=original['links_file_sha256'],catalog_sha256=sha256(root/'recordings.json'))
                receipt=root/'receipt.json';receipt.write_text(json.dumps(report))
                with patch('backend.catalog.operator_connections',return_value={'admin':'writer','reader':'reader'}),patch('backend.catalog.Catalog') as source,patch('psycopg.connect') as connect,patch('backend.listening_links.load_release'):
                    source.return_value.get_many.return_value={SEED:track(SEED)}
                    db=connect.return_value.__enter__.return_value
                    db.execute.return_value.fetchone.return_value=None
                    import_release(root,receipt,catalog_path)
                    source.return_value.get_many.assert_called_once_with([SEED])
                    db.execute.return_value.fetchone.return_value=('old',release['content_sha256'],1)
                    with self.assertRaisesRegex(ValueError,'Refusing to replace'):import_release(root,receipt,catalog_path)
                    connect.reset_mock()
                    receipt.write_text(json.dumps(dict(report,complete=False)))
                    with self.assertRaises(ValueError):import_release(root,receipt,catalog_path)
                    connect.assert_not_called()
                    receipt.write_text(json.dumps(report));(pilot/'provenance.json').write_text('tampered')
                    with self.assertRaisesRegex(ValueError,'provenance'):import_release(root,receipt,catalog_path)
                    connect.assert_not_called()
            finally:os.chdir(old)

    def test_pilot_import_rejects_duplicate_providers_and_wrong_canonical_identity(self):
        from ml.audit_support import sha256
        with TemporaryDirectory() as directory:
            root=Path(directory);catalog_path=root/'catalog.json';catalog_path.write_text(json.dumps({'catalog_version':'catalog'}))
            provenance=root/'provenance.json';provenance.write_text('provenance')
            row=dict(recording_id=SEED,canonical_recording_id=SEED,**LINK)
            with patch('backend.catalog.operator_connections',return_value={'admin':'writer','reader':'reader'}),patch('backend.catalog.Catalog') as source,patch('psycopg.connect') as connect:
                source.return_value.get_many.return_value={SEED:dict(track(SEED),canonical_recording_id=NEIGHBOR)}
                for rows,message in [([row,row],'Duplicate provider'),([row],'Recording identity')]:
                    (root/'links.json').write_text(json.dumps(rows))
                    release=dict(links_version='test',catalog_version='catalog',content_sha256=content_hash(rows),link_count=len(rows))
                    (root/'release.json').write_text(json.dumps(release))
                    receipt=root/'receipt.json';receipt.write_text(json.dumps(dict(complete=True,release=release,links_file_sha256=sha256(root/'links.json'),provenance_sha256=sha256(provenance))))
                    with self.assertRaisesRegex(ValueError,message):import_release(root,receipt,catalog_path)
                    connect.assert_not_called()

    def test_api_carries_optional_links_and_preserves_model_rank(self):
        catalog=FixtureCatalog();catalog.records[NEIGHBOR]['listening_links']=[LINK]
        with TestClient(create_app(catalog,FixtureArtifact(),RELEASE)) as client:
            result=client.get('/v1/recommendations/'+SEED).json()['results'][0]
            self.assertEqual(result['rank'],1)
            self.assertEqual(result['recording_id'],NEIGHBOR)
            expected=ListeningLink.model_validate(LINK).model_dump(mode='json')
            self.assertEqual(result['listening_links'],[expected])
            self.assertEqual(client.get('/v1/catalog/search?q=Fixture').json()['results'][1]['listening_links'],[expected])

    def test_invalid_configured_link_release_fails_closed(self):
        with patch.dict('os.environ',{'LISTENING_LINKS_RELEASE':'invalid'}),patch('backend.listening_links.load_release',side_effect=ValueError('bad binding')):
            with TestClient(create_app(FixtureCatalog(),FixtureArtifact(),RELEASE)) as client:
                self.assertEqual(client.get('/health/ready').status_code,503)
                self.assertEqual(client.get('/v1/catalog/starters').status_code,503)

    def test_exact_provider_shapes_and_unsafe_or_album_only_urls(self):
        for value,provider in [(URL,'spotify'),('https://music.apple.com/us/album/song/123?i=456','apple_music'),('https://music.apple.com/us/song/song/456','apple_music'),('https://music.youtube.com/watch?v=abcdefghijk','youtube_music')]:
            self.assertEqual(destination(value)[0],provider)
        for value in ['javascript:alert(1)','http://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6','https://open.spotify.com.evil.test/track/6rqhFgbbKwnb9MLmUQDhG6','https://evil@open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6','https://music.apple.com/us/album/song/123','https://music.youtube.com/watch?v=abcdefghijk&v=12345678901','https://open.spotify.com/playlist/6rqhFgbbKwnb9MLmUQDhG6','https://youtube.com/watch?v=abcdefghijk']:
            self.assertIsNone(destination(value),value)

    def test_contract_and_derived_links_never_change_frozen_payload(self):
        original=track(SEED);before=content_hash([original]);catalog=Catalog('unused',{})
        catalog.listening_links={SEED:[LINK]}
        self.assertEqual(catalog.present(original)['listening_links'],[LINK])
        self.assertEqual(content_hash([original]),before)
        self.assertEqual(Track.model_validate(original).listening_links,[])
        with self.assertRaises(ValueError):ListeningLink.model_validate(dict(LINK,provider='youtube_music'))
        with self.assertRaises(ValueError):ListeningLink.model_validate(dict(LINK,verified_at='tomorrow'))
        with self.assertRaises(ValueError):Track.model_validate(dict(original,listening_links=[LINK,LINK]))

    def test_link_release_binding_hash_and_canonical_identity(self):
        row=dict(recording_id=SEED,canonical_recording_id=SEED,**LINK)
        release=dict(links_version='links-test',catalog_version='catalog-test',content_sha256=content_hash([row]),link_count=1)
        class Source:
            release={'catalog_version':'catalog-test'}
            def query(self,statement,parameters):
                if 'link_releases' in statement:return [release]
                return [dict(recording_id=SEED,canonical_recording_id=SEED,payload=LINK)]
            def get_many(self,recordings):return {SEED:track(SEED)}
        with TemporaryDirectory() as directory:
            path=Path(directory)/'release.json';path.write_text(json.dumps(release))
            source=Source()
            with patch.object(source,'get_many',wraps=source.get_many) as batch:
                self.assertEqual(load_release(source,path)[SEED][0]['url'],URL)
                batch.assert_called_once_with([SEED])
            path.write_text(json.dumps(dict(release,catalog_version='wrong')))
            with self.assertRaises(ValueError):load_release(Source(),path)
            path.write_text(json.dumps(dict(release,content_sha256='wrong')))
            with self.assertRaises(ValueError):load_release(Source(),path)
            path.write_text(json.dumps(release));source.get_many=lambda recordings:{}
            with self.assertRaisesRegex(ValueError,'Link identity'):load_release(source,path)

    def test_provider_redirect_cannot_change_recording_or_escape_host(self):
        from urllib.error import HTTPError
        for target in ['https://example.com/track/6rqhFgbbKwnb9MLmUQDhG6','https://open.spotify.com/track/1234567890123456789012']:
            with TemporaryDirectory() as directory:
                cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output',allowed_url=lambda value:destination(value) is not None)
                cache.db.execute('CREATE TABLE provider_checks(url TEXT PRIMARY KEY,result TEXT)');cache.db.commit()
                with patch('backend.prepare_listening_links.build_opener') as opener,patch('backend.prepare_listening_links.time.sleep'):
                    opener.return_value.open.side_effect=HTTPError(URL,302,'moved',{'Location':target},None)
                    result=probe(cache,URL)
                    self.assertFalse(result['reachable']);self.assertEqual(opener.return_value.open.call_count,1)
                cache.close()

    def test_retry_archives_failure_and_reuses_success_without_new_requests(self):
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output',allowed_url=lambda value:destination(value) is not None)
            cache.db.execute('CREATE TABLE provider_checks(url TEXT PRIMARY KEY,result TEXT)')
            cache.db.execute('INSERT INTO provider_checks VALUES (?,?)',(URL,json.dumps(dict(reachable=False,reason='network_unconfirmed'))));cache.db.commit()
            with patch('backend.prepare_listening_links.build_opener') as opener,patch('backend.prepare_listening_links.time.sleep'):
                response=opener.return_value.open.return_value.__enter__.return_value
                response.status=200;response.read.return_value=b'prefix'
                self.assertFalse(probe(cache,URL)['reachable']);self.assertEqual(opener.return_value.open.call_count,0)
                self.assertTrue(probe(cache,URL,retry_unconfirmed=True)['reachable'])
                self.assertTrue(probe(cache,URL)['reachable']);self.assertEqual(opener.return_value.open.call_count,1)
            self.assertEqual(cache.db.execute('SELECT count(*) FROM requests').fetchone()[0],1)
            self.assertEqual(cache.db.execute('SELECT count(*) FROM provider_check_history').fetchone()[0],1)
            cache.close()
