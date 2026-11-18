FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=1416 STORAGE_DIR=/app/storage
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/server/db/migrations ./server/db/migrations
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 1416
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0"]
