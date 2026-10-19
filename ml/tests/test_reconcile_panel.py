import unittest

from ml.reconcile_panel import identity, redirects


class IdentityTests(unittest.TestCase):
    def test_redirect_inventory_requires_complete_stable_targets(self):
        a="11111111-1111-4111-8111-111111111111"
        b="22222222-2222-4222-8222-222222222222"
        report=dict(complete=True,inventory_count=2,lookups=[
            dict(requested_mbid=a,canonical_mbid=b,redirected=True),
            dict(requested_mbid=b,canonical_mbid=b,redirected=False)])
        self.assertEqual(redirects(report),{a:b})
        with self.assertRaises(ValueError):
            redirects({**report,"complete":False})
        with self.assertRaises(ValueError):
            redirects({**report,"inventory_count":1,"lookups":report["lookups"][:1]})
        with self.assertRaises(ValueError):
            redirects({**report,"lookups":[report["lookups"][0]]*2})

    def test_authoritative_id_only_establishes_redirect(self):
        old="11111111-1111-4111-8111-111111111111"
        new="22222222-2222-4222-8222-222222222222"
        response=dict(id=new,title="Song",isrcs=["USAAA2600001"],
                      **{"artist-credit":[{"artist":{"id":old}}]})
        self.assertTrue(identity(old,response)["redirected"])
        self.assertFalse(identity(new,response)["redirected"])
        with self.assertRaises(ValueError):
            identity(old,{**response,"id":"invalid"})
        with self.assertRaises(ValueError):
            identity(old,{**response,"artist-credit":[]})


if __name__=="__main__":
    unittest.main()
