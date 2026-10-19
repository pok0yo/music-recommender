"""Cache authoritative recording lookups; report redirects without inferring merges."""

import hashlib
import json
from pathlib import Path
import sqlite3

from ml.acquire_events import ROOT
from ml.audit_events import MBID
from ml.inspect_spark import save
from ml.resolve_panel import fetch


def redirects(report):
    if not report.get("complete") or len(report["lookups"]) != report["inventory_count"]:
        raise ValueError("Identity lookup inventory is incomplete")
    mapping={r["requested_mbid"]:r["canonical_mbid"] for r in report["lookups"]}
    if len(mapping)!=len(report["lookups"]) or not all(
            MBID.fullmatch(a) and MBID.fullmatch(b) for a,b in mapping.items()):
        raise ValueError("Identity lookup contains duplicate or invalid IDs")
    for row in report["lookups"]:
        a,b=row["requested_mbid"],row["canonical_mbid"]
        if row["redirected"] != (a!=b) or mapping.get(b)!=b:
            raise ValueError("Canonical targets must have stable independent lookups")
    return {a:b for a,b in mapping.items() if a!=b}


def identity(requested, response):
    canonical = response.get("id", "")
    if not MBID.fullmatch(requested) or not MBID.fullmatch(canonical):
        raise ValueError("Recording lookup must return a valid recording ID")
    artists = [c["artist"]["id"] for c in response.get("artist-credit", [])
               if isinstance(c, dict) and "artist" in c]
    if not artists or not all(MBID.fullmatch(a) for a in artists) or not response.get("title"):
        raise ValueError("Recording lookup is missing core identity fields")
    return dict(requested_mbid=requested, canonical_mbid=canonical,
                redirected=requested != canonical, artist_mbids=artists,
                **{k:response.get(k) for k in
                   ("title", "length", "disambiguation", "video", "isrcs", "first-release-date")})


def main():
    panel_path=Path("docs/evidence/stage-6-panel-resolution.json")
    diagnostic_path=Path("docs/evidence/stage-6-identity-discovery-v2.json")
    panel=json.loads(panel_path.read_text(encoding="utf-8"))
    diagnostic=json.loads(diagnostic_path.read_text(encoding="utf-8"))
    ids={t["resolved_recording_mbid"] for t in panel["tracks"] if t["resolved_recording_mbid"]}
    ids.update(c["id"] for t in panel["tracks"] if not t["resolved_recording_mbid"]
               for c in t["exact_candidates"])
    ids.update(c["recording_mbid"] for t in diagnostic["tracks"]
               for c in t["observed_submitted_ids"] if c["recording_mbid"])
    root=Path("data/interim/panel-identity-lookups")
    root.mkdir(parents=True,exist_ok=True)
    report=dict(complete=False, observed_on="2026-10-19", inventory_count=len(ids),
                panel_sha256=hashlib.sha256(panel_path.read_bytes()).hexdigest(),
                diagnostic_sha256=hashlib.sha256(diagnostic_path.read_bytes()).hexdigest(),
                policy="Only an authoritative lookup returning a different ID establishes a redirect. Shared title, ISRC, duration or artist alone never merges IDs.",
                lookups=[])
    db=sqlite3.connect(ROOT/"ledger.sqlite")
    db.execute("PRAGMA synchronous=FULL")
    try:
        for mbid in sorted(ids):
            if not MBID.fullmatch(mbid):
                raise ValueError("Invalid recording ID in lookup inventory")
            url=f"https://musicbrainz.org/ws/2/recording/{mbid}?inc=artist-credits+isrcs&fmt=json"
            path=root/f"{mbid}.json"
            receipt=root/f"{mbid}.receipt.json"
            if receipt.exists():
                raw=path.read_bytes()
                saved=json.loads(receipt.read_text())
                if saved["url"] != url or saved["sha256"] != hashlib.sha256(raw).hexdigest():
                    raise ValueError("Recording cache provenance differs")
            else:
                raw=fetch(db,url)
                path.write_bytes(raw)
                save(receipt,dict(url=url,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw)))
            item=identity(mbid,json.loads(raw))
            item.update(url=url,response_sha256=hashlib.sha256(raw).hexdigest())
            report["lookups"].append(item)
            save(root/"report.json",report)
            print(json.dumps(dict(completed=len(report["lookups"]),requested=mbid,
                                  canonical=item["canonical_mbid"])),flush=True)
        report["complete"]=True
        report["reserved_bytes_total"]=db.execute("SELECT SUM(reserved) FROM requests").fetchone()[0]
        save(root/"report.json",report)
    finally:
        db.close()


if __name__=="__main__":
    main()
