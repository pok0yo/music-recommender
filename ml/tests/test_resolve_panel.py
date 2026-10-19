import unittest
import io
from urllib.error import HTTPError
from unittest.mock import patch, Mock

from ml.resolve_panel import candidates
from ml import resolve_panel


class PanelResolutionTests(unittest.TestCase):
    def test_identity_not_search_score_or_artist_name(self):
        entries = [dict(id="original", title="ＴＩＴＬＥ", **{"artist-credit":[{"artist":{"id":"wanted"}}]}),
                   dict(id="wrong-artist",title="title",score=100, **{"artist-credit":[{"artist":{"id":"other"}}]}),
                   dict(id="live",title="title (live)", **{"artist-credit":[{"artist":{"id":"wanted"}}]}),
                   dict(id="ambiguous",title="title",disambiguation="different version",
                        **{"artist-credit":[{"artist":{"id":"wanted"}}]})]
        matches = candidates({"recordings":entries},"wanted","Title")
        self.assertEqual([r["id"] for r in matches],["original","ambiguous"])
        self.assertEqual(matches[1]["disambiguation"],"different version")

    def test_transient_retries_are_charged_and_bounded(self):
        error=lambda:HTTPError("https://musicbrainz.org",503,"unavailable",{},None)
        with patch.object(resolve_panel,"reserve_transfer") as reserve, patch.object(resolve_panel.time,"sleep"), patch.object(
                resolve_panel,"urlopen",side_effect=[error(),io.BytesIO(b'{"recordings":[]}' )]):
            self.assertEqual(resolve_panel.fetch(Mock(),"https://musicbrainz.org"),b'{"recordings":[]}')
            self.assertEqual(reserve.call_count,2)
        with patch.object(resolve_panel,"reserve_transfer") as reserve, patch.object(resolve_panel.time,"sleep"), patch.object(
                resolve_panel,"urlopen",side_effect=[error(),error(),error()]) as request:
            with self.assertRaises(HTTPError):
                resolve_panel.fetch(Mock(),"https://musicbrainz.org")
            self.assertEqual((reserve.call_count,request.call_count),(3,3))


if __name__ == "__main__":
    unittest.main()
