# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Install drizzle-kit for db migrations
RUN npm install drizzle-kit

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Copy drizzle config and schema for migrations
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig.json ./

# Data directory for SQLite persistence
RUN mkdir -p /app/data
# Set DB path to /app/data so it persists across container restarts
ENV DATABASE_URL=/app/data/data.db
ENV NODE_ENV=production

EXPOSE 5000

# Run migrations then start server
CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.cjs"]
