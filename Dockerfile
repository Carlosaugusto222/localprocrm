# Build Stage
FROM node:22-slim AS build

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies using Bun (or npm/node if preferred)
# Since the environment uses Bun for locking but node for scripts, 
# we'll use npm install if bun is not present or just npm install for compatibility.
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Final Stage - Production
FROM node:22-slim AS production

WORKDIR /app

# Copy the build output from the build stage
# TanStack Start typically builds to .output or dist depending on nitro configuration
COPY --from=build /app/.output ./.output

# Copy package files for production dependencies if needed
COPY --from=build /app/package.json ./package.json

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", ".output/server/index.mjs"]
