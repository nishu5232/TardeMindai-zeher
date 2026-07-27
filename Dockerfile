# Stage 1: build the app
FROM node:20-alpine AS builder

# Install build deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --progress=false || npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: create minimal runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only install production deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production --prefer-offline --no-audit --progress=false || npm install --production

# Copy the built server and public files
COPY --from=builder /app/dist ./dist
# If you have any other runtime files (like public/) copy them as needed

# Expose port (Coolify will set PORT env var; default to 3000)
EXPOSE 3000

# Use the start script defined in package.json
CMD ["node", "dist/server.cjs"]
