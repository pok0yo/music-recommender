# November 1 public frontend update

The loading screen and stylized water are publicly deployed at **https://project-3wvwg.vercel.app**. Hosted functional checks passed. Full GitHub validation also passed on test follow-up `6efb245`: 73 browser, 34 backend and 48 model checks.

## Deployed source

Vercel Hobby deployment **`BMRXbVNtzQsW6gEYpw1KdngZfM63`** uses frontend source **`0f06f43f6756dd371cc4164a4e5c6f489739c11b`**. Vercel reported Ready after 30 seconds. It includes the loading screen (`605ccc7`), stylized water (`968c888`), loader cleanup (`45f2679`) and startup animation gate (`0f06f43`). Later test/documentation changes do not alter the deployed application.

The intro covers unfinished graphics, waits for initial data and a prepared scene, and offers song controls after eight seconds if startup is slow. Continuous 3D animation stays paused behind the intro and while the scene is still preparing after an early bypass. The overlay fades over 280 ms and is removed after 300 ms. Reduced motion and genuine API/graphics recovery remain available.

The water adds displaced swells, layered drifting highlights and distorted live reflections while retaining the palette, horizon, environment controls and disc interactions. [Implementation and attribution](stylized-water.md).

## Verified behavior

- An anonymous HTTP client received 200 at the stable public URL without a login redirect. The initial response contains the loader; the previous release did not.
- Live search for Tiffany returned real catalog tracks. ALWAYS FUN produced ten recommendations; LOYOLA as the next seed produced ten more.
- Dismissal and Undo preserved original model ranks. Spotify, Apple Music and YouTube Music searches were labeled as searches and used `noopener noreferrer` with new-tab links.
- Back and refresh restored the selected seed. Explanations, catalog limits and keyboard pause/resume worked. No browser errors were observed in this journey.
- The explicit pending demo displayed the loader and its song-control escape. The escape focused search and preserved the demonstration label. No real failure was replaced with demo data.
- Independent public API checks matched all 32 approved starters and verified three starter-to-recommendation-to-recommendation journeys, with ten results at each step and correct public-origin CORS. This is a smoke sample, not a new accuracy or complete-catalog evaluation.

The browser viewport override did not apply: observed width remained 1280. No new hosted narrow-layout result is claimed. Local 390x844 checks passed; physical phones, Safari and provider playback/login remain unverified.

## Source checks and completed CI follow-up

The production build and TypeScript pass. Final application checks passed locally: 12 hardware Chrome homepage/loader/water checks and six software-graphics loader/water checks. Earlier record-desk/artwork/loader/water checks passed 15 cases with each graphics path.

[GitHub run 41369907722](https://github.com/pok0yo/music-recommender/actions/runs/41369907722) passed startup validation but timed out in the long animated-water test. Test-only `30600e5` removed an unnecessary panel-close action. [Run 41372567912](https://github.com/pok0yo/music-recommender/actions/runs/41372567912) then timed out in the compound recovery and animated-water cases; the other browser checks passed. The logs establish late-action timeouts, not that a specific panel was already closed.

Test-only `6efb2459af25a8e3bbefecb8f15a3acfb0dea5a9` keeps all behavior assertions and the same CSS layout, uses DPR 0.5 for CPU-only water checks, and allows 180 seconds for the seven-scenario recovery check. Both affected checks passed locally, then [Frontend run 41382456355](https://github.com/pok0yo/music-recommender/actions/runs/41382456355) passed all six groups: **73 browser checks**. The animated-water case took 1.8 minutes and compound recovery took 2.2 minutes on GitHub's CPU graphics. [Backend/model run 41382456216](https://github.com/pok0yo/music-recommender/actions/runs/41382456216) passed **34 backend and 48 model checks** on the same commit. There are no pending failures in these completed runs. Production application files are unchanged between deployed `0f06f43` and verified `6efb245`; the later commits adjust tests only.

Tracked summary: [release-update-2026-11-01.json](evidence/release-update-2026-11-01.json). Raw diagnostics and public captures remain ignored under `artifacts/release-update-checks/`.

## Unchanged services and limits

The API remains **https://music-recommender-api-7pp6.onrender.com**, source `4645fa76e8574da245ddf61436eab39742047d55`, model `item-cf-cohort-v2-lambda-50`, catalog `catalog-v2-1c2f222147176b362426ab426936307f16d273de21bbd9b9ed6eee0b629c9766`. No backend deployment, schema/data change, metadata acquisition, model release, credential change or paid plan change was needed. Unrelated working-tree drafts were excluded. Automatic Git deployments remain off.

CPU-only 3D rendering remains slow; native controls, pause, reduced motion and graphics fallback remain available. Free Render can sleep beyond the frontend request timeout and require Retry. This update does not establish better recommendation accuracy or always-on hosting.

## Exact frontend rollback

1. Open [Vercel Deployments](https://vercel.com/pok0yo/music-recommender/deployments). Previous production deployment: **`CcwsaMReNC1umCmxFKqAjYjtq2jK`**, source **`4645fa76e8574da245ddf61436eab39742047d55`**.
2. Restore that retained deployment if its rollback/promotion control is available. Otherwise use Deployments actions > Create Deployment, paste that exact source commit, confirm Production and deploy. Retain the existing production API variable and public domain.
3. Require anonymous homepage access, real search, Discover, reseeding, listening labels, dismissal and Undo after recovery. No database restore is needed for this frontend-only rollback. A public switch back and forward was not rehearsed.
