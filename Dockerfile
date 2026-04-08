# Use the official lightweight Node image
FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your bot code
COPY . .

# Start the bot
CMD ["node", "index.js"]