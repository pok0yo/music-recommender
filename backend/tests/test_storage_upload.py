import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from backend.release_files import SOURCES, identifier

spec = importlib.util.spec_from_file_location("upload_release", Path(__file__).resolve().parents[2] / "scripts/upload-deployment-release.py")
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)


class StorageUploadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        previous = Path.cwd()
        os.chdir(self.temp.name)
        self.addCleanup(os.chdir, previous)
        self.key = "sb_secret_" + "x" * 40
        config = Path("artifacts/deployment-private/supabase-operator.json")
        config.parent.mkdir(parents=True)
        config.write_text(json.dumps({"project_ref": "qhqwtuxxebcsccvklgxy", "storage_secret_key": self.key}))
        data = b"pinned release bytes"
        files = {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name in SOURCES}
        self.release = {"schema_version": 1, "release_id": identifier(files), "files": files}
        Path("deploy").mkdir()
        Path("docs/evidence").mkdir(parents=True)
        Path("deploy/release.json").write_text(json.dumps(self.release))
        for name in files:
            target = Path("artifacts/deployment") / self.release["release_id"] / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        self.bucket = {"id": "model-releases", "public": False, "file_size_limit": 50_000_000}
        self.objects = [{"name": self.release["release_id"] + "/" + name, "metadata": {"size": len(data)}} for name in files]
        self.requests = []

    def open(self, request, **kwargs):
        method = request.get_method()
        self.requests.append((method, request.full_url))
        if method == "GET" and request.full_url.endswith("/bucket"):
            return io.BytesIO(json.dumps([self.bucket]).encode())
        if method == "POST" and "/object/list-v2/" in request.full_url:
            return io.BytesIO(json.dumps({"objects": self.objects, "folders": [], "hasNext": False}).encode())
        if method == "GET" and "/object/public/" in request.full_url:
            raise HTTPError(request.full_url, 404, "Private", {}, None)
        raise AssertionError("An existing release must never be overwritten")

    def test_resume_checks_existing_files_without_uploading_or_logging_credentials(self):
        output = io.StringIO()
        with patch.object(upload, "build_opener") as factory, patch.object(upload, "fetch") as fetch, contextlib.redirect_stdout(output):
            factory.return_value.open.side_effect = self.open
            upload.main()
            fetch.assert_called_once()
        report = json.loads(Path("docs/evidence/release-phase-5-storage.json").read_text())
        self.assertEqual(report["objects"], 8)
        self.assertEqual(report["uploaded_bytes_this_run"], 0)
        self.assertTrue(report["anonymous_public_access_rejected"])
        self.assertNotIn(self.key, output.getvalue())

    def test_public_bucket_or_changed_object_size_stops_without_upload(self):
        for invalid in ("public", "size"):
            self.bucket["public"] = invalid == "public"
            self.objects[0]["metadata"]["size"] += 1
            with patch.object(upload, "build_opener") as factory, patch.object(upload, "fetch") as fetch, contextlib.redirect_stdout(io.StringIO()):
                factory.return_value.open.side_effect = self.open
                with self.assertRaises(ValueError):
                    upload.main()
                fetch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
