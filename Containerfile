ARG NODE_BUILD_IMAGE=docker.io/library/node:22-alpine
ARG ALPINE_RUNTIME_IMAGE=docker.io/library/alpine:3.22

FROM ${NODE_BUILD_IMAGE} AS build
WORKDIR /build
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/coop/package.json packages/coop/package.json
COPY apps/coop-server/package.json apps/coop-server/package.json
RUN pnpm --filter @prism-bastion/coop-server... install --frozen-lockfile
COPY packages/game-core packages/game-core
COPY packages/coop packages/coop
COPY apps/coop-server apps/coop-server
RUN pnpm build:coop-server

FROM ${ALPINE_RUNTIME_IMAGE} AS runtime
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=development
LABEL org.opencontainers.image.title="Prism Bastion co-op server" \
      org.opencontainers.image.description="Authoritative WebSocket coordinator for Prism Bastion co-op" \
      org.opencontainers.image.source="https://github.com/szdytom/ntd" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

RUN apk add --no-cache nodejs \
    && addgroup -S prism \
    && adduser -S -D -H -G prism prism

WORKDIR /app
COPY --from=build --chown=prism:prism /build/apps/coop-server/dist/server.mjs /build/apps/coop-server/dist/combat-worker.mjs ./

ENV NODE_ENV=production \
    COOP_HOST=0.0.0.0 \
    COOP_SERVER_PORT=4174 \
    COOP_COMBAT_WORKERS=1 \
    COOP_COMBAT_QUEUE_LIMIT=128 \
    COOP_MAX_ROOMS=64 \
    COOP_MAX_CONNECTIONS=256

USER prism
EXPOSE 4174
STOPSIGNAL SIGTERM
CMD ["node", "server.mjs"]
