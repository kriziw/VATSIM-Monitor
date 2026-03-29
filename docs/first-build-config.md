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

### Already covered by default

The current Docker and release workflows can use the built-in `GITHUB_TOKEN`.

### Likely next secrets or variables

These are not all used by the repo yet, but they are the likely next items once deployment starts:

- deployment target credentials
- runtime environment variable mapping for `MYSQL_*`
- runtime environment variable mapping for `PRIVATE_API_BASE_URL`
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
