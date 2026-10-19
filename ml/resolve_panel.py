"""Cache bounded MusicBrainz searches for the fixed panel, without using support counts."""

import hashlib
import json
from pathlib import Path
import sqlite3
import time
import unicodedata
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from ml.acquire_events import ROOT, reserve_transfer
from ml.audit_sample import USER_AGENT
from ml.inspect_spark import save

LIMIT = 512 * 1024


def normalized(title):
    return unicodedata.normalize("NFKC", title).casefold().strip()


def candidates(response, artist, title):
    matches = []
    for recording in response["recordings"]:
        artists = [credit["artist"]["id"] for credit in recording.get("artist-credit", [])
                   if isinstance(credit, dict) and "artist" in credit]
        if artist not in artists or normalized(recording["title"]) != normalized(title):
            continue
        matches.append({key:recording.get(key) for key in
                        ("id", "title", "disambiguation", "length", "video", "first-release-date")})
    return matches


def main():
    panel = json.loads(Path("docs/coverage-panel.json").read_text(encoding="utf-8"))
    root = Path("data/interim/panel-recordings")
    root.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(ROOT / "ledger.sqlite")
    db.execute("PRAGMA synchronous=FULL")
    report = dict(panel_status=panel["status"], tracks=[], complete=False,
                  selection="Exact artist ID and normalized title only; versions require review",
                  search_reference="https://musicbrainz.org/doc/MusicBrainz_API/Search/RecordingSearch")
    try:
        for artist in panel["artists"]:
            for title in artist["tracks"]:
                escaped = title.replace("\\", "\\\\").replace('"', '\\"')
                query = f'arid:{artist["mbid"]} AND recording:"{escaped}"'
                url = "https://musicbrainz.org/ws/2/recording/?" + urlencode(
                    dict(query=query, fmt="json", limit=100))
                key = hashlib.sha256(url.encode()).hexdigest()
                path = root / f"{key}.json"
                receipt = root / f"{key}.receipt.json"
                if receipt.exists():
                    raw = path.read_bytes()
                    saved = json.loads(receipt.read_text())
                    if saved["url"] != url or saved["sha256"] != hashlib.sha256(raw).hexdigest():
                        raise ValueError("Search cache provenance differs")
                else:
                    time.sleep(1.1)
                    # Offset -1 marks a bounded metadata lookup in the shared transfer ledger.
                    reserve_transfer(db, -1, LIMIT)
                    with urlopen(Request(url, headers={"User-Agent":USER_AGENT}),timeout=30) as response:
                        raw = response.read(LIMIT+1)
                    if len(raw) > LIMIT:
                        raise ValueError("MusicBrainz response exceeds reserved bound")
                    json.loads(raw)
                    path.write_bytes(raw)
                    save(receipt, dict(url=url, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw)))
                result = json.loads(raw)
                found = candidates(result, artist["mbid"], title)
                item = dict(artist=artist["name"], artist_mbid=artist["mbid"], title=title,
                            query_url=url, response_sha256=hashlib.sha256(raw).hexdigest(),
                            total_search_results=result["count"],
                            search_truncated=result["count"]>len(result["recordings"]),
                            exact_candidates=found, resolved_recording_mbid=None)
                report["tracks"].append(item)
                save(root/"resolution.json",report)
                print(json.dumps(dict(artist=artist["name"],title=title,exact_candidates=len(found))),flush=True)
        report["complete"] = True
        save(root/"resolution.json",report)
    except HTTPError as error:
        report["last_http_error"] = dict(status=error.code, artist=artist["name"], title=title,
                                          query_url=url)
        save(root/"resolution.json",report)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
