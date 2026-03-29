# Target Architecture

## Product Assumptions

These assumptions reflect the current source systems plus the revised direction for `VATSIM-Monitor`.

1. VATSIM OAuth is optional.
2. The system must work fully without VATSIM OAuth approval.
3. The application supports multiple local users.
4. A local user may optionally link a VATSIM identity later.
5. Monitoring and notifications remain the core product capability.
6. UK top-down logic remains a supported feature, but should become a modular provider rather than a hard-coded special case in the runtime core.

## What Exists Today

### Source web app

The current web app handles:

- VATSIM OAuth login
- session cookie creation
- dashboard rendering
- CRUD for watched callsigns, Discord webhooks, ignored CIDs, and some push subscription actions
- direct MySQL access from SvelteKit server routes

### Source API

The current API handles:

- polling VATSIM data every 15 seconds
- diffing online/new/down controllers
- resolving affected watchers
- sending Discord notifications
- partially implemented push notifications
- UK top-down controller lookup support

### Main current weakness

Business logic is split across two deployables that both know the database schema directly. The frontend is not just a frontend, and the API is not the only backend. That makes future changes harder than they need to be.

## Target Application Shape

The merged repository should become a single product with clear internal boundaries.

### Recommended shape

- `apps/web`: frontend and server-rendered UI
- `apps/api` or `apps/server`: unified backend API and background jobs
- `packages/domain`: shared business types and monitoring rules
- `packages/data`: database access, migrations, repository layer
- `packages/integrations`: VATSIM, Discord, push, UK data providers

If we choose a single-process deployment first, we can still keep these logical boundaries inside one app and split later if needed.

## Authentication Model

### New baseline

The primary identity should be a local application account, not a VATSIM account.

Each user should be able to:

- sign in locally
- manage watches and notification channels
- optionally link one or more external identities later

### Recommended auth capabilities

- local username/email plus password login
- session-based auth for the web UI
- optional VATSIM OAuth link flow
- unlinkable external identity storage
- role support for future admin features

### Why this matters

This removes the current product dependency on VATSIM OAuth approval while still letting us use it where available.

## Core Domain Model

The old schema is centered around `cid`. The new schema should be centered around `user`.

### Recommended core entities

- `users`
- `sessions`
- `linked_accounts`
- `watch_rules`
- `notification_channels`
- `notification_deliveries`
- `ignored_controller_ids`
- `controller_snapshots`
- `controller_events`

### Notes

- `linked_accounts` should hold optional VATSIM identity data such as `cid`, tokens, and metadata.
- `watch_rules` should belong to a local user, not directly to a VATSIM CID.
- `notification_channels` should support multiple channel types, starting with Discord webhook and web push.
- `controller_events` should be a first-class concept so delivery, retry, and UI history can build on the same event stream.

## Monitoring Pipeline

The monitoring engine should become a dedicated backend concern.

### Recommended flow

1. Poll VATSIM data on a fixed schedule.
2. Normalize the controller list.
3. Compare against the previous snapshot.
4. Emit domain events such as `controller_online` and `controller_offline`.
5. Expand derived matches like UK top-down coverage.
6. Resolve matching watch rules.
7. Fan out to notification channel handlers.
8. Persist delivery results.

### Important design shift

The current API keeps state mostly in memory. The new system should make event generation and state persistence explicit so restarts are safer and debugging is easier.

## Feature Mapping From Old System

### Preserve

- watched callsigns with wildcard support
- top-down matching
- Discord webhook notifications
- web push notifications
- user privacy setting for suppressing tracking
- API status and controller monitoring health visibility

### Change

- replace VATSIM-only login with local accounts plus optional VATSIM linking
- move direct DB writes out of frontend route handlers into backend services
- replace table-by-table helper classes with a clearer service and repository layer
- make notification sending idempotent and observable

### Add

- multiple local users
- linked external identities
- migration-friendly schema
- notification history
- admin/diagnostic surfaces

## Suggested Merge Strategy

### Phase 1: foundation

- create unified repo structure
- choose runtime stack
- choose ORM or SQL migration tool
- define new schema
- implement local auth

### Phase 2: backend core

- port monitoring poller
- port callsign matching logic
- port UK top-down logic behind an integration boundary
- port Discord notification delivery
- restore push delivery cleanly

### Phase 3: user features

- rebuild dashboard for local users
- rebuild watch rule management
- rebuild channel management
- add notification history and monitoring status views

### Phase 4: optional VATSIM integration

- add optional VATSIM account linking
- sync linked account metadata
- use linked VATSIM identity where it improves UX, without making it mandatory

## Recommended First Implementation Milestone

The best first build target is not "clone both repos into one tree". It is:

1. establish the new app structure
2. implement local authentication
3. define the new schema around local users
4. port watched callsigns and Discord channel management onto that schema
5. port the monitoring loop behind a unified backend service

That gives us a working backbone without committing too early to old repo boundaries.

## Risks To Keep In Mind

- carrying forward the old schema too literally will preserve the current coupling
- embedding monitoring state only in memory will make restarts brittle
- hard-coding UK logic into the core runtime will make future regional expansion harder
- keeping the frontend responsible for direct database CRUD will recreate the existing split-brain architecture
- tying user identity to VATSIM OAuth would block the product again

## Immediate Next Step

The next practical step should be to scaffold the merged project and write the first-pass data model and app layout around local users first.
