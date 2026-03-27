# ─── Stage 1: Build / install dependencies ────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first (layer cache)
COPY package*.json ./

# Install production deps only
RUN npm ci --omit=dev

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Create upload dirs and set ownership
RUN mkdir -p uploads/images uploads/point_request_evidence \
    && chown -R appuser:appgroup /app

USER appuser

# Expose port (matches PORT env var default)
EXPOSE 3001

# Healthcheck – docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

ENV NODE_ENV=production

CMD ["node", "server.js"]