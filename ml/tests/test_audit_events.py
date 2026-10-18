import unittest

import pyarrow as pa

from ml.audit_events import audit

A="11111111-1111-1111-1111-111111111111"
R="22222222-2222-2222-2222-222222222222"


def events():
    return pa.table({
        "listened_at":pa.array([1,1,2,3,4],type=pa.timestamp("s")),
        "created":pa.array([2,2,1,90000,5],type=pa.timestamp("s")),
        "user_id":[10,10,20,30,40],
        "recording_mbid":[R,R,None,"bad-id",R],
        "artist_credit_mbids":[[A],[A],None,[A],[]],
        "artist_name":["Alias","Alias","Different","Alias","Target"],
    })


class EventAuditTests(unittest.TestCase):
    def test_ids_duplicates_time_units_and_name_collision(self):
        result=audit(events(),[{"name":"Target","mbid":A}])
        self.assertEqual(result["valid_recording_id_rows"],3)
        self.assertEqual(result["missing_recording_id_rows"],1)
        self.assertEqual(result["malformed_recording_id_rows"],1)
        self.assertEqual(result["duplicate_mapped_user_recording_timestamp_rows"],1)
        self.assertEqual(result["created_before_listened_rows"],1)
        self.assertEqual(result["created_over_one_day_after_listened_rows"],1)
        artist=result["artist_presence"][0]
        self.assertEqual(artist["event_rows"],3)
        self.assertEqual(artist["distinct_listeners"],2)
        self.assertEqual(artist["distinct_mapped_recordings"],1)
        self.assertFalse(result["training_approved"])
        self.assertFalse(result["coverage_gate_measured"])

    def test_empty_or_null_required_data_rejected(self):
        with self.assertRaises(ValueError):
            audit(events().slice(0,0),[])
        table=events().set_column(2,"user_id",pa.array([None]*5,type=pa.int64()))
        with self.assertRaises(ValueError):
            audit(table,[])


if __name__ == "__main__":
    unittest.main()
