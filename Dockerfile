# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/scripts ./scripts

# Create /tmp directory with proper permissions
RUN mkdir -p /tmp && chown -R appuser:nodejs /tmp

# Set ownership of app directory
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose port (will be overridden by runtime)
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}${APP_BASE_PATH:-/}health || exit 1

# Set default environment
ENV NODE_ENV=production
ENV PORT=3000
ENV APP_BASE_PATH=/

# Start the application
CMD ["npm", "start"]
