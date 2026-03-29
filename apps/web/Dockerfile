FROM node:20-alpine AS build

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/integrations/package.json packages/integrations/package.json

RUN npm install

COPY apps/web apps/web
COPY packages/domain packages/domain
COPY packages/integrations packages/integrations

RUN npm run build --workspace @vatsim-monitor/domain
RUN npm run build --workspace @vatsim-monitor/integrations
RUN npm run build --workspace @vatsim-monitor/web

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/integrations/package.json ./packages/integrations/package.json
COPY --from=build /app/packages/integrations/dist ./packages/integrations/dist

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["node", "build/index.js"]

