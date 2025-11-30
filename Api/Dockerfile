# Use official Node.js 20 LTS runtime
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Build TypeScript to JavaScript
RUN npm install -D typescript @types/node @types/express @types/cors && \
    npx tsc && \
    npm uninstall typescript @types/node @types/express @types/cors

# Set production environment
ENV NODE_ENV=production

# Cloud Run will set PORT env var (default 8080)
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
