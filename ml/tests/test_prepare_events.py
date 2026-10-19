from datetime import datetime, timezone
import unittest

import pyarrow as pa

from ml.prepare_events import Cleaner, START, END, TRAIN_END, VALIDATION_END, SPLITS, partition

A = "12345678-abcd-abcd-abcd-123456789abc"
B = "12345678-abcd-abcd-abcd-123456789abd"


def events(rows):
    users, ids, dates, created = zip(*rows)
    return pa.table({"user_id":pa.array(users,pa.int64()), "recording_mbid":pa.array(ids,pa.string()),
                     "listened_at":pa.array(dates,pa.timestamp("ns")),
                     "created":pa.array(created,pa.timestamp("ns"))})


class PreparationTests(unittest.TestCase):
    def test_canonical_ids_exclusions_and_duplicate_crossing_empty_batch(self):
        cleaner=Cleaner()
        first=cleaner.clean(events([(1,A,START-1,START), (0,A,START,START),
                                   (1,None,START,START), (1,"bad",START,START),
                                   (1," "+A.upper()+" ",START,START+7),
                                   (1,A,START,START+8)]))
        self.assertEqual(first["recording_mbid"].to_pylist(),[A])
        self.assertEqual(first["created"].cast(pa.int64()).to_pylist(),[START+7])
        cleaner.clean(events([(2,None,START,START)]))
        second=cleaner.clean(events([(1,A,START,START+9), (2,B,START,START),
                                    (1,A,START+1,START+1), (1,A,END,END)]))
        self.assertEqual(second["recording_mbid"].to_pylist(),[B,A])
        counts=cleaner.counts
        self.assertEqual(counts["excluded_duplicate"],2)
        self.assertEqual(counts["normalized_id_rows"],1)
        self.assertEqual(counts["excluded_missing_recording"],2)
        self.assertEqual(counts["excluded_outside_interval"],2)
        self.assertEqual(counts["output_rows"]+sum(v for k,v in counts.items() if k.startswith("excluded_")),counts["input_rows"])

    def test_split_boundaries_and_heldout_changes_do_not_change_train(self):
        dates=[START,TRAIN_END-1,TRAIN_END,VALIDATION_END-1,VALIDATION_END,END-1]
        source=events([(1,A,date,date) for date in dates])
        original=partition(Cleaner().clean(source))
        changed=events([(1,A,date,date) if date<TRAIN_END else (999,B,date,date+100)
                        for date in dates])
        modified=partition(Cleaner().clean(changed))
        self.assertTrue(original["train"].equals(modified["train"]))
        self.assertEqual({k:len(v) for k,v in original.items()},{"train":2,"validation":2,"test":2})
        expected={"train":("2026-02-01","2026-08-01"),"validation":("2026-08-01","2026-08-29"),
                  "test":("2026-08-29","2026-09-26")}
        for name,bounds in SPLITS.items():
            self.assertEqual(tuple(datetime.fromtimestamp(x/1e9,timezone.utc).date().isoformat() for x in bounds),expected[name])

    def test_chronology_and_required_fields_fail_closed(self):
        with self.assertRaises(ValueError):
            Cleaner().clean(events([(1,A,START+1,START),(1,B,START,START)]))
        cleaner=Cleaner()
        cleaner.clean(events([(1,A,START+1,START)]))
        with self.assertRaises(ValueError):
            cleaner.clean(events([(2,B,START,START)]))
        with self.assertRaises(ValueError):
            Cleaner().clean(events([(1,A,None,START)]))


if __name__ == "__main__":
    unittest.main()
