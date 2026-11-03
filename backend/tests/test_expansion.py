import hashlib
import gzip
import io
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from uuid import UUID

import numpy as np

from backend.expand_catalog import payload, select, coverage, unique_recordings
from backend.metadata_cache import MetadataCache, DOWNLOAD_CAP, DISK_CAP, RESPONSE_LIMIT, OVERHEAD


class ExpansionTests(unittest.TestCase):
    def test_repair_import_accepts_nested_model_binding_and_rejects_conflicts_before_writing(self):
        from backend.catalog import import_catalog,content_hash
        from backend.tests.test_api import track,SEED
        from ml.audit_support import sha256
        with TemporaryDirectory() as directory:
            old=Path.cwd();os.chdir(directory)
            try:
                root=Path('candidate');root.mkdir();docs=Path('docs/evidence');docs.mkdir(parents=True)
                Path('backend').mkdir();Path('backend/schema.sql').write_text('fixture schema')
                rows=[track(SEED)];records=root/'recordings.json';records.write_text(json.dumps(rows))
                trusted='a'*64
                (docs/'stage-6-support-audit-v2.json').write_text(json.dumps({'panel':[{'recording_mbid':SEED,'supported':True}]}))
                (docs/'stage-7-decision.json').write_text(json.dumps({'evidence_sha256':{'stage-7-artifact-manifest.json':trusted}}))
                release=dict(catalog_version='repair',content_sha256=content_hash(rows),recording_count=1,model_manifest_sha256=trusted,data_mode='real')
                report=dict(complete=True,catalog_sha256=sha256(records),new_release=release)
                receipt=root/'receipt.json';receipt.write_text(json.dumps(report))
                with patch('ml.serving_artifact.Artifact') as artifact,patch('backend.catalog.operator_connections',return_value={'admin':'writer','reader':'reader'}),patch('backend.catalog.psycopg.connect') as connect,patch('backend.catalog.Catalog.check'):
                    artifact.return_value.arrays={'ids':np.array([SEED],dtype='S36')}
                    db=connect.return_value.__enter__.return_value
                    db.info.dbname='fixture'
                    db.execute.return_value.fetchone.return_value=None
                    import_catalog(root,receipt)
                    self.assertEqual(json.loads((root/'release.json').read_text()),release)
                    db.execute.return_value.fetchone.return_value=(trusted,release['content_sha256'],2)
                    with self.assertRaisesRegex(ValueError,'refusing overwrite'):import_catalog(root,receipt)
                    connect.reset_mock()
                    receipt.write_text(json.dumps(dict(report,artifact_manifest_sha256='b'*64)))
                    with self.assertRaisesRegex(ValueError,'model binding'):import_catalog(root,receipt)
                    connect.assert_not_called()
                    receipt.write_text(json.dumps(report))
                    (root/'release.json').write_text(json.dumps(dict(release,data_mode='demo')))
                    with self.assertRaisesRegex(ValueError,'Existing prepared manifest'):import_catalog(root,receipt)
                    connect.assert_not_called()
            finally:os.chdir(old)

    def test_search_keeps_source_spelling_and_accepts_unaccented_artist_names(self):
        from backend.catalog import search_text
        row=dict(title='Café',artist_credits=[dict(name='GIVĒON')])
        self.assertIn('giveon',search_text(row));self.assertIn('givēon',search_text(row))
        self.assertEqual(row['artist_credits'][0]['name'],'GIVĒON')

    def test_verified_aliases_preserve_existing_model_identity_and_distinct_versions(self):
        rows=[dict(recording_id='old',canonical_recording_id='new',disambiguation=None),
              dict(recording_id='new',canonical_recording_id='new',disambiguation=None),
              dict(recording_id='live',canonical_recording_id='live',disambiguation='live')]
        kept,excluded=unique_recordings(rows,{'old'})
        self.assertEqual({r['recording_id'] for r in kept},{'old','live'})
        self.assertEqual(excluded[0]['retained_model_recording_id'],'old')

    def test_budget_survives_resume_and_invalid_hosts_cannot_spend(self):
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            source='https://musicbrainz.org/ws/2/recording/?fmt=json'
            with self.assertRaises(ValueError):cache.reserve('https://example.com/ws/2/recording/')
            with patch.object(cache,'disk_bytes',return_value=DISK_CAP):
                with self.assertRaises(ValueError):cache.reserve(source)
            self.assertEqual(cache.summary()['requests'],0)
            cache.reserve(source)
            cache.close()
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            self.assertEqual(cache.summary()['reserved_bytes'],RESPONSE_LIMIT+1+OVERHEAD)
            with cache.db:
                cache.db.execute('INSERT INTO requests(url,reserved,started) VALUES (?,?,?)',(source,DOWNLOAD_CAP,0))
            count=cache.summary()['requests']
            with self.assertRaises(ValueError):cache.reserve(source)
            self.assertEqual(cache.summary()['requests'],count)
            cache.close()

    def test_checksum_cache_needs_no_network_and_detects_tampering(self):
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            body=b'{"recordings":[]}';source='https://musicbrainz.org/ws/2/recording/?fmt=json'
            with cache.db:cache.db.execute('INSERT INTO responses VALUES (?,?,?)',(source,body,hashlib.sha256(body).hexdigest()))
            with patch('backend.metadata_cache.build_opener',side_effect=AssertionError('network')):
                self.assertEqual(cache.get(source)[0],json.loads(body))
            with cache.db:cache.db.execute('UPDATE responses SET body=?',(b'{}',))
            with self.assertRaises(ValueError):cache.get(source)
            cache.close()

    def test_selection_preserves_connected_journeys_and_exact_model_ids(self):
        ids=[str(UUID(int=i)) for i in range(1,10)]
        class Artifact:
            arrays=dict(ids=np.array(ids,dtype='S36'),neighbors=np.array([[min(i+1,8)] for i in range(9)]),support=np.ones(9))
            def recommend(self,recording):return dict(items=[dict(recording_mbid=ids[min(ids.index(recording)+1,8)])])
        artifact=Artifact()
        chosen=select(artifact,{ids[0]},{ids[0]},{ids[7]},target=8)
        self.assertTrue(set(ids[:5]+[ids[7]])<=set(chosen))
        self.assertEqual(len(chosen),8)
        self.assertEqual(coverage(artifact,{ids[0]},set(chosen))['missing_metadata_positions'],0)
        with self.assertRaises(ValueError):select(artifact,{ids[0]},set(),set(),target=2)

    def test_metadata_validation_preserves_versions_and_rejects_bad_credits(self):
        recording=str(UUID(int=1));artist=str(UUID(int=2))
        raw=dict(id=recording,title='Song',disambiguation='live',**{'artist-credit':[dict(name='Artist',artist=dict(id=artist))]})
        self.assertEqual(payload(raw,recording,'https://musicbrainz.org/','hash')['disambiguation'],'live')
        raw['artist-credit']=[]
        with self.assertRaises(ValueError):payload(raw,recording,'https://musicbrainz.org/','hash')

    def test_compressed_response_is_bounded_and_cached_by_decoded_hash(self):
        body=b'{"recordings":[]}'
        class Response(io.BytesIO):
            headers={'Content-Encoding':'gzip'}
        class Opener:
            def open(self,*args,**kwargs):return Response(gzip.compress(body))
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            with patch('backend.metadata_cache.build_opener',return_value=Opener()):
                value,digest=cache.get('https://musicbrainz.org/ws/2/recording/?fmt=json')
            self.assertEqual(value,json.loads(body));self.assertEqual(digest,hashlib.sha256(body).hexdigest())
            self.assertEqual(cache.summary()['received_body_bytes'],len(gzip.compress(body)))
            cache.close()

    def test_expanded_response_overflow_stops_without_a_valid_cache_receipt(self):
        class Response(io.BytesIO):headers={'Content-Encoding':'gzip'}
        class Opener:
            def open(self,*args,**kwargs):return Response(gzip.compress(b'{"recordings":[]}'))
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            with patch('backend.metadata_cache.build_opener',return_value=Opener()),patch('backend.metadata_cache.EXPANDED_LIMIT',8):
                with self.assertRaises(ValueError):cache.get('https://musicbrainz.org/ws/2/recording/?fmt=json')
            self.assertEqual(cache.db.execute('SELECT count(*) FROM responses').fetchone()[0],0)
            self.assertEqual(cache.summary()['requests'],1)
            cache.close()

    def test_failed_attempt_remains_charged_and_retries_honor_backoff(self):
        from urllib.error import HTTPError
        class Response(io.BytesIO):headers={}
        class Opener:
            attempts=0
            def open(self,*args,**kwargs):
                self.attempts+=1
                if self.attempts==1:raise HTTPError('https://musicbrainz.org/',503,'busy',{'Retry-After':'2'},None)
                return Response(b'{}')
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            with patch('backend.metadata_cache.build_opener',return_value=Opener()),patch('backend.metadata_cache.time.sleep') as sleep:
                cache.get('https://musicbrainz.org/ws/2/recording/?fmt=json')
                sleep.assert_any_call(2)
            self.assertEqual(cache.summary()['requests'],2)
            self.assertEqual(cache.summary()['reserved_bytes'],2*(RESPONSE_LIMIT+1+OVERHEAD))
            cache.close()

    def test_import_rejects_incomplete_or_mismatched_release_before_connecting(self):
        from backend.catalog import import_catalog,content_hash
        from ml.audit_support import sha256
        with TemporaryDirectory() as directory:
            root=Path(directory);records=root/'recordings.json';report=root/'report.json'
            records.write_text('[]')
            with patch('backend.catalog.psycopg.connect',side_effect=AssertionError('database')):
                report.write_text(json.dumps(dict(complete=False,catalog_sha256=sha256(records))))
                with self.assertRaises(ValueError):import_catalog(root,report)
                report.write_text(json.dumps(dict(complete=True,catalog_sha256='incorrect')))
                with self.assertRaises(ValueError):import_catalog(root,report)
                report.write_text(json.dumps(dict(complete=True,catalog_sha256=sha256(records),artifact_manifest_sha256='incorrect',
                    new_release=dict(catalog_version='catalog-v2-test',content_sha256=content_hash([]),recording_count=1))))
                with self.assertRaises(ValueError):import_catalog(root,report)

    def test_redirects_are_charged_cached_and_restricted_to_recording_api(self):
        from urllib.error import HTTPError
        source='https://musicbrainz.org/ws/2/recording/old?fmt=json'
        target='https://musicbrainz.org/ws/2/recording/new?fmt=json'
        class Response(io.BytesIO):headers={}
        class Opener:
            def open(self,request,**kwargs):
                if request.full_url==source:raise HTTPError(source,301,'merged',{'Location':target},None)
                return Response(b'{}')
        with TemporaryDirectory() as directory:
            cache=MetadataCache(Path(directory)/'cache',Path(directory)/'output')
            with patch('backend.metadata_cache.build_opener',return_value=Opener()),patch('backend.metadata_cache.time.sleep'):
                self.assertEqual(cache.get(source)[0],{})
            self.assertEqual(cache.summary()['requests'],2)
            with patch('backend.metadata_cache.build_opener',side_effect=AssertionError('network')):
                self.assertEqual(cache.get(source)[0],{})
            with patch('backend.metadata_cache.build_opener') as opener,patch('backend.metadata_cache.time.sleep'):
                opener.return_value.open.side_effect=HTTPError(source,301,'bad',{'Location':'https://example.com/recording'},None)
                with self.assertRaises(ValueError):cache.get(source+'&other=1')
                self.assertEqual(opener.return_value.open.call_count,1)
            cache.close()
