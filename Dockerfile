# Use lightweight Node.js base image
FROM node:18-slim

# Install Chromium and dependencies in one layer
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Set environment variables BEFORE npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files
COPY package.json ./

# Install dependencies with faster settings
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund --loglevel=error

# Copy application code
COPY . .

# Start the bot
CMD ["node", "index.js"]