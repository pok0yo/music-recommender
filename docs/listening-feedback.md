# Listening destinations and device feedback

## Current checkpoint

The selected Orbital record desk has one Listen menu and recommendation feedback. The live API still serves the unchanged 4,996-record catalog and frozen model. The 32 approved starters remain the initial shelf. No provider lookup runs in a discovery request.

For each of Spotify, Apple Music and YouTube Music, Listen uses a validated recording destination when the separately configured link release supplies one. Otherwise it explicitly offers **Search on [service]** using the title, credited artist and disambiguation. Search results require the user to choose the matching version. External pages load only after a click, in a new tab without opener/referrer access. Demo mode offers no outbound listening destinations.

The 215-record pilot is **imported and active in the local API** following approval. Real-mode controls now use its 130 checked recording links across 76 recordings, with labeled provider searches for missing destinations. Nine of the 32 approved starters have at least one checked link. Broader acquisition across the catalog still requires a separate go. This is not a public deployment.

## Pilot results and provenance

| Measurement | Observed |
| --- | ---: |
| Recordings checked | 215 |
| Recordings with checked links | 76 |
| Approved starters with checked links | 9 / 32 |
| Spotify links | 72 |
| Apple Music links | 43 |
| YouTube Music links | 15 |
| Total checked links | 130 |
| Rejected HTTP 404 destinations | 5 |
| Charged attempts, including failures and redirects | 542 |
| Reserved download allowance | 17,760,798 bytes / 256 MiB |
| Cache/output disk at preparation | 737,572 bytes / 1 GiB |
| Paid services | $0 |

[Preparation evidence](evidence/listening-links-pilot.json) pins the link content, provenance hash and catalog version; its inactive flag describes the preparation checkpoint. [Activation evidence](evidence/listening-links-activation.json) records the later approved local import/activation. The source bodies, destination receipts, historical failures and SQLite acquisition ledger remain in ignored local data folders. The separate catalog-expansion ledger was not reset or charged. Activation made no new acquisition requests.

Each accepted link requires a non-ended recording-level MusicBrainz streaming relationship, matching canonical recording and artist identities, an approved HTTPS provider URL, and a successful HTTP destination check. Generic YouTube pages and album-only Apple links are excluded. Redirects cannot change provider or resource ID. HTTP success does not guarantee playback, region access, subscription entitlement or permanent availability; source relationship errors remain possible. Coverage improvements are not recommendation-accuracy improvements.

The probe uses system and installed CA roots with certificate verification enabled. Initial unconfirmed TLS failures were retained and charged, then retried successfully after supplementing the CA bundle. The HTTP 404 results remain unavailable. Download accounting reserves bounded response bytes plus conservative overhead, not packet-level traffic.

Official source references: [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API), [rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting), [URL relationships](https://musicbrainz.org/doc/Style/Relationships/URLs). Recording metadata is cached; MusicBrainz requests are spaced at least 1.1 seconds apart, with bounded retries/backoff. Provider checks are also charged and spaced. No authenticated provider API or paid resolver is used.

## Feedback behavior

- **More like this** explicitly makes the visible recording the next seed through the existing discovery flow.
- **Not for me** hides that recording from recommendations on this device, without changing the seed or requesting replacements.
- **Undo** restores the most recently dismissed recording. **Reset feedback** clears device dismissals.
- Hidden counts are separate from API metadata omissions. Model ranks are retained. An all-hidden list offers recovery and disables Discover until a song is available.
- Versioned storage contains validated recording IDs only, capped at 1,000. Corrupt values are ignored; unavailable storage falls back to the current visit with a visible message. Real/demo keys are separate.
- Feedback is not synced, sent to the backend, used for training or presented as learned taste. Existing native controls, reduced motion and graphics fallback remain available.

## Reproduce, start and roll back

Offline verification, with the ignored pilot files present:

```powershell
.venv/Scripts/python.exe -m backend.prepare_listening_links --verify-only
```

The preparation command without `--verify-only` can make external requests; it preserves the same ledger and caps. `--retry-unconfirmed` retries network-unconfirmed destination receipts while archiving their previous state. Do not run broader acquisition without separate authorization.

The approved import completed using `.venv/Scripts/python.exe -m backend.listening_links`. The transaction retains prior link releases, validates catalog identity/content and grants the existing reader only SELECT. Import alone does not activate a release. A mismatched/unreadable configured release fails readiness rather than serving unverified links.

The current API process has the release enabled. When starting a new API process, use this from the repository root to retain the active pilot:

```powershell
$env:LISTENING_LINKS_RELEASE = (Resolve-Path 'data/processed/listening-links-v1/release.json').Path
.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers
```

The setting belongs to that process environment; a new shell without it starts in search-only mode. No user-wide environment variable, credential or private configuration was added.

**Rollback:** remove `LISTENING_LINKS_RELEASE` from the API process environment and restart the API. Responses return empty `listening_links` and Listen returns to labeled searches. No catalog, model, mapping table or ledger is deleted. For a later mapping upgrade, point the variable back to a retained compatible release and restart. Device feedback is independently cleared through Reset feedback.

Stop the running API, then start its replacement from this shell:

```powershell
Remove-Item Env:LISTENING_LINKS_RELEASE -ErrorAction SilentlyContinue
.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --no-access-log --no-proxy-headers
```

## Validation and source scope

Completed locally at this checkpoint: production build, TypeScript validation, 23 backend tests, 48 existing model/audit tests and all 93 browser tests in the current checkout. The active catalog/rollback verifier also passed all 4,996 payload checks and 314 seed queries with unchanged ranks, support and omissions. The live listening/feedback check passed against the running API without response interception. This does not activate the link pilot.

`backend/tests/test_listening_links.py` covers URL validation, release identity/hash, immutable catalog payloads, redirects and fail-closed configuration. Existing backend checks cover API input bounds, ranks and metadata omissions. `tests/frontend/listening-feedback.spec.ts` covers exact/search presentation, malformed storage, persistent dismissal, Undo/reset, all-hidden recovery, reseeding, retained canvas, mobile layout and graphics fallback.

`node scripts/verify-listening-feedback.mjs` checks the actual local real-mode API and selected website, including search, three search destinations, feedback, reseeding, browser history, retained canvas, absent demo links and zero unsolicited external requests. [Live evidence](evidence/listening-feedback-verification.json). Screenshots and downloaded metadata are excluded from the feature commit.

After activation, `.venv/Scripts/python.exe -m backend.verify_listening_links` verified all imported mappings, catalog and rollback hashes, SELECT-only permissions, 99 recommendation seed queries, unchanged model ranks/omissions, live starter mappings and an isolated no-link rollback. `node scripts/verify-listening-feedback.mjs --pilot-active` verified exact destinations for all three services in the actual website, feedback/Undo/reseeding/history, retained canvas, absent demo links and zero unsolicited external requests. [Active UI evidence](evidence/listening-feedback-activation-ui.json). Neither verification performs provider acquisition.

The selected record desk and its shared 3D components were still untracked or modified from earlier authorized UI work. Necessary source dependencies and their fallback artwork are included so this feature works in a clean checkout. Unused rendering exports, old capture scripts, private configuration and unrelated document changes remain outside this commit.

The previous GitHub frontend run built and typechecked successfully, but its browser step was canceled near the 15-minute job limit. The local 93-test browser suite passed; the GitHub backend/model job passed. No new frontend runtime change was needed for pilot activation.

Not checked: physical devices, Safari and actual provider playback. Broader acquisition remains outside this activation.
