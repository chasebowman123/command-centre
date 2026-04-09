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

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Data directory for SQLite persistence
RUN mkdir -p /app/data

# Set DB path to /app/data so it persists across container restarts
ENV DATABASE_URL=/app/data/data.db
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
