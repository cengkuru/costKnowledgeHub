# Use official Node.js 20 LTS runtime
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy pre-built dist folder (built locally before deploy)
COPY dist ./dist

# Set production environment
ENV NODE_ENV=production

# Cloud Run will set PORT env var (default 8080)
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
