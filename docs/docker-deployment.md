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

By default, the compose file pulls the published Docker Hub images:

- `kriziw/vatsim-monitor-server:latest`
- `kriziw/vatsim-monitor-web:latest`

You can pin a specific published version by changing `APP_VERSION` in `.env`, for example:

- `APP_VERSION=0.1.1`

If you fork the images into another Docker Hub namespace, change:

- `IMAGE_NAMESPACE`

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

