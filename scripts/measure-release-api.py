"""Measure a separately started, loopback-only real API; never changes releases or data."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import platform
import time
from urllib.parse import urlencode, urlparse

import httpx


def percentile(values, fraction):
    ordered = sorted(values)
    return round(ordered[math.ceil(len(ordered) * fraction) - 1], 3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8001')
    parser.add_argument('--output', type=Path, default=Path('docs/evidence/release-phase-3-api.json'))
    args = parser.parse_args()
    assert urlparse(args.url).hostname in ('127.0.0.1', 'localhost'), 'Use an isolated local test service'
    assert percentile([4, 1, 3, 2], .5) == 2 and percentile([4, 1, 3, 2], .95) == 4
    with httpx.Client(base_url=args.url, timeout=20, limits=httpx.Limits(max_connections=5)) as client:
        ready = client.get('/health/ready'); ready.raise_for_status()
        meta = ready.json()['meta']; assert meta['data_mode'] == 'real'
        starters = client.get('/v1/catalog/starters'); starters.raise_for_status()
        seeds = [track['recording_id'] for track in starters.json()['results']]
        assert len(seeds) == 32
        artists = ['nate sib', 'Tiffany Day', 'che', '2hollis', 'Lucy Bedroque',
                   'beabadoobee', 'Daniel Caesar', 'Steve Lacy', 'Bruno Mars', 'Giveon']
        samples = {
            'starters': ['/v1/catalog/starters'],
            'search': ['/v1/catalog/search?' + urlencode({'q': artist}) for artist in artists],
            'recommendations': ['/v1/recommendations/' + seed for seed in seeds],
        }
        result = dict(measured_at=datetime.now(timezone.utc).isoformat(), platform=platform.platform(),
                      transport='loopback HTTP, no network throttling', clients=5, requests_per_endpoint=100,
                      warmup_requests_per_endpoint=5, meta=meta, endpoints={},
                      caveat='Isolated API uses an elevated test-only rate limit; normal rate-limit behavior is tested separately. Not deployed performance.')
        for name, paths in samples.items():
            for index in range(5):
                warm = client.get(paths[index % len(paths)]); warm.raise_for_status()

            def request(index):
                start = time.perf_counter()
                try:
                    response = client.get(paths[index % len(paths)])
                    if response.status_code == 200:
                        body = response.json()
                        assert body['meta'] == meta, 'Release changed during measurement'
                        assert body['results'], 'Expected supported sample results'
                    return (time.perf_counter() - start) * 1000, str(response.status_code)
                except httpx.HTTPError as error:
                    return (time.perf_counter() - start) * 1000, type(error).__name__

            started = time.perf_counter()
            with ThreadPoolExecutor(max_workers=5) as pool:
                observations = list(pool.map(request, range(100)))
            times = [elapsed for elapsed, status in observations if status == '200']
            statuses = dict(Counter(status for _, status in observations))
            result['endpoints'][name] = dict(sample_paths=paths, statuses=statuses,
                elapsed_seconds=round(time.perf_counter()-started, 3),
                median_ms=percentile(times, .5) if times else None,
                p95_ms=percentile(times, .95) if times else None,
                max_ms=round(max(times), 3) if times else None,
                target_met=statuses == {'200': 100} and percentile(times, .95) < 500)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
