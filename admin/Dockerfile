# Use Node.js 20 LTS
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# Set environment variable for API URL
ENV NEXT_PUBLIC_API_URL=https://cost-knowledge-hub-api-199832110436.us-central1.run.app/api

# Build the Next.js application
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
