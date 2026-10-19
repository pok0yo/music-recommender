import hashlib
import io
from pathlib import Path
import sqlite3
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import pyarrow as pa
import pyarrow.parquet as pq

from ml import acquire_events as acquire
from ml import probe_spark as probe
from ml.inspect_spark import last_member


class Response(io.BytesIO):
    status = 206

    def __init__(self, data, start, end):
        super().__init__(data)
        self.headers = {"Content-Range":f"bytes {start}-{end}/{probe.SIZE}", "ETag":probe.ETAG}


class AcquisitionTests(unittest.TestCase):
    def test_offline_cache_never_reserves_or_requests_missing_ranges(self):
        with tempfile.TemporaryDirectory() as directory:
            cache=acquire.Cache(Path(directory),probe.RangeReader(),offline=True)
            with patch.object(probe,"urlopen") as request:
                with self.assertRaises(ValueError):
                    cache.fetch(0,3)
                with self.assertRaises(ValueError):
                    cache.prefetch([(0,3)])
                request.assert_not_called()
            self.assertEqual(cache.summary()["reserved_bytes"],0)
            cache.store(0,b"abc")
            self.assertEqual(cache.fetch(0,3),b"abc")
            cache.close()

    def test_expanded_cohort_is_nested_and_invalid_size_rejected(self):
        old={u for u in range(1,1001) if acquire.cohort_user(u)}
        expanded={u for u in range(1,1001) if acquire.cohort_user(u,3)}
        self.assertLess(old,expanded)
        self.assertEqual([u for u in range(1,26) if acquire.cohort_user(u)],[3,15,21])
        self.assertEqual([u for u in range(1,26) if acquire.cohort_user(u,3)],
                         [2,3,5,8,12,14,15,17,18,21])
        with self.assertRaises(ValueError):
            acquire.cohort_user(1,10)

    def test_budget_persists_before_failed_io_and_cap_cannot_reset(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(acquire, "CAP", acquire.OVERHEAD+3):
            root = Path(directory)
            cache = acquire.Cache(root, probe.RangeReader())
            with patch.object(probe, "urlopen", side_effect=ValueError("bad range")):
                with self.assertRaises(ValueError):
                    cache.fetch(0, 3)
            self.assertEqual(cache.summary()["reserved_bytes"], acquire.CAP)
            cache.close()
            cache = acquire.Cache(root, probe.RangeReader())
            with patch.object(probe, "urlopen") as request:
                with self.assertRaises(ValueError):
                    cache.fetch(0, 1)
                request.assert_not_called()
            cache.close()
            with patch.object(acquire, "CAP", acquire.CAP+1):
                with self.assertRaises(ValueError):
                    acquire.Cache(root, probe.RangeReader())

    def test_resume_checks_hash_and_process_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cache = acquire.Cache(root, probe.RangeReader())
            with self.assertRaises(sqlite3.OperationalError):
                acquire.Cache(root, probe.RangeReader())
            with patch.object(probe, "urlopen", return_value=Response(b"abc", 0, 2)):
                self.assertEqual(cache.fetch(0, 3), b"abc")
            cache.close()
            cache = acquire.Cache(root, probe.RangeReader())
            with patch.object(probe, "urlopen") as request:
                self.assertEqual(cache.fetch(0, 3), b"abc")
                request.assert_not_called()
                (root / "0-3.bin").write_bytes(b"bad")
                with self.assertRaises(ValueError):
                    cache.fetch(0, 3)
                request.assert_not_called()
            cache.close()

    def test_retry_is_charged_and_partial_file_is_not_a_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cache = acquire.Cache(root, probe.RangeReader())
            (root / "0-3.part").write_bytes(b"a")
            with patch.object(acquire.time, "sleep"), patch.object(probe, "urlopen",
                    side_effect=[OSError("interrupted"), Response(b"abc",0,2)]):
                self.assertEqual(cache.fetch(0,3), b"abc")
            self.assertEqual(cache.summary()["requests"], 2)
            self.assertEqual(cache.summary()["reserved_bytes"], 2*(3+acquire.OVERHEAD))
            cache.close()

    def test_parallel_requests_reserve_before_io_and_stop_at_cap(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(acquire,"CAP",2*(acquire.OVERHEAD+3)):
            root=Path(directory)
            cache=acquire.Cache(root,probe.RangeReader())

            def response(request,timeout):
                start,end=map(int,request.get_header("Range").removeprefix("bytes=").split("-"))
                db=sqlite3.connect(root/"ledger.sqlite")
                try:
                    self.assertTrue(db.execute("SELECT 1 FROM requests WHERE offset=?",(start,)).fetchone())
                finally:
                    db.close()
                return Response(b"abc",start,end)

            with patch.object(probe,"urlopen",side_effect=response) as network:
                cache.prefetch([(0,3),(3,3)])
                with self.assertRaises(ValueError):
                    cache.prefetch([(6,3)])
                self.assertEqual(network.call_count,2)
            self.assertEqual(cache.summary()["requests"],2)
            self.assertEqual(cache.summary()["cached_body_bytes"],6)
            cache.close()

    def test_projection_cohort_boundaries_and_order(self):
        rows = 30000
        users = list(range(1,rows+1))
        dates = [acquire.START-1] + [acquire.START+i for i in range(rows-2)] + [acquire.END]
        table = pa.table({"listened_at":pa.array(dates,type=pa.timestamp("ns")),
                          "created":pa.array(dates,type=pa.timestamp("ns")),
                          "user_id":users, "recording_mbid":["test"]*rows,
                          "artist_name":["Artist"]*rows, "recording_name":["Title"]*rows,
                          "artist_credit_mbids":[["artist"]]*rows,
                          "unused":list(range(rows))})
        payload = io.BytesIO()
        pq.write_table(table,payload,compression=None,row_group_size=10000)
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive,mode="w",format=tarfile.PAX_FORMAT) as tar:
            item=tarfile.TarInfo("listenbrainz-spark-dump-2722-20261015-000002-full/1349.parquet")
            item.pax_headers={"mtime":"1234.5"}
            item.size=len(payload.getvalue())
            tar.addfile(item,io.BytesIO(payload.getvalue()))
        member = last_member(io.BytesIO(archive.getvalue()),len(archive.getvalue()))

        def response(request, timeout):
            start,end = map(int,request.get_header("Range").removeprefix("bytes=").split("-"))
            return Response(archive.getvalue()[start:end+1], start, end)

        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            cache=acquire.Cache(root, probe.RangeReader(max_bytes=20*1024**2,max_read=acquire.CHUNK))
            with patch.object(probe,"urlopen",side_effect=response):
                projected=acquire.projected_file(cache,member)
            output=root/"cohort.parquet"
            counts=acquire.extract(projected,output)
            self.assertEqual(counts["source_rows"], rows)
            self.assertEqual(counts["interval_rows"], rows-2)
            expected=[u for u in users[1:-1] if acquire.cohort_user(u)]
            self.assertEqual(pq.read_table(output)["user_id"].to_pylist(),expected)
            self.assertEqual(pq.read_table(output).column_names,acquire.COLUMNS)
            self.assertEqual(counts["sha256"],hashlib.sha256(output.read_bytes()).hexdigest())
            cache.close()
            bad=io.BytesIO()
            pq.write_table(table.take(pa.array([1,0])),bad)
            with self.assertRaises(ValueError):
                acquire.extract(pq.ParquetFile(pa.BufferReader(bad.getvalue())),root/"bad.parquet")
            self.assertFalse((root/"bad.parquet").exists())


if __name__ == "__main__":
    unittest.main()
