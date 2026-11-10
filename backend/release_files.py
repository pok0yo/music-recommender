"""Prepare private deployment inputs or fetch their pinned bytes during a server build."""

import argparse
import hashlib
from http.client import HTTPException
import json
import os
from pathlib import Path
import shutil
import time
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MANIFEST = Path("deploy/release.json")
SOURCES = {**{f"model/{name}": Path("artifacts/stage-7-cf-v1") / name for name in
    ("manifest.json", "ids.npy", "support.npy", "neighbors.npy", "scores.npy", "shared.npy")},
    "catalog/release.json": Path("data/processed/catalog-expansion-v2/release.json"),
    "links/release.json": Path("data/processed/listening-links-v1/release.json")}


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def identifier(files):
    return hashlib.sha256(json.dumps(files, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def read_manifest(path=MANIFEST):
    return validate_manifest(json.loads(Path(path).read_text(encoding="utf-8")))


def validate_manifest(release):
    files = release["files"]
    if (release["schema_version"] != 1 or set(files) != set(SOURCES)
            or release["release_id"] != identifier(files)):
        raise ValueError("Deployment release inventory differs")
    for item in files.values():
        if (type(item["bytes"]) is not int or not 0 < item["bytes"] <= 50_000_000
                or len(item["sha256"]) != 64 or any(c not in "0123456789abcdef" for c in item["sha256"])):
            raise ValueError("Invalid deployment file bounds")
    return release


def valid_file(path, spec):
    return path.is_file() and path.stat().st_size == spec["bytes"] and digest(path) == spec["sha256"]


def verify(root, release):
    for name, spec in release["files"].items():
        if not valid_file(Path(root) / name, spec):
            raise ValueError("Deployment file differs: " + name)


def prepare(catalog_release=None, links_release=None, manifest=MANIFEST):
    from ml.serving_artifact import Artifact
    from ml.inspect_spark import save
    trusted = json.loads(Path("docs/evidence/stage-7-decision.json").read_text())["evidence_sha256"]["stage-7-artifact-manifest.json"]
    Artifact("artifacts/stage-7-cf-v1", trusted)
    sources = dict(SOURCES)
    if catalog_release is not None: sources['catalog/release.json'] = Path(catalog_release)
    if links_release is not None: sources['links/release.json'] = Path(links_release)
    catalog = json.loads(sources['catalog/release.json'].read_text(encoding='utf-8'))
    links = json.loads(sources['links/release.json'].read_text(encoding='utf-8'))
    if (catalog['model_manifest_sha256'] != trusted or catalog['data_mode'] != 'real'
            or links['catalog_version'] != catalog['catalog_version']):
        raise ValueError('Deployment catalog, links and model binding differs')
    files = {name: {"bytes": path.stat().st_size, "sha256": digest(path)} for name, path in sources.items()}
    release = validate_manifest({"schema_version": 1, "release_id": identifier(files), "files": files})
    manifest = Path(manifest)
    if manifest.exists() and read_manifest(manifest) != release:
        raise ValueError('Refusing to replace a different deployment manifest')
    root = Path("artifacts/deployment") / release["release_id"]
    for name, source in sources.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if not valid_file(target, files[name]):
                raise ValueError("Refusing to overwrite a different prepared file")
        else:
            shutil.copyfile(source, target)
    verify(root, release)
    manifest.parent.mkdir(parents=True,exist_ok=True)
    save(manifest,release)
    print(json.dumps({"release_id": release["release_id"], "files": len(files), "bytes": sum(s["bytes"] for s in files.values())}))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(root, release, base, token):
    url = urlsplit(base)
    if (url.scheme != "https" or not url.hostname or not url.hostname.endswith(".supabase.co")
            or url.username or url.password or url.port or url.query or url.fragment
            or not url.path.startswith("/storage/v1/object/authenticated/")
            or not url.path.endswith("/" + release["release_id"]) or not token.startswith("sb_secret_")):
        raise ValueError("Configure the private release storage origin and server secret key")
    opener = build_opener(NoRedirect())
    for name, spec in release["files"].items():
        target = Path(root) / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if not valid_file(target, spec):
                raise ValueError("Existing deployment input differs: " + name)
            continue
        partial = target.with_suffix(target.suffix + ".partial")
        for attempt in range(3):
            try:
                request = Request(base + "/" + name, headers={"apikey": token})
                with opener.open(request, timeout=60) as response, partial.open("wb") as output:
                    total = 0
                    while chunk := response.read(min(1024 * 1024, spec["bytes"] - total + 1)):
                        total += len(chunk)
                        if total > spec["bytes"]:
                            raise ValueError("Asset exceeds pinned length")
                        output.write(chunk)
                if not valid_file(partial, spec):
                    raise ValueError("Asset checksum differs")
                partial.replace(target)
                break
            except (OSError, ValueError, HTTPException):
                partial.unlink(missing_ok=True)
                if attempt == 2:
                    raise ValueError("Release asset could not be verified: " + name) from None
                time.sleep(2 ** attempt)
    verify(root, release)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "fetch"))
    parser.add_argument('--catalog-release',type=Path)
    parser.add_argument('--links-release',type=Path)
    parser.add_argument('--manifest',type=Path,default=MANIFEST)
    args = parser.parse_args()
    if args.action == "prepare":
        prepare(args.catalog_release,args.links_release,args.manifest)
    else:
        if args.catalog_release is not None or args.links_release is not None:
            parser.error('Candidate input paths apply only to prepare')
        release = read_manifest(args.manifest)
        fetch(Path(".runtime") / release["release_id"], release,
            os.environ["RELEASE_STORAGE_BASE_URL"], os.environ["RELEASE_STORAGE_TOKEN"])
