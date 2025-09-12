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
FROM node:18-alpine
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

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/decks', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
