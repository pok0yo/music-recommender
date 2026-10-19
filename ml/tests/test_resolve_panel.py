import unittest

from ml.resolve_panel import candidates


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


if __name__ == "__main__":
    unittest.main()
