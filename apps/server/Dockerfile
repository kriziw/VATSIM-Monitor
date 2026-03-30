FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/data/package.json packages/data/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/integrations/package.json packages/integrations/package.json

RUN npm ci

COPY apps/server apps/server
COPY packages/data packages/data
COPY packages/domain packages/domain
COPY packages/integrations packages/integrations

RUN npm run build --workspace @vatsim-monitor/domain
RUN npm run build --workspace @vatsim-monitor/data
RUN npm run build --workspace @vatsim-monitor/integrations
RUN npm run build --workspace @vatsim-monitor/server
RUN test -f /app/apps/server/dist/apps/server/src/index.js
RUN test -f /app/packages/data/dist/data/src/index.js

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/packages/data ./packages/data
COPY --from=build /app/packages/domain ./packages/domain
COPY --from=build /app/packages/integrations ./packages/integrations
RUN test -f /app/apps/server/dist/apps/server/src/index.js
RUN test -f /app/packages/data/dist/data/src/index.js

WORKDIR /app/apps/server
RUN chmod +x docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/apps/server/src/index.js"]
