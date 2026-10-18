"""Probe the first entries of a pinned Spark tar via bounded HTTP ranges.

This reads archive headers, not listening payloads. Payload integrity and data
feasibility remain unverified even when this deliberately partial probe succeeds.
"""

import argparse
import json
from pathlib import Path
import tarfile
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

from ml.audit_sample import USER_AGENT

URL = (
    "https://data.metabrainz.org/pub/musicbrainz/listenbrainz/fullexport/"
    "listenbrainz-dump-2722-20261015-000002-full/"
    "listenbrainz-spark-dump-2722-20261015-000002-full.tar"
)
SIZE = 247_707_453_440
ETAG = '"6ad31670-39ac83c800"'
MAX_REQUESTS = 128
MAX_BYTES = 4 * 1024**2


class RangeReader:
    def __init__(self, *, max_requests=MAX_REQUESTS, max_bytes=MAX_BYTES, max_read=64 * 1024, connection=None):
        self.position = 0
        self.requests = 0
        self.bytes_read = 0
        self.reserved_bytes = 0
        self.max_requests = max_requests
        self.max_bytes = max_bytes
        self.max_read = max_read
        self.connection = connection

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        bases = {0: 0, 1: self.position, 2: SIZE}
        if whence not in bases or not 0 <= bases[whence] + offset <= SIZE:
            raise ValueError("Seek outside archive")
        self.position = bases[whence] + offset
        return self.position

    def read(self, size):
        if not 0 <= size <= self.max_read:
            raise ValueError("Refusing an unbounded range request")
        size = min(size, SIZE - self.position)
        if size == 0:
            return b""
        if self.requests >= self.max_requests or self.reserved_bytes + size + 1 > self.max_bytes:
            raise ValueError("Header probe resource budget exceeded")
        end = self.position + size - 1
        request = Request(URL, headers={
            "Range": f"bytes={self.position}-{end}", "If-Match": ETAG,
            "User-Agent": USER_AGENT,
        })
        self.requests += 1
        # Reserve before I/O so failed reads cannot reset the transfer budget.
        self.reserved_bytes += size + 1
        if self.connection is None:
            response = urlopen(request, timeout=30)
        else:
            self.connection.request("GET", urlsplit(URL).path, headers=dict(request.header_items()))
            response = self.connection.getresponse()
        with response:
            expected = f"bytes {self.position}-{end}/{SIZE}"
            if response.status != 206 or response.headers.get("Content-Range") != expected:
                raise ValueError("Server did not honor the exact range; refusing download")
            if response.headers.get("ETag") != ETAG:
                raise ValueError("Remote archive version changed")
            data = response.read(size + 1)
        if len(data) != size:
            raise ValueError("Range length differs from expected bytes")
        self.position += size
        self.bytes_read += size
        return data


def inventory(reader, limit=8):
    members = []
    with tarfile.open(fileobj=reader, mode="r:") as archive:
        for member in archive:
            if member.isfile():
                members.append({"path": member.name, "bytes": member.size, "offset": member.offset_data})
                if len(members) >= limit:
                    break
    return members


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/interim/spark-inventory.json"))
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output exists; choose another path")
    reader = RangeReader()
    members = inventory(reader)
    report = dict(
        source_url=URL, archive_bytes=SIZE, etag=ETAG,
        requests=reader.requests, transferred_bytes=reader.bytes_read,
        payloads_verified=False, full_inventory=False, member_limit=8, members=members,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(report, output, indent=2, sort_keys=True)
        output.write("\n")
    print(json.dumps({**report, "members": len(members)}, indent=2))


if __name__ == "__main__":
    main()
