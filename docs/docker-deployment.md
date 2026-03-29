# Docker Deployment

Docker is the preferred deployment path for this repository.

## Included Files

- `docker-compose.yml`
- `.env.docker.example`
- `apps/server/Dockerfile`
- `apps/server/docker-entrypoint.sh`
- `apps/web/Dockerfile`
- `.github/workflows/docker.yml`

## Local Container Startup

1. Copy `.env.docker.example` to `.env`.
2. Adjust the database password and any host ports you want to change.
3. Run `docker compose up --build`.

## Services

- `mariadb`
  Persists application data.
- `server`
  Runs migrations on startup by default, then starts the backend API and monitoring loop.
- `web`
  Serves the SvelteKit frontend and talks to the backend through `PRIVATE_API_BASE_URL`.

## First Build Notes

- The first release line should stay in `0.x` to make the testing state explicit.
- Keep `VATSIM_OAUTH_ENABLED=false` for the first deployment.
- If you want to manage migrations separately later, set `RUN_MIGRATIONS=false` for the server container and run them as a one-off task instead.

