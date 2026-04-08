# Use the official Puppeteer image with Chromium pre-installed
FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci)
RUN npm install --omit=dev

# Copy the rest of your bot code
COPY . .

# Set environment variable for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start the bot
CMD ["node", "index.js"]