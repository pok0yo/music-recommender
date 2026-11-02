# Catalog startup recovery

Prepared November 2, 2026. This is a local implementation checkpoint; public activation requires the next deployment authorization. The public frontend remains on `0f06f43` until then.

## Behavior

Real starting-catalog requests now have a two-minute total recovery window. Each attempt retains the eight-second request limit (shortened to the remaining window near its end). After a timeout, connection failure, or HTTP 502/503/504, the client waits up to ten seconds before trying again. There is no background keepalive traffic. A successful first request adds no delay.

The intro and exposed side panel explain that the catalog is waking and retrying. This is a recovery status, not proof that the server is asleep. The existing eight-second escape to song controls remains available. Typed input is preserved; late catalog arrival does not replace a search or recommendation selection.

After the recovery window, a truthful error offers manual Try again, which starts a fresh window. Navigation, mode changes and replacement startup requests abort active fetches and retry timers. HTTP 429, other non-transient statuses, malformed JSON, invalid metadata and mixed real/demo responses fail without automatic retries. Ordinary search and recommendation requests retain their existing timeout and manual recovery behavior. Demo fixtures are unchanged; real failures never become illustrative results.

## Verification

The isolated production build and TypeScript pass. All 16 focused software-graphics browser checks passed (homepage, scene loader and startup recovery). They cover transient failure recovery, request timeout recovery, the full two-minute retry limit, no requests after exhaustion, fresh manual retry, input preservation, cancellation on switching to demo, rate limits and invalid response rejection.

Tests use a browser clock and intercepted responses; they do not intentionally put the production service to sleep or establish hosting uptime. Physical phones and Safari are not covered by this checkpoint.

Two additional focused checks passed for runtime contracts and real-mode outage behavior, for 18 passing checks total. Full GitHub validation is separate from this local result.

## Deployment and rollback

No backend, database, catalog, model or hosting-plan changes are needed. Deploy the reviewed frontend commit only after authorization and repeat anonymous startup, search, Discover and recovery checks. The current known-good deployment is `BMRXbVNtzQsW6gEYpw1KdngZfM63`, source `0f06f43f6756dd371cc4164a4e5c6f489739c11b`; restore that retained Vercel deployment or rebuild that exact commit to undo this frontend-only change. No database restore is needed.
