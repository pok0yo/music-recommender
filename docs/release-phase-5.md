# Phase 5 — public deployment in progress

Checkpoint: 2026-10-30. Phase 5 was authorized after the Phase 4 preparation at `59d15460685040ee95fa8fc1443827a58c8828e4`. **The website is not publicly deployed and release acceptance has not been established.** The free-only, personal/noncommercial hosting constraints and the selected interface remain unchanged.

## Completed and verified

- User explicitly selected **pok0yo's Org** (`bwpbbjelktuneannjlwy`) for the new dedicated project.
- A fresh Supabase project cost quote returned **$0/month**, matching the approved budget.
- Created `music-recommender`, project reference `qhqwtuxxebcsccvklgxy`, in `us-east-2`. Subsequent account/project queries reported `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.011`.
- The unrelated project `zsocsnsdivjirsrpxqvm` remains `INACTIVE`; it was not restored or modified.
- Read-only SQL confirmed that `music_catalog` and `music_reader` did not exist before setup. The prepared `music_catalog_release_schema` migration requested an interactive tool confirmation, which expired before approval. A subsequent read-only query confirmed **no catalog schema and no reader role**. Do not treat this attempt as an applied migration.
- Render and Vercel browser sessions are now signed in. Their setup pages still require the GitHub application/repository connection before the private repository can be imported. No hosting service or frontend deployment has been created by this run.

The current Supabase changelog was checked, including [PostgreSQL 17.11 changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) and [explicit Data API table grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). This application uses the private schema through PostgreSQL, not the public Data API. No extension-specific migration or public table access was added.

## Required access and next actions

1. Complete Render's GitHub connection and Vercel's GitHub application installation, reviewing their permission screens and selecting only `pok0yo/music-recommender` wherever repository selection is offered. New repository access requires user approval; it has not been granted by the agent.
2. Reissue the exact prepared schema migration for **the existing new project** and approve its tool confirmation promptly. Use `deploy/roles.sql`, `backend/schema.sql` and `backend/listening_links.sql`, plus CONNECT for the reader. Recheck actual schema, RLS and privileges afterward. Do not create another project to retry setup.
3. Complete the operator-only database/Storage configuration, transactionally import the existing catalog and link releases using the prepared tools, upload the eight pinned files to private Storage, then deploy the exact prepared source on the approved free plans. Keep private credentials out of Git, chat and the frontend. Follow the [Phase 4 runbook](release-phase-4.md) for configuration, verification and rollback.

The selected deployment release remains `7809c65ae924d8d88fd748223da2e9061e1b87bcb15f69ff105193c4337f8bf5`. No raw listening data, model inputs or catalog rows have been uploaded during this checkpoint. No private deployment credentials have been added to source control.

## Verification still outstanding

There is no public frontend/API URL yet. Hosted TLS, actual release loading, search/recommendation/reseed journeys, listening links, device-local feedback, error recovery, memory/latency, idle wake, logs, backups and hosted rollback remain unverified. The earlier 67 browser and 80 backend/model checks validate the Phase 4 source locally and in CI; they are not a production smoke result. The current changes are documentation only, so those suites were not rerun solely for this checkpoint.

Phase 5 remains authorized and incomplete. Account access and the migration confirmation are the current blockers; a new general deployment approval is not required to resume the same approved configuration.
