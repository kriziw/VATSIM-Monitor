# Docker Deployment

Docker is the preferred deployment path for this repository.

## Included Files

- `docker-compose.yml`
- `.env.docker.example`
- `apps/server/Dockerfile`
- `apps/server/docker-entrypoint.sh`
- `apps/web/Dockerfile`
- `.github/workflows/docker-release.yml`

## Quick Start

1. Copy `.env.docker.example` to `.env`.
2. Adjust the database password and any host ports you want to change.
3. Run `docker compose pull`.
4. Run `docker compose up -d`.

Example:

```bash
cp .env.docker.example .env
docker compose pull
docker compose up -d
```

By default, the compose file pulls the published Docker Hub images:

- `kriziw/vatsim-monitor-server:latest`
- `kriziw/vatsim-monitor-web:latest`

You can pin a specific published version by changing `APP_VERSION` in `.env`, for example:

- `APP_VERSION=0.1.1`

If you fork the images into another Docker Hub namespace, change:

- `IMAGE_NAMESPACE`

## .env Guide

The provided `.env.docker.example` includes all values needed for a first install.

Most important values:

- `IMAGE_NAMESPACE`
  Docker Hub namespace used by compose. Default: `kriziw`
- `APP_VERSION`
  Published image tag to pull. Default: `latest`
- `MYSQL_ROOT_PASSWORD`
  MariaDB root password
- `MYSQL_DATABASE`
  Application database name. Default: `vatsim_monitor`
- `MYSQL_USER`
  Application database user. Default: `vatsim_monitor`
- `MYSQL_PASSWORD`
  Application database password
- `MYSQL_PORT`
  Host port for MariaDB. Default: `3306`
- `SERVER_PORT`
  Host port for the backend API. Default: `8080`
- `WEB_PORT`
  Host port for the frontend. Default: `3000`
- `ORIGIN`
  Public URL used by the SvelteKit web app for CSRF-safe form submissions. For local installs, keep `http://localhost:3000`. If you access the app through a domain or reverse proxy, set this to the exact public URL, for example `https://monitor.example.com`.
- `PRIVATE_API_BASE_URL`
  Internal URL the web container uses to reach the backend. Leave this as `http://server:8080` for normal compose installs.
- `MONITOR_POLL_INTERVAL_MS`
  VATSIM polling interval. Default: `15000`
- `VATSIM_OAUTH_ENABLED`
  Keep this `false` unless optional VATSIM OAuth is configured later
- `RUN_MIGRATIONS`
  Runs database migrations when the server container starts. Default: `true`

Recommended first edit:

```env
MYSQL_ROOT_PASSWORD=change-this-root-password
MYSQL_PASSWORD=change-this-app-password
```

If you are not using plain localhost, also set:

```env
ORIGIN=https://your-public-web-url.example
```

Once `.env` is set, bring the stack up with:

```bash
docker compose pull
docker compose up -d
```

## Services

- `mariadb`
  Persists application data.
- `server`
  Runs migrations on startup by default, then starts the backend API and monitoring loop.
- `web`
  Serves the SvelteKit frontend and talks to the backend through `PRIVATE_API_BASE_URL`.

## Building From Source

If you want to build locally instead of pulling published images:

1. Build `apps/server/Dockerfile` as `vatsim-monitor-server`.
2. Build `apps/web/Dockerfile` as `vatsim-monitor-web`.
3. Set `IMAGE_NAMESPACE` and `APP_VERSION` so compose points at those locally available tags.

## First Build Notes

- The first release line should stay in `0.x` to make the testing state explicit.
- Keep `VATSIM_OAUTH_ENABLED=false` for the first deployment.
- If you want to manage migrations separately later, set `RUN_MIGRATIONS=false` for the server container and run them as a one-off task instead.

