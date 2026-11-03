import hashlib
import io
from http.client import IncompleteRead
import json
import os
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
from unittest.mock import patch

from backend.catalog import operator_connections
from backend.production import configure, public_origin
from backend.release_files import SOURCES, fetch, identifier, read_manifest, verify, prepare


class DeploymentTests(unittest.TestCase):
    def test_rehearsal_rejects_either_remote_role_before_creating_databases(self):
        root=Path(__file__).resolve().parents[2]
        config=self.root/'artifacts/local-postgres/connections.json';config.parent.mkdir(parents=True)
        for remote in ('admin','reader'):
            connections={role:f"postgresql://user:private-test-password@{'remote.invalid' if role==remote else '127.0.0.1'}/fixture" for role in ('admin','reader')}
            config.write_text(json.dumps(connections))
            result=subprocess.run([sys.executable,str(root/'scripts/verify-deployment-database.py')],cwd=self.root,
                env={**os.environ,'PYTHONPATH':str(root)},capture_output=True,text=True,timeout=20)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('Local rehearsal requires loopback connections',result.stderr)
            self.assertNotIn('private-test-password',result.stderr)
            self.assertFalse((self.root/'artifacts/phase-4-verification').exists())

    def test_candidate_preparation_checks_binding_and_preserves_existing_manifests_and_files(self):
        old=Path.cwd();os.chdir(self.root)
        self.addCleanup(os.chdir,old)
        sources={name:Path('inputs')/name for name in SOURCES}
        for path in sources.values():
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(self.data)
        trusted=hashlib.sha256(self.data).hexdigest()
        doc=Path('docs/evidence/stage-7-decision.json');doc.parent.mkdir(parents=True)
        doc.write_text(json.dumps({'evidence_sha256':{'stage-7-artifact-manifest.json':trusted}}))
        catalog={'catalog_version':'candidate','model_manifest_sha256':trusted,'data_mode':'real'}
        links={'catalog_version':'candidate'}
        sources['catalog/release.json'].write_text(json.dumps(catalog));sources['links/release.json'].write_text(json.dumps(links))
        manifest=Path('candidate.json');active=Path('deploy/release.json');active.parent.mkdir();active.write_bytes(b'active baseline')
        with patch('backend.release_files.SOURCES',sources),patch('ml.serving_artifact.Artifact'):
            prepare(sources['catalog/release.json'],sources['links/release.json'],manifest)
            release=read_manifest(manifest);root=Path('artifacts/deployment')/release['release_id'];verify(root,release)
            before=manifest.read_bytes()
            prepare(sources['catalog/release.json'],sources['links/release.json'],manifest)
            self.assertEqual(manifest.read_bytes(),before);self.assertEqual(active.read_bytes(),b'active baseline')
            sources['links/release.json'].write_text(json.dumps({'catalog_version':'wrong'}))
            with self.assertRaisesRegex(ValueError,'binding'):prepare(manifest=manifest)
            self.assertEqual(manifest.read_bytes(),before)
            sources['links/release.json'].write_text(json.dumps(links))
            sources['catalog/release.json'].write_text(json.dumps(dict(catalog,model_manifest_sha256='b'*64)))
            with self.assertRaisesRegex(ValueError,'binding'):prepare(manifest=manifest)
            sources['catalog/release.json'].write_text(json.dumps(catalog))
            (root/'model/ids.npy').write_bytes(b'corrupt prepared file')
            with self.assertRaisesRegex(ValueError,'overwrite'):prepare(manifest=manifest)
            self.assertEqual(manifest.read_bytes(),before)
            manifest.write_text(json.dumps(self.release))
            with self.assertRaisesRegex(ValueError,'replace a different deployment manifest'):prepare(manifest=manifest)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = b"verified bytes"
        self.spec = {"bytes": len(self.data), "sha256": hashlib.sha256(self.data).hexdigest()}
        files = {name: dict(self.spec) for name in SOURCES}
        self.release = {"schema_version": 1, "release_id": identifier(files), "files": files}
        self.base = "https://" + "a" * 20 + ".supabase.co/storage/v1/object/authenticated/releases/" + self.release["release_id"]

    def test_manifest_rejects_traversal_inventory_and_changed_sizes(self):
        path = self.root / "release.json"
        path.write_text(json.dumps(self.release))
        self.assertEqual(read_manifest(path), self.release)
        self.release["files"]["../../credentials"] = self.spec
        path.write_text(json.dumps(self.release))
        with self.assertRaises(ValueError): read_manifest(path)

    def test_download_is_verified_cached_and_redirects_are_not_followed(self):
        with patch("backend.release_files.build_opener") as factory:
            factory.return_value.open.side_effect = lambda *a, **kw: io.BytesIO(self.data)
            fetch(self.root, self.release, self.base, "sb_secret_private-token")
            self.assertEqual(factory.return_value.open.call_count, 8)
            request = factory.return_value.open.call_args[0][0]
            self.assertEqual(request.get_header("Apikey"), "sb_secret_private-token")
            self.assertIsNone(request.get_header("Authorization"))
            factory.return_value.open.reset_mock()
            fetch(self.root, self.release, self.base, "sb_secret_private-token")
            factory.return_value.open.assert_not_called()
            verify(self.root, self.release)
        from backend.release_files import NoRedirect
        self.assertIsNone(NoRedirect().redirect_request(None, None, 302, "", {}, "https://elsewhere.invalid"))

    def test_oversize_or_wrong_hash_fails_without_leaking_token_or_leaving_partial(self):
        for body in [self.data + b"overflow", b"wrong checksum"]:
            with patch("backend.release_files.build_opener") as factory, patch("backend.release_files.time.sleep"):
                factory.return_value.open.side_effect = lambda *a, **kw: io.BytesIO(body)
                with self.assertRaises(ValueError) as error:
                    fetch(self.root, self.release, self.base, "sb_secret_private-token")
                self.assertEqual(factory.return_value.open.call_count, 3)
                self.assertNotIn("sb_secret_private-token", str(error.exception))
                self.assertNotIn("https://", str(error.exception))
            self.assertEqual(list(self.root.rglob("*.partial")), [])

    def test_private_storage_requires_https_exact_path_and_token(self):
        for base in [self.base.replace("https:", "http:"), self.base + "?secret=x",
                self.base.replace(".supabase.co", ".supabase.co.evil.invalid"), self.base + "/wrong"]:
            with self.assertRaises(ValueError): fetch(self.root, self.release, base, "sb_secret_token")
        for token in ["", "sb_publishable_token", "legacy-jwt"]:
            with self.assertRaises(ValueError): fetch(self.root, self.release, self.base, token)

    def test_interrupted_transfer_retries_without_logging_the_private_request(self):
        with patch("backend.release_files.build_opener") as factory, patch("backend.release_files.time.sleep"):
            factory.return_value.open.side_effect = IncompleteRead(b"partial", 10)
            with self.assertRaises(ValueError): fetch(self.root, self.release, self.base, "sb_secret_private-token")
            self.assertEqual(factory.return_value.open.call_count, 3)

    def test_public_origins_reject_local_placeholder_and_credential_urls(self):
        self.assertTrue(public_origin("https://music-recommender.vercel.app"))
        for value in ["", "http://site.vercel.app", "https://127.0.0.1", "https://192.168.1.2",
                "https://localhost", "https://*.vercel.app", "https://site.vercel.app/path",
                "https://user:private@site.vercel.app", "https://api.example.com", "https://site.vercel.app:bad"]:
            self.assertFalse(public_origin(value), value)

    def test_production_requires_read_only_tls_and_the_complete_pinned_release(self):
        env = {"ALLOWED_ORIGINS": "https://music-recommender.vercel.app",
            "DATABASE_URL": "postgresql://music_reader.ref:private@pool.supabase.com/postgres?sslmode=verify-full&sslrootcert=system"}
        old = Path.cwd()
        os.chdir(self.root)
        self.addCleanup(os.chdir, old)
        root = Path(".runtime") / self.release["release_id"]
        for name in SOURCES:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(self.data)
        with patch.dict(os.environ, env, clear=True), patch("backend.production.read_manifest", return_value=self.release):
            self.assertEqual(configure(), 10000)
            self.assertTrue(Path(os.environ["MODEL_DIRECTORY"]).is_absolute())
            os.environ["DATABASE_URL"] = env["DATABASE_URL"].replace("sslrootcert=system", "sslrootcert=deploy/supabase-root-ca.crt")
            self.assertEqual(configure(), 10000)
            (root / "model/ids.npy").write_bytes(b"corrupt")
            with self.assertRaises(ValueError): configure()
        for database in [env["DATABASE_URL"].replace("verify-full", "require"), env["DATABASE_URL"].replace("music_reader.ref", "postgres.ref"),
                env["DATABASE_URL"].replace("sslrootcert=system", "sslrootcert=unreviewed.crt")]:
            with patch.dict(os.environ, {**env, "DATABASE_URL": database}, clear=True):
                with self.assertRaises(ValueError): configure()
        with patch.dict(os.environ, {**env, "CATALOG_ADMIN_DATABASE_URL": "operator-private"}, clear=True):
            with self.assertRaises(ValueError): configure()

    def test_operator_connections_require_separate_admin_and_reader_values(self):
        with patch.dict(os.environ, {"CATALOG_ADMIN_DATABASE_URL": "admin-private"}, clear=True):
            with self.assertRaises(ValueError) as error: operator_connections()
            self.assertNotIn("admin-private", str(error.exception))
        with patch.dict(os.environ, {"CATALOG_ADMIN_DATABASE_URL": "admin", "DATABASE_URL": "reader"}, clear=True):
            self.assertEqual(operator_connections(), {"admin": "admin", "reader": "reader"})


if __name__ == "__main__": unittest.main()
