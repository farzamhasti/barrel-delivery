# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Force fresh build by adding build timestamp
ARG BUILD_DATE
ENV BUILD_DATE=${BUILD_DATE}

# Build frontend and backend - this will NOT be cached
RUN echo "Building at ${BUILD_DATE}" && pnpm build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]
