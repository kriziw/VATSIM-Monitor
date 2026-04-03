# VATSIM-Monitor

Unified monitoring platform for VATSIM controllers.

## Overview

VATSIM Monitor is a self-hosted platform for tracking controller availability on the VATSIM network. It is designed for users who want to watch specific positions, receive alerts when staffing changes happen, and manage those alerts through a clean local-first web application.

The project combines:

- live polling of VATSIM controller data
- watch-rule based monitoring for specific positions or wildcard patterns
- optional top-down matching for broader position coverage
- Discord webhook notifications with per-event customization
- in-app access to recent rotating application logs
- local multi-user accounts without requiring VATSIM OAuth

In practice, this means a user can define the callsigns they care about, keep a live monitor page open, and receive notifications when those positions come online, go offline, or change controller.

## Project Lineage

This project respectfully builds on ideas and earlier implementation work from [VatNotif-web](https://github.com/kristiankunc/VatNotif-web) and [VatNotif-api](https://github.com/kristiankunc/VatNotif-api). VATSIM Monitor is not intended as a like-for-like continuation of those projects; it is a substantial redesign and enhancement with a new architecture, new deployment model, expanded customization, and a broader product direction.

## AI Disclaimer

This repository is developed with AI-assisted tooling. Architecture, implementation, and documentation changes may be drafted or accelerated with AI support, but project direction, review, and final decisions remain human-led.

## Goal

This repository will replace and merge:

- `kriziw/vatsim-airspace-monitoring-web`
- `kriziw/vatsim-airspace-monitoring-api`

The new system keeps the controller monitoring and notification features, but shifts the product model in two important ways:

- VATSIM OAuth is optional, not required
- the application supports multiple local users/accounts

## Direction

The current source systems split responsibilities awkwardly:

- the web app owns auth, sessions, and most CRUD directly against MySQL
- the API owns polling, change detection, notification fan-out, push public key exposure, and UK top-down lookup

The new repository should instead converge on a single application with:

- one backend/domain layer
- one database schema
- one frontend
- optional external identity linking, including VATSIM OAuth where available

## Planning

The initial merge architecture and phased plan are documented in [docs/target-architecture.md](docs/target-architecture.md).
The first deployment and environment checklist is in [docs/first-build-config.md](docs/first-build-config.md).
Docker deployment notes are in [docs/docker-deployment.md](docs/docker-deployment.md).

## Repository Layout

The first scaffold is now in place:

- `apps/web`: SvelteKit frontend shell for local-first authentication and dashboard flows
- `apps/server`: unified backend API shell for auth, monitoring status, and background services
- `packages/domain`: shared business types
- `packages/data`: MySQL access helpers and initial SQL migration
- `packages/integrations`: provider interfaces for VATSIM, top-down resolution, and notifications

## Current State

This scaffold intentionally establishes structure first. It includes:

- a local-first product shell in the web app
- an Express server with health, auth-provider, monitoring-status, and authenticated settings and monitor routes
- an initial MySQL schema centered on users, sessions, watch rules, channels, and controller events
- local registration, login, logout, and session lookup
- CRUD for watch rules and Discord webhook channels
- a live VATSIM polling loop with persisted controller events
- Discord webhook fan-out driven by active watch rules and channels
- per-channel Discord template customization for online, offline, and controller-change events
- a watchlist-focused monitor view for matched controllers and recent relevant changes
- a signed-in logs page backed by rotating server log files

It does not yet include:

- implemented VATSIM linking
- web push delivery in the new backend
- richer notification history and retry tooling

## How It Works

At a high level, the platform is split into three connected layers:

1. `apps/server`
   The backend service polls VATSIM data, detects controller state changes, stores those events, resolves top-down coverage where applicable, and dispatches notifications.

2. `apps/web`
   The frontend provides local authentication, settings management, and a live monitoring view focused on watched positions.

3. `packages/*`
   Shared packages define domain types, database access, and external integrations so the frontend and backend use the same core model.

The typical user flow is:

1. create a local account
2. add one or more watch rules such as `EGLL_TWR` or `EGNX_%`
3. connect one or more Discord webhook channels
4. optionally customize the online, offline, and controller-change notification templates
5. monitor live watched positions in the UI and receive alerts as staffing changes occur

## Development

Planned root workspace commands:

- `npm run dev:web`
- `npm run dev:server`
- `npm run db:migrate`
- `npm run build`
- `npm run check`

## Docker

Docker is the preferred deployment method for this repository.

The default `docker-compose.yml` now targets the published Docker Hub images so a user can deploy directly with `docker compose pull` and `docker compose up -d`.

### Quick Install

1. Copy [.env.docker.example](.env.docker.example) to `.env`.
2. Update at least `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD`.
3. Optionally change `SERVER_PORT`, `WEB_PORT`, or `APP_VERSION`.
4. Run `docker compose pull`.
5. Run `docker compose up -d`.

The server now keeps built-in rotating log files and can expose recent entries inside the signed-in web UI on `/logs` when that troubleshooting page is enabled from Settings for an account.
You can also raise or lower backend verbosity with `LOG_LEVEL` (`debug`, `info`, `warn`, `error`).

### Reverse Proxy Setup

If you access the web app through a domain or trusted reverse proxy, also set these in `.env`:

```env
ORIGIN=https://your-public-web-url.example
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
PORT_HEADER=x-forwarded-port
```

`ORIGIN` must exactly match the URL users open in the browser. The forwarded-header values are needed when the SvelteKit web container sits behind a proxy and would otherwise reject login or registration form posts with:

`Cross-site POST form submissions are forbidden`

After startup:

- the web app is available on `http://localhost:${WEB_PORT}` and defaults to `http://localhost:3000`
- the backend is available on `http://localhost:${SERVER_PORT}` and defaults to `http://localhost:8080`

The full Docker deployment guide is in [docs/docker-deployment.md](docs/docker-deployment.md).

Included Docker artifacts:

- `docker-compose.yml`
- `.env.docker.example`
- `apps/server/Dockerfile`
- `apps/server/docker-entrypoint.sh`
- `apps/web/Dockerfile`
- `.github/workflows/ci.yml`
- `.github/workflows/docker-release.yml`
- `.github/workflows/pr-title-check.yml`
- `.github/workflows/release-please.yml`

## Releases

This repository now follows the same general release pattern as `kriziw/MindBuzz`:

- pull request titles must follow Conventional Commits
- pull requests and `main` run workspace build, checks, and Docker validation
- Release Please maintains the next `0.x` release PR
- published GitHub releases trigger Docker Hub image publishing for both `web` and `server`

Release Please only creates a new release PR when `main` contains releasable commits since the last tag. In practice that means merges with prefixes like `fix:`, `feat:`, or `deps:`. A `docs:` or `chore:` merge alone will not produce a new release.

The repository secrets expected by the release workflows are:

- `RELEASE_PLEASE_TOKEN`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Repository setup note:

- enable `Allow GitHub Actions to create and approve pull requests` in the repository Actions settings
