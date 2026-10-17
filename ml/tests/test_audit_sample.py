"""Synthetic archive tests; no network or real listener data."""

import io
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

from ml import audit_sample


def archive_bytes(entries):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w") as archive:
        for name, content in entries:
            member = tarfile.TarInfo(name)
            member.size = len(content)
            archive.addfile(member, io.BytesIO(content))
    stream.seek(0)
    return stream


class SampleAuditTests(unittest.TestCase):
    def test_metadata_does_not_pass_as_listens(self):
        stream = archive_bytes([
            ("sample/SCHEMA_SEQUENCE", b"8"),
            ("sample/metadata/recordings.jsonl", b'{"recording_mbid":"a"}\n'),
            ("sample/popularity/recording.csv", b"recording_mbid,total_user_count\na,55\n"),
        ])
        report = audit_sample.inspect_tar(stream)
        self.assertEqual(report["json_event_rows_detected"], 0)
        self.assertFalse(report["training_approved"])
        self.assertEqual(report["schema_sequence"], "8")
        self.assertEqual(report["members"][1]["rows"], 1)
        self.assertEqual(report["members"][1]["field_counts"], {"recording_mbid": 1})

    def test_event_detection_is_not_approval_and_does_not_copy_values(self):
        stream = archive_bytes([("x.listens", b'{"listened_at":100,"user_id":"private-fixture"}\n')])
        report = audit_sample.inspect_tar(stream)
        self.assertEqual(report["json_event_rows_detected"], 1)
        self.assertFalse(report["training_approved"])
        self.assertNotIn("private-fixture", str(report))

    def test_invalid_json_and_nonobjects_fail(self):
        for content in (b"broken\n", b"[]\n"):
            with self.subTest(content=content), self.assertRaises(ValueError):
                audit_sample.inspect_tar(archive_bytes([("x.jsonl", content)]))

    def test_utf8_metadata_and_large_line_accounting(self):
        line = ('{"name":"é","text":"' + 'x' * 100000 + '"}\n').encode()
        report = audit_sample.inspect_tar(archive_bytes([("x.jsonl", line)]))
        self.assertEqual(report["members"][0]["rows"], 1)
        self.assertEqual(report["members"][0]["max_line_bytes"], len(line))

    def test_matching_size_wrong_checksum_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "archive"
            path.write_bytes(b"x")
            with patch.object(audit_sample, "COMPRESSED_BYTES", 1), self.assertRaises(ValueError):
                audit_sample.verify(path)

    def test_expansion_and_line_limits(self):
        with patch.object(audit_sample, "MAX_EXPANDED_BYTES", 2), self.assertRaises(ValueError):
            audit_sample.inspect_tar(archive_bytes([("x", b"123")]))
        with patch.object(audit_sample, "MAX_LINE_BYTES", 2), self.assertRaises(ValueError):
            audit_sample.inspect_tar(archive_bytes([("x.jsonl", b"{}\n")]))

    def test_links_are_rejected(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode="w") as archive:
            member = tarfile.TarInfo("link")
            member.type = tarfile.SYMTYPE
            member.linkname = "../outside"
            archive.addfile(member)
        stream.seek(0)
        with self.assertRaises(ValueError):
            audit_sample.inspect_tar(stream)

    def test_invalid_existing_download_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "archive"
            path.write_bytes(b"keep")
            with patch.object(audit_sample, "urlopen") as request, self.assertRaises(ValueError):
                audit_sample.download(path)
            request.assert_not_called()
            self.assertEqual(path.read_bytes(), b"keep")

    def test_download_size_and_checksum(self):
        payload = b"bounded archive fixture"
        checksum = audit_sample.hashlib.sha256(payload).hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "archive"
            with patch.object(audit_sample, "COMPRESSED_BYTES", len(payload)), \
                 patch.object(audit_sample, "SHA256", checksum), \
                 patch.object(audit_sample, "urlopen", return_value=io.BytesIO(payload)):
                audit_sample.download(path)
                audit_sample.verify(path)
            self.assertEqual(path.read_bytes(), payload)
            bad_path = Path(directory) / "bad-archive"
            with patch.object(audit_sample, "COMPRESSED_BYTES", 1), \
                 patch.object(audit_sample, "urlopen", return_value=io.BytesIO(payload)), \
                 self.assertRaises(ValueError):
                audit_sample.download(bad_path)
            self.assertFalse(bad_path.exists())


if __name__ == "__main__":
    unittest.main()
