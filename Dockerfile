# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --no-audit --no-fund --verbose || npm install --legacy-peer-deps --no-audit --no-fund
RUN cd client && npm install --no-audit --no-fund --verbose || npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY . .

# Build React app
RUN cd client && npm run build

# Production stage
#Previous Version FROM node:18-alpine
FROM node:24-alpine
LABEL org.opencontainers.image.source="https://github.com/andrew-busbee/planning-poker"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production --no-audit --no-fund --verbose || npm install --production --legacy-peer-deps --no-audit --no-fund

# Copy built React app
COPY --from=build /app/client/build ./client/build

# Copy server files
COPY server.js ./

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN addgroup -g 1000 -S nodejs || addgroup -S nodejs
RUN adduser -S nodejs -u 1000 -G nodejs || adduser -S nodejs -G nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Ensure data directory has proper permissions
RUN chmod 755 /app/data

# Test that the nodejs user can write to the data directory
USER nodejs
RUN touch /app/data/test-write && rm /app/data/test-write

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/decks', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
