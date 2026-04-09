# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install ALL deps (dev included, needed for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# Prune to production-only deps (keeps compiled native modules)
RUN npm prune --production

# ---- Production Stage ----
FROM node:22-alpine
WORKDIR /app

# Copy built output and pre-compiled node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Data directory for SQLite persistence
RUN mkdir -p /app/data

ENV DATABASE_URL=/app/data/data.db
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
