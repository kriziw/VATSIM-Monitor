# VATSIM-Monitor

Unified monitoring platform for VATSIM controllers.

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
- an Express server with health, auth-provider, monitoring-status, and authenticated dashboard routes
- an initial MySQL schema centered on users, sessions, watch rules, channels, and controller events
- local registration, login, logout, and session lookup
- first-pass CRUD for watch rules and Discord webhook channels
- a live VATSIM polling loop with persisted controller events
- Discord webhook fan-out driven by active watch rules and channels

It does not yet include:

- implemented VATSIM linking
- web push delivery in the new backend
- richer notification history and retry tooling

## Development

Planned root workspace commands:

- `npm run dev:web`
- `npm run dev:server`
- `npm run db:migrate`
- `npm run build`
- `npm run check`

## Docker

Docker is the preferred deployment method for this repository.

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

The repository secrets expected by the release workflows are:

- `RELEASE_PLEASE_TOKEN`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Repository setup note:

- enable `Allow GitHub Actions to create and approve pull requests` in the repository Actions settings
