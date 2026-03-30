FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN npm ci

COPY apps/web apps/web
COPY packages/domain packages/domain

RUN npm run build --workspace @vatsim-monitor/domain
RUN npm run build --workspace @vatsim-monitor/web
RUN test -f /app/apps/web/build/index.js

FROM build AS prod-deps

RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
RUN test -f /app/apps/web/build/index.js

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["node", "build/index.js"]

