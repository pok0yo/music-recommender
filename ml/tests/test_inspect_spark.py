import io
from pathlib import Path
import tarfile
import tempfile
import unittest

import pyarrow as pa
import pyarrow.parquet as pq

from ml.inspect_spark import download_member, header, last_member, timestamp_bounds


class LocalReader(io.BytesIO):
    max_read = 4096


def archive_bytes():
    payload = io.BytesIO()
    pq.write_table(pa.table({"listened_at":pa.array(range(30000),type=pa.timestamp("ns")),
                            "user_id":range(30000)}),payload,compression=None,row_group_size=10000)
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive,mode="w",format=tarfile.PAX_FORMAT) as tar:
        item=tarfile.TarInfo("listenbrainz-spark-dump-2722-20261015-000002-full/9.parquet")
        item.pax_headers={"mtime":"1234.5"}
        item.size=len(payload.getvalue())
        tar.addfile(item,io.BytesIO(payload.getvalue()))
    return archive.getvalue(),payload.getvalue()


class SparkInspectionTests(unittest.TestCase):
    def test_footer_location_and_timestamp_projection(self):
        archive,payload=archive_bytes()
        reader=LocalReader(archive)
        member=last_member(reader,len(archive))
        self.assertEqual(member["offset"],1536)
        self.assertEqual(member["bytes"],len(payload))
        self.assertEqual(member["rows"],30000)
        probe=timestamp_bounds(reader,member)
        self.assertEqual(probe["bounds"]["min"],"1970-01-01 00:00:00.000000000")
        self.assertEqual(probe["bounds"]["max"],"1970-01-01 00:00:00.000029999")
        self.assertEqual(probe["rows"],30000)
        self.assertFalse(probe["full_file_checksum_verified"])
        self.assertLess(sum(r["bytes"] for r in probe["fetched_ranges"]),len(payload))

    def test_corrupt_header_and_footer_fail_closed(self):
        archive,_=archive_bytes()
        corrupted=bytearray(archive)
        corrupted[1024]=ord("X")
        with self.assertRaises(tarfile.ReadError):
            last_member(LocalReader(corrupted),len(corrupted))
        with self.assertRaises(ValueError):
            last_member(LocalReader(bytes(65536)),65536)
        bad = io.BytesIO()
        with tarfile.open(fileobj=bad,mode="w") as tar:
            tar.addfile(tarfile.TarInfo("listenbrainz-spark-dump-2722-20261015-000002-full/../evil"))
        with self.assertRaises(ValueError):
            header(LocalReader(bad.getvalue()),0)

    def test_download_preserves_files_and_rejects_truncation(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/"input.parquet"
            member={"offset":0,"bytes":3}
            digest=download_member(LocalReader(b"abc"),member,path)
            self.assertEqual(len(digest),64)
            self.assertEqual(path.read_bytes(),b"abc")
            with self.assertRaises(FileExistsError):
                download_member(LocalReader(b"xxx"),member,path)
            with self.assertRaises(ValueError):
                download_member(LocalReader(b"a"),member,Path(temporary)/"short.parquet")
            self.assertTrue((Path(temporary)/"short.part").exists())


if __name__ == "__main__":
    unittest.main()
