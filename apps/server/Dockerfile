FROM node:20-alpine AS build

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/data/package.json packages/data/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/integrations/package.json packages/integrations/package.json

RUN npm install

COPY apps/server apps/server
COPY packages/data packages/data
COPY packages/domain packages/domain
COPY packages/integrations packages/integrations

RUN npm run build --workspace @vatsim-monitor/domain
RUN npm run build --workspace @vatsim-monitor/data
RUN npm run build --workspace @vatsim-monitor/integrations
RUN npm run build --workspace @vatsim-monitor/server

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/packages/data/package.json ./packages/data/package.json
COPY --from=build /app/packages/data/dist ./packages/data/dist
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/integrations/package.json ./packages/integrations/package.json
COPY --from=build /app/packages/integrations/dist ./packages/integrations/dist
COPY --from=build /app/packages/data/migrations ./packages/data/migrations
COPY apps/server/docker-entrypoint.sh ./apps/server/docker-entrypoint.sh

WORKDIR /app/apps/server
RUN chmod +x docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
