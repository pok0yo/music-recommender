import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from backend.catalog import content_hash
from backend.repair_catalog import RepairCache, prepare_links, select_gaps


class RepairTests(unittest.TestCase):
    def test_selection_prioritizes_original_artists_and_keeps_model_order(self):
        rows = [dict(recording_id='a',artist_credits=[dict(artist_id='other')]),
                dict(recording_id='b',artist_credits=[dict(artist_id='original')]),
                dict(recording_id='c',artist_credits=[dict(artist_id='other')])]
        class Artifact:
            def recommend(self,seed):
                return dict(items=[dict(recording_mbid=n) for n in {'a':['x','z'],'b':['y','x'],'c':['a']}[seed]])
        empty, candidates = select_gaps(Artifact(),rows,{'original'})
        self.assertEqual(empty,['b','a'])
        self.assertEqual(candidates,['y','x','z'])

    def test_disk_budget_includes_the_retained_previous_release(self):
        with TemporaryDirectory() as directory:
            root = Path(directory); previous = root/'previous'; previous.mkdir()
            (previous/'recordings.json').write_bytes(b'x'*100)
            with patch('backend.repair_catalog.BASE',previous):
                cache = RepairCache(root/'cache',root/'repair')
                try:
                    measured = sum(p.stat().st_size for parent in [root/'cache',root/'repair',previous]
                                   for p in parent.rglob('*') if p.is_file())
                    self.assertEqual(cache.disk_bytes(),measured)
                finally:cache.close()

    def test_links_receive_a_new_catalog_binding_without_inventing_destinations(self):
        row = dict(recording_id='seed',canonical_recording_id='canonical',provider='spotify',
                   url='https://open.spotify.com/track/'+'A'*22,verified_at='2026-10-28T00:00:00Z',
                   verification='recording_relationship_and_destination')
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'links.json').write_text(json.dumps([row]),encoding='utf-8')
            (root/'release.json').write_text(json.dumps(dict(content_sha256=content_hash([row]),link_count=1)),encoding='utf-8')
            records = [dict(recording_id='seed',canonical_recording_id='canonical')]
            kept, first = prepare_links(records,{'catalog_version':'v3'},root)
            _, second = prepare_links(records,{'catalog_version':'v4'},root)
            self.assertEqual(kept,[row]);self.assertNotEqual(first['links_version'],second['links_version'])
            records[0]['canonical_recording_id']='different'
            with self.assertRaises(ValueError):prepare_links(records,{'catalog_version':'v3'},root)


if __name__ == '__main__':unittest.main()
