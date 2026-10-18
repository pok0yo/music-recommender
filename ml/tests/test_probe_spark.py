import io
import tarfile
import unittest
from unittest.mock import patch

from ml import probe_spark


class Response(io.BytesIO):
    def __init__(self, status=206, content_range=None, etag=probe_spark.ETAG):
        super().__init__(b"abc")
        self.status = status
        self.headers = {"Content-Range": content_range or f"bytes 0-2/{probe_spark.SIZE}", "ETag": etag}


class RangeReaderTests(unittest.TestCase):
    def test_exact_range_updates_position(self):
        reader = probe_spark.RangeReader()
        with patch.object(probe_spark, "urlopen", return_value=Response()):
            self.assertEqual(reader.read(3), b"abc")
        self.assertEqual(reader.tell(), 3)
        self.assertEqual(reader.bytes_read, 3)
        self.assertEqual(reader.requests, 1)

    def test_ignored_range_or_changed_version_is_rejected(self):
        for response in (Response(status=200), Response(etag='"different"'), Response(content_range="bytes 1-3/10")):
            with self.subTest(response=response), patch.object(probe_spark, "urlopen", return_value=response), self.assertRaises(ValueError):
                probe_spark.RangeReader().read(3)

    def test_bounds_do_not_make_a_request(self):
        with patch.object(probe_spark, "urlopen") as request:
            reader = probe_spark.RangeReader()
            for size in (-1, 65537):
                with self.assertRaises(ValueError):
                    reader.read(size)
            with self.assertRaises(ValueError):
                reader.seek(-1)
            reader.requests = probe_spark.MAX_REQUESTS
            with self.assertRaises(ValueError):
                reader.read(1)
            request.assert_not_called()

    def test_failed_read_consumes_budget_and_connection_path_matches(self):
        reader = probe_spark.RangeReader(max_bytes=4)
        with patch.object(probe_spark, "urlopen", return_value=Response(status=200)):
            with self.assertRaises(ValueError):
                reader.read(3)
        self.assertEqual(reader.reserved_bytes,4)
        with patch.object(probe_spark, "urlopen") as request:
            with self.assertRaises(ValueError):
                reader.read(1)
            request.assert_not_called()
        from unittest.mock import Mock
        connection=Mock()
        connection.getresponse.return_value=Response()
        reader=probe_spark.RangeReader(connection=connection)
        self.assertEqual(reader.read(3),b"abc")
        connection.request.assert_called_once()

    def test_pax_names_offsets_and_prefix_limit(self):
        data = io.BytesIO()
        long_name = 'a' * 150 + '.parquet'
        with tarfile.open(fileobj=data, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name in (long_name, 'second.parquet'):
                member = tarfile.TarInfo(name)
                member.size = 3
                archive.addfile(member, io.BytesIO(b'abc'))
        data.seek(0)
        items = probe_spark.inventory(data, limit=1)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['path'], long_name)
        data.seek(items[0]['offset'])
        self.assertEqual(data.read(items[0]['bytes']), b'abc')


if __name__ == "__main__":
    unittest.main()
