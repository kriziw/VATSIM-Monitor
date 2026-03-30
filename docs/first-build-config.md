# First Build Configuration

This document lists the values worth preparing before the first `0.x` build and deployment pass.

## Current Version Intent

The repository is currently targeting an early testing baseline:

- application version: `0.1.0`
- release automation: Release Please
- container automation: GitHub Actions Docker workflow

## Runtime Environment Variables

### Server

These are read by `apps/server`.

- `HOST`
  Recommended: `0.0.0.0`
- `PORT`
  Recommended: `8080`
- `MYSQL_HOST`
  Required for real deployments
- `MYSQL_PORT`
  Usually `3306`
- `MYSQL_USER`
  Required for real deployments
- `MYSQL_PASSWORD`
  Secret
- `MYSQL_DATABASE`
  Recommended: `vatsim_monitor`
- `MONITOR_POLL_INTERVAL_MS`
  Recommended starting value: `15000`
- `VATSIM_OAUTH_ENABLED`
  Recommended for the first build: `false`

### Web

These are read by `apps/web`.

- `PRIVATE_API_BASE_URL`
  Recommended local value: `http://localhost:8080`
  Recommended deployed value: the internal or public base URL for the backend service

## GitHub Actions

### Required repository secrets

These are now required to mirror the `MindBuzz` release flow:

- `RELEASE_PLEASE_TOKEN`
  Use a GitHub token that can create and update pull requests, tags, releases, and changelog commits in this repository.
- `DOCKERHUB_USERNAME`
  Docker Hub account or organization name that will own the published images.
- `DOCKERHUB_TOKEN`
  Docker Hub access token for image publishing.

### Required repository settings

- enable `Allow GitHub Actions to create and approve pull requests`
- ensure Actions has permission to read and write repository contents
- ensure Actions is allowed to publish packages and create releases

### Current workflow behavior

- `.github/workflows/ci.yml`
  Runs on pull requests and pushes to `main`, and validates `npm run build`, `npm run check`, `docker compose config`, and `docker compose build`.
- `.github/workflows/pr-title-check.yml`
  Enforces Conventional Commit pull request titles.
- `.github/workflows/release-please.yml`
  Uses `RELEASE_PLEASE_TOKEN` to keep the release PR current and cut the next `0.x` tag and GitHub release. It also supports manual reruns through `workflow_dispatch`.
- `.github/workflows/docker-release.yml`
  Publishes multi-arch Docker Hub images for `server` and `web` when a GitHub release is published.

### Releasable commit types

Release Please does not open a new release PR for every merge. By default it looks for releasable commits since the last tag, such as:

- `fix:`
- `feat:`
- `deps:`

Commits titled only as `docs:` or `chore:` will still merge normally, but they do not trigger a new release PR on their own.

### Docker Hub image names

The Docker release workflow publishes:

- `<DOCKERHUB_USERNAME>/vatsim-monitor-server`
- `<DOCKERHUB_USERNAME>/vatsim-monitor-web`

Each published release writes:

- the full version tag, for example `0.1.0`
- the major/minor tag, for example `0.1`
- `latest`

### Still optional for later phases

These are not required for the first merged `0.x` deployment:

- deployment target credentials
- optional future VATSIM OAuth credentials once account linking is introduced
- optional future web-push VAPID keys once push delivery is restored

## First Deploy Recommendation

For the very first `0.x` deployment target:

1. keep `VATSIM_OAUTH_ENABLED=false`
2. provision MySQL first
3. run `npm run db:migrate`
4. deploy `apps/server`
5. deploy `apps/web` with `PRIVATE_API_BASE_URL` pointing at the server
6. validate local auth, watch rule CRUD, channel CRUD, monitoring status, and event creation before enabling anything more advanced
