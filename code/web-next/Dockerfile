# syntax=docker.io/docker/dockerfile:1

FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY ./packages ./packages

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Development image with source code
FROM deps AS development
WORKDIR /app
ENV NODE_ENV=development

# Install Playwright browsers early for better caching
# PLAYWRIGHT_BROWSERS_PATH=0 - Places binaries to node_modules/playwright-core/.local-browsers (Hermetic install)
# https://playwright.dev/docs/browsers#hermetic-install
# Normailly the browser binaries end up in /root/.cache/ms-playwright/ 
# When the container is ran as nextjs user it can't find the binaries though.
# ENV PLAYWRIGHT_BROWSERS_PATH=0
# RUN npx playwright install --with-deps --no-shell

COPY . .

# Create user for security
# RUN groupadd --system --gid 1001 nodejs
# RUN useradd --system --uid 1001 --gid nodejs nextjs
# RUN chown -R nextjs:nodejs /app
# USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "run", "dev"]

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Bundle seed and migrate scripts for production (no tsx/drizzle-kit required)
RUN npx esbuild scripts/seed.ts --bundle --platform=node --outfile=dist/seed.cjs \
  --external:pg-native --external:better-sqlite3 --external:mysql2 --external:sqlite3
RUN npx esbuild scripts/migrate.ts --bundle --platform=node --outfile=dist/migrate.cjs \
  --external:pg-native

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy migration files and bundled scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle  /app/drizzle
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrate.cjs /app/migrate.cjs
COPY --from=builder --chown=nextjs:nodejs /app/dist/seed.cjs /app/seed.cjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
