ARG NODE_VERSION=24.19.0
ARG OS_FLAVOR=alpine3.21

# ─── Development stage ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-${OS_FLAVOR} AS development
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g corepack@latest && corepack enable

COPY package.json pnpm-lock.yaml tsconfig*.json ./
RUN pnpm install --fetch-timeout 300000 --frozen-lockfile

COPY . ./

EXPOSE 4000
ENTRYPOINT ["pnpm"]
CMD ["dev"]

# ─── Builder stage ────────────────────────────────────────────────────────────
FROM development AS builder

# TODO: Run code generation here if you have generated files
# RUN pnpm generate

RUN pnpm build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-${OS_FLAVOR}
WORKDIR /app

ENV NODE_ENV=production

# dumb-init handles signals correctly in containers
RUN apk add dumb-init

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g corepack@latest && corepack enable

COPY package.json pnpm-lock.yaml migrate-mongo-config.js ./

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build/ ./build
COPY --from=builder --chown=node:node /app/migrations/ ./migrations

USER node

EXPOSE 4000

CMD ["dumb-init", "pnpm", "prod"]
