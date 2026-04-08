# Use pre-built Puppeteer image (Chromium already installed)
FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Set working directory
WORKDIR /app

# Copy only package files first (better caching)
COPY package.json ./

# Install dependencies with timeout protection
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# Copy application code
COPY . .

# Set Puppeteer to use pre-installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start the bot
CMD ["node", "index.js"]