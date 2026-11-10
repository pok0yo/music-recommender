"""Separate, resumable metadata allowance; never touches the Stage 6 ledger."""

import hashlib
import gzip
import io
import json
from pathlib import Path
import sqlite3
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit, urljoin, urlunsplit, parse_qsl, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler

from ml.audit_sample import USER_AGENT

DOWNLOAD_CAP = 256 * 1024**2
DISK_CAP = 1024**3
RESPONSE_LIMIT = 512 * 1024
EXPANDED_LIMIT = 4 * 1024**2
OVERHEAD = 16 * 1024
ROOT = Path("data/interim/catalog-expansion-v2")
OUTPUT = Path("data/processed/catalog-expansion-v2")


def response_limit(url):
    return RESPONSE_LIMIT if urlsplit(url).path.rstrip('/').endswith('/recording') else 16 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class MetadataCache:
    def __init__(self, root=ROOT, output=OUTPUT, allowed_url=None):
        self.root, self.output = Path(root), Path(output)
        self.allowed_url=allowed_url
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = sqlite3.connect(self.root / "process-lock.sqlite", timeout=0)
        self.lock.execute("BEGIN EXCLUSIVE")
        self.db = sqlite3.connect(self.root / "ledger.sqlite")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS allowance(download_cap INTEGER, disk_cap INTEGER);
            CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY,url TEXT,reserved INTEGER,started REAL,status INTEGER,received INTEGER);
            CREATE TABLE IF NOT EXISTS responses(url TEXT PRIMARY KEY,body BLOB,sha256 TEXT);
            CREATE TABLE IF NOT EXISTS redirects(url TEXT PRIMARY KEY,target TEXT,status INTEGER);
        """)
        with self.db:
            if not self.db.execute("SELECT * FROM allowance").fetchall():
                self.db.execute("INSERT INTO allowance VALUES (?,?)", (DOWNLOAD_CAP, DISK_CAP))
        if self.db.execute("SELECT * FROM allowance").fetchall() != [(DOWNLOAD_CAP, DISK_CAP)]:
            raise ValueError("Metadata allowance differs; do not reset the ledger")

    def disk_bytes(self):
        return sum(p.stat().st_size for root in (self.root, self.output) if root.exists()
                   for p in root.rglob('*') if p.is_file())

    def reserve(self, url):
        parsed = urlsplit(url)
        official=parsed.scheme == "https" and parsed.netloc == "musicbrainz.org" and parsed.path.startswith('/ws/2/recording')
        if not official and not (self.allowed_url and self.allowed_url(url)):
            raise ValueError("Only official recording metadata requests are allowed")
        if self.disk_bytes() + EXPANDED_LIMIT * 3 > DISK_CAP:
            raise ValueError("New metadata disk allowance exhausted")
        with self.db:
            self.db.execute("BEGIN IMMEDIATE")
            total = self.db.execute("SELECT coalesce(sum(reserved),0) FROM requests").fetchone()[0]
            reservation = response_limit(url) + 1 + OVERHEAD
            if total + reservation > DOWNLOAD_CAP:
                raise ValueError("New metadata download allowance exhausted; no request sent")
            return self.db.execute("INSERT INTO requests(url,reserved,started) VALUES (?,?,?)",
                                   (url, reservation, time.time())).lastrowid

    def get(self, url, redirects=0):
        if redirects>3:
            raise ValueError('Too many metadata redirects')
        redirect=self.db.execute('SELECT target FROM redirects WHERE url=?',(url,)).fetchone()
        if redirect:return self.get(redirect[0],redirects+1)
        parsed=urlsplit(url);query=sorted(parse_qsl(parsed.query,keep_blank_values=True))
        equivalent=urlunsplit((parsed.scheme,parsed.netloc,parsed.path,urlencode(query),parsed.fragment))
        cached = self.db.execute("SELECT body,sha256 FROM responses WHERE url IN (?,?) ORDER BY url=? DESC", (url,equivalent,url)).fetchone()
        if cached:
            body, digest = cached
            if hashlib.sha256(body).hexdigest() != digest:
                raise ValueError("Cached metadata checksum differs")
            return json.loads(body), digest
        missing=self.db.execute('SELECT status FROM requests WHERE url=? ORDER BY id DESC LIMIT 1',(url,)).fetchone()
        if missing and missing[0] in (404,410):
            raise HTTPError(url,missing[0],'Previously recorded unavailable metadata',{},None)
        for attempt in range(5):
            last = self.db.execute("SELECT max(started) FROM requests").fetchone()[0] or 0
            time.sleep(max(0, 1.1 - (time.time() - last)))
            request_id = self.reserve(url)
            try:
                with build_opener(NoRedirect).open(Request(url, headers={"User-Agent": USER_AGENT,
                        "Accept": "application/json", "Accept-Encoding": "gzip"}), timeout=40) as response:
                    body = response.read(response_limit(url) + 1)
                    encoding = response.headers.get('Content-Encoding','identity')
                if len(body) > response_limit(url):
                    raise ValueError("Metadata response exceeds reserved size; reduce batch")
                received=len(body)
                if encoding=='gzip':
                    with gzip.GzipFile(fileobj=io.BytesIO(body)) as stream:
                        body=stream.read(EXPANDED_LIMIT+1)
                elif encoding!='identity':
                    raise ValueError('Unexpected metadata encoding')
                if len(body)>EXPANDED_LIMIT:
                    raise ValueError('Expanded metadata exceeds disk bound')
                value = json.loads(body)
                if not isinstance(value, dict):
                    raise ValueError("Invalid metadata response")
                digest = hashlib.sha256(body).hexdigest()
                with self.db:
                    self.db.execute("INSERT INTO responses VALUES (?,?,?)", (url, body, digest))
                    self.db.execute("UPDATE requests SET status=200,received=? WHERE id=?", (received,request_id))
                return value, digest
            except HTTPError as error:
                code, retry = error.code, error.headers.get("Retry-After", "")
                location=error.headers.get('Location','')
                error.close()
                with self.db:
                    self.db.execute("UPDATE requests SET status=? WHERE id=?", (code,request_id))
                if code in (301,302,307,308) and location:
                    target=urljoin(url,location);parsed=urlsplit(target)
                    if parsed.scheme!='https' or parsed.netloc!='musicbrainz.org' or not parsed.path.startswith('/ws/2/recording/'):
                        raise ValueError('Untrusted metadata redirect')
                    with self.db:self.db.execute('INSERT INTO redirects VALUES (?,?,?)',(url,target,code))
                    return self.get(target,redirects+1)
                if code not in (429,502,503,504) or attempt == 4:
                    raise
                delay = int(retry) if retry.isdigit() else (10,30,60,60)[attempt]
                if delay > 60:
                    raise RuntimeError(f"Provider requests a {delay}-second pause; resume later") from None
                time.sleep(max(1.1, delay))

    def summary(self):
        count, reserved, received = self.db.execute(
            "SELECT count(*),coalesce(sum(reserved),0),coalesce(sum(received),0) FROM requests").fetchone()
        return dict(requests=count,reserved_bytes=reserved,received_body_bytes=received,
                    download_cap_bytes=DOWNLOAD_CAP,disk_cap_bytes=DISK_CAP,disk_bytes=self.disk_bytes(),
                    accounting="Bounded response bytes plus conservative per-attempt overhead, not packet-level metering")

    def close(self):
        self.db.close()
        self.lock.rollback()
        self.lock.close()
