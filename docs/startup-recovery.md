# Catalog startup recovery

Published November 2, 2026 at **https://project-3wvwg.vercel.app/**. Vercel production deployment `MzsirePySd7yyoPXYhG4RCgF5X43` is Ready, built in 30 seconds from `575def55f8515184fd25a9ec7be618160f73c0c6`.

## Behavior

Real starting-catalog requests now have a two-minute total recovery window. Each attempt retains the eight-second request limit (shortened to the remaining window near its end). After a timeout, connection failure, or HTTP 502/503/504, the client waits up to ten seconds before trying again. There is no background keepalive traffic. A successful first request adds no delay.

The intro and exposed side panel explain that the catalog is waking and retrying. This is a recovery status, not proof that the server is asleep. The existing eight-second escape to song controls remains available. Typed input is preserved; late catalog arrival does not replace a search or recommendation selection.

After the recovery window, a truthful error offers manual Try again, which starts a fresh window. Navigation, mode changes and replacement startup requests abort active fetches and retry timers. HTTP 429, other non-transient statuses, malformed JSON, invalid metadata and mixed real/demo responses fail without automatic retries. Ordinary search and recommendation requests retain their existing timeout and manual recovery behavior. Demo fixtures are unchanged; real failures never become illustrative results.

## Verification

The isolated production build and TypeScript pass. All 16 focused software-graphics browser checks passed (homepage, scene loader and startup recovery). They cover transient failure recovery, request timeout recovery, the full two-minute retry limit, no requests after exhaustion, fresh manual retry, input preservation, cancellation on switching to demo, rate limits and invalid response rejection.

Tests use a browser clock and intercepted responses; they do not intentionally put the production service to sleep or establish hosting uptime. Physical phones and Safari are not covered by this checkpoint.

Two additional focused checks passed for runtime contracts and real-mode outage behavior, for 18 passing checks total. Full GitHub validation is separate from this local result.

[Frontend run 41400743295](https://github.com/pok0yo/music-recommender/actions/runs/41400743295) passed all 80 browser checks on attempt 2. The only first-attempt failure was the existing animated-water case reaching its 180-second limit at its final diagnostic screenshot after interaction assertions completed. Only that group was rerun, with no source changes or relaxed assertions; it passed, including the water case in 2.3 minutes. [Backend/model run 41400743071](https://github.com/pok0yo/music-recommender/actions/runs/41400743071) passed 34 backend and 48 model checks.

Hosted checks confirmed anonymous HTTP 200 without cookies or a login redirect, the new recovery message in the served application bundle, 32 real starters, Tiffany search, ten recommendations from ALWAYS FUN, and ten after reseeding with LOYOLA. No browser errors were observed. This visit loaded without needing the extended retry window; a production cold-start recovery was not forced or measured. Retry timing and exhaustion are verified with the controlled browser tests above.

## Deployment and rollback

Only the authorized frontend was deployed. Backend, database, catalog, model and hosting plan remain unchanged; automatic Git deployments remain off. Unrelated local drafts were excluded. Evidence: [startup-recovery-release.json](evidence/startup-recovery-release.json).

The previous known-good deployment is `BMRXbVNtzQsW6gEYpw1KdngZfM63`, source `0f06f43f6756dd371cc4164a4e5c6f489739c11b`. To roll back, open Vercel > music-recommender > Deployments and restore that retained deployment if its rollback/promotion action is available. Otherwise use Deployments actions > Create Deployment with that exact source commit, confirm Production and deploy with the existing API variable/domain. Then require anonymous access, real search, Discover and reseeding. No database restore is needed. A public rollback switch was not rehearsed.
