"""Operator-only upload of the pinned release to the approved private Supabase bucket."""
import json
from http.client import HTTPException
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

sys.path.insert(0, str(Path.cwd()))
from backend.release_files import NoRedirect, fetch, read_manifest, verify


def main():
    config = json.loads(Path("artifacts/deployment-private/supabase-operator.json").read_text(encoding="utf-8-sig"))
    if config["project_ref"] != "qhqwtuxxebcsccvklgxy" or not re.fullmatch(r"sb_secret_[A-Za-z0-9_-]{20,}", config["storage_secret_key"]):
        raise ValueError("Use the approved project and its private server key")
    release = read_manifest()
    root = Path("artifacts/deployment") / release["release_id"]
    verify(root, release)
    origin = "https://" + config["project_ref"] + ".supabase.co/storage/v1"
    bucket = "model-releases"
    opener = build_opener(NoRedirect())

    def request(method, path, body=None, content_type="application/json"):
        headers = {"apikey": config["storage_secret_key"], "Content-Type": content_type, "x-upsert": "false"}
        return opener.open(Request(origin + path, data=body, headers=headers, method=method), timeout=180)

    with request("GET", "/bucket") as response:
        bucket_config = next((item for item in json.load(response) if item["id"] == bucket), None)
    if bucket_config is None:
        body = {"id": bucket, "name": bucket, "type": "STANDARD", "public": False,
            "versioning_status": "DISABLED", "file_size_limit": 50_000_000,
            "allowed_mime_types": ["application/octet-stream", "application/json"]}
        with request("POST", "/bucket/", json.dumps(body).encode()) as response:
            response.read()
        with request("GET", "/bucket/" + bucket) as response:
            bucket_config = json.load(response)
    if bucket_config.get("public") is not False or bucket_config.get("file_size_limit") != 50_000_000:
        raise ValueError("Existing bucket settings differ; refusing to change them")
    print(json.dumps({"private_bucket_verified": True, "release_id": release["release_id"]}), flush=True)

    listing_body = {"prefix": release["release_id"] + "/", "limit": 9, "with_delimiter": False}
    with request("POST", "/object/list-v2/" + bucket, json.dumps(listing_body).encode()) as response:
        listing = json.load(response)
    existing = {item["name"]: item for item in listing["objects"]}
    expected = {release["release_id"] + "/" + name for name in release["files"]}
    if listing["hasNext"] or listing["folders"] or set(existing) - expected:
        raise ValueError("Unexpected existing release inventory")
    uploaded = 0
    for name, spec in release["files"].items():
        path = "/" + bucket + "/" + release["release_id"] + "/" + name
        exists = release["release_id"] + "/" + name in existing
        if exists and existing[release["release_id"] + "/" + name]["metadata"]["size"] != spec["bytes"]:
            raise ValueError("Existing object length differs; refusing overwrite")
        if not exists:
            mime = "application/json" if name.endswith(".json") else "application/octet-stream"
            with request("POST", "/object" + path, (root / name).read_bytes(), mime) as response:
                response.read()
            uploaded += spec["bytes"]
        print(json.dumps({"object": name, "bytes": spec["bytes"], "uploaded": not exists}), flush=True)

    verified = Path("artifacts/deployment-cloud-verification") / release["release_id"]
    base = origin + "/object/authenticated/" + bucket + "/" + release["release_id"]
    fetch(verified, release, base, config["storage_secret_key"])
    anonymous = Request(origin + "/object/public/" + bucket + "/" + release["release_id"] + "/model/manifest.json")
    try:
        with opener.open(anonymous, timeout=30) as response:
            raise ValueError("Private release unexpectedly accessible without authentication")
    except HTTPError as error:
        if error.code not in (400, 401, 403, 404):
            raise
    report = {"project_id": config["project_ref"], "bucket": bucket, "private": True,
        "release_id": release["release_id"], "objects": len(release["files"]),
        "total_bytes": sum(item["bytes"] for item in release["files"].values()),
        "uploaded_bytes_this_run": uploaded, "downloaded_hashes_verified": True,
        "anonymous_public_access_rejected": True}
    Path("docs/evidence/release-phase-5-storage.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    try:
        main()
    except HTTPError as error:
        raise SystemExit(f"Storage operation failed with HTTP {error.code}; private details were withheld.") from None
    except (ValueError, KeyError, OSError, URLError, HTTPException):
        raise SystemExit("Private configuration, network or release validation failed; no credential values were logged.") from None
