# Use official Puppeteer Docker image with Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Start the bot
CMD ["node", "index.js"]