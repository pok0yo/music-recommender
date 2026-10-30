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
    release = json.loads(Path(path).read_text(encoding="utf-8"))
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


def prepare():
    from ml.serving_artifact import Artifact
    trusted = json.loads(Path("docs/evidence/stage-7-decision.json").read_text())["evidence_sha256"]["stage-7-artifact-manifest.json"]
    Artifact("artifacts/stage-7-cf-v1", trusted)
    files = {name: {"bytes": path.stat().st_size, "sha256": digest(path)} for name, path in SOURCES.items()}
    release = {"schema_version": 1, "release_id": identifier(files), "files": files}
    MANIFEST.parent.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(release, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    release = read_manifest()
    root = Path("artifacts/deployment") / release["release_id"]
    for name, source in SOURCES.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if not valid_file(target, files[name]):
                raise ValueError("Refusing to overwrite a different prepared file")
        else:
            shutil.copyfile(source, target)
    verify(root, release)
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
    action = parser.parse_args().action
    if action == "prepare":
        prepare()
    else:
        release = read_manifest()
        fetch(Path(".runtime") / release["release_id"], release,
            os.environ["RELEASE_STORAGE_BASE_URL"], os.environ["RELEASE_STORAGE_TOKEN"])
