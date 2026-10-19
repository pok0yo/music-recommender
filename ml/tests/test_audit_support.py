import io
import json
import sqlite3
import unittest

import pyarrow as pa

from ml.audit_support import Queries, create_tables, add_training, finish_training, panel_support
from ml.prepare_events import SPLITS, DAY


class SupportTests(unittest.TestCase):
    def test_binary_train_counts_and_neighbor_thresholds(self):
        db=sqlite3.connect(":memory:")
        create_tables(db)
        pairs={"A":range(1,6), "B":[1,2,3,6,7], "C":[1,2,8,9,10],
               "D":[1,2,3], "E":[1,2,3,4,8], "F":range(1,6)}
        rows=[(r,u) for r,users in pairs.items() for u in users]
        rows += [("A",1)]*5
        table=pa.table({"recording_mbid":[r for r,u in rows],"user_id":[u for r,u in rows],
                        "listened_at":pa.array([SPLITS["train"][0]]*len(rows),type=pa.timestamp("ns"))})
        add_training(db,table)
        stats=finish_training(db)
        self.assertEqual(stats["eligible_recordings"],5)
        result=panel_support(db,[dict(artist="Artist",title="Song",resolved_recording_mbid="A"),
                                 dict(artist="Other",title="Unresolved",resolved_recording_mbid=None)])
        self.assertEqual(result[0]["training_listeners"],5)
        self.assertEqual(result[0]["qualifying_neighbors"],3)
        self.assertTrue(result[0]["supported"])
        self.assertFalse(result[1]["supported"])
        future=table.set_column(2,"listened_at",pa.array([SPLITS["train"][1]]*len(rows),type=pa.timestamp("ns")))
        with self.assertRaises(ValueError):
            add_training(db,future)
        self.assertEqual(db.execute("SELECT listeners FROM support WHERE recording='A'").fetchone()[0],5)
        db.close()

    def test_first_seed_ties_boundaries_and_exclusion_denominators(self):
        start,end=SPLITS["validation"]
        query=Queries(start,end)
        query.add([1,2,3],["b","z","a"],[start]*3)
        query.add([1],["a"],[start])
        query.add([1,1,2],["b","b","outside"],[start+1]*3)
        query.add([1],["a"],[start+2])
        query.add([1],["too-late"],[start+7*DAY])
        query.add([4],["a"],[start+21*DAY])
        output=io.StringIO()
        result=query.summarize({"a","b"},output)
        self.assertEqual(result["active_window_listeners"],4)
        self.assertEqual(result["constructed_queries"],3)
        self.assertEqual(result["listeners_without_seed_in_first_21_days"],1)
        self.assertEqual(result["unsupported_seed_queries"],1)
        self.assertEqual(result["zero_target_queries"],1)
        self.assertEqual(result["all_targets_outside_catalog_queries"],1)
        self.assertEqual(result["scorable_queries"],1)
        self.assertEqual((result["target_pairs"],result["in_catalog_target_pairs"]),(2,1))
        rows=[json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual((rows[0]["seed"],rows[0]["targets"]),("a",["b"]))
        self.assertFalse(result["gate_pass"])

    def test_query_rejects_wrong_window_and_out_of_order_input(self):
        start,end=SPLITS["test"]
        query=Queries(start,end)
        with self.assertRaises(ValueError):
            query.add([1],["a"],[end])
        query.add([1],["a"],[start+1])
        with self.assertRaises(ValueError):
            query.add([1],["b"],[start])


if __name__=="__main__":
    unittest.main()
