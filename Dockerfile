# Multi-stage build for Cloud Run: builder installs everything (including
# devDependencies -- needed for tsc/vite), builds server+web, then prunes
# devDependencies before the slim runtime stage copies over only what's
# needed to run. Verified stage-by-stage with plain `npm`/`node` outside
# Docker (no daemon available in the environment this was authored in);
# see README for the exact commands this mirrors.
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist

# Cloud Run sets PORT itself (defaults to 8080); the app already reads
# process.env.PORT, so this is just a sane default for other hosts.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
