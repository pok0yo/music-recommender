"""Single-worker production entry point; no acquisition, imports or credentials in HTTP handlers."""

import ipaddress
import logging
import os
from pathlib import Path
from urllib.parse import urlsplit

from psycopg.conninfo import conninfo_to_dict
from psycopg import ProgrammingError
from backend.release_files import read_manifest, verify


def public_origin(value):
    try:
        url = urlsplit(value)
        host = url.hostname or ""
        if (url.scheme != "https" or not host or url.username or url.password or url.port not in (None, 443)
                or url.path not in ("", "/") or url.query or url.fragment or "*" in host
                or "." not in host or host.endswith((".localhost", ".local", ".test", ".invalid", "example.com", "example.org"))):
            return False
        try:
            return ipaddress.ip_address(host).is_global
        except ValueError:
            return True
    except ValueError:
        return False


def configure():
    if os.getenv("CATALOG_ADMIN_DATABASE_URL"):
        raise ValueError("Operator credentials must not be configured on the API service")
    origins = [origin.strip().rstrip("/") for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")]
    if not origins or not all(public_origin(origin) for origin in origins):
        raise ValueError("ALLOWED_ORIGINS must contain exact public HTTPS frontend origins")
    os.environ["ALLOWED_ORIGINS"] = ",".join(origins)
    try:
        database = conninfo_to_dict(os.environ["DATABASE_URL"])
    except (KeyError, ProgrammingError):
        raise ValueError("Configure the reader database connection") from None
    user = database.get("user", "")
    if (user.split(".")[0] != "music_reader" or database.get("sslmode") != "verify-full"
            or database.get("sslrootcert") != "system"):
        raise ValueError("Use the music_reader role with verified database TLS and system roots")
    port = int(os.getenv("PORT", "10000"))
    if not 1024 <= port <= 65535:
        raise ValueError("PORT is outside the deployment range")
    release = read_manifest()
    root = (Path(".runtime") / release["release_id"]).resolve()
    verify(root, release)
    os.environ.update(MODEL_DIRECTORY=str(root / "model"), CATALOG_RELEASE=str(root / "catalog/release.json"),
        LISTENING_LINKS_RELEASE=str(root / "links/release.json"))
    return port


if __name__ == "__main__":
    try:
        port = configure()
    except (OSError, ValueError, KeyError):
        raise SystemExit("Production configuration or release validation failed; inspect the private configuration.") from None
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, workers=1, proxy_headers=False,
        access_log=False, log_level="info")
