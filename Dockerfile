# Use Debian Bullseye Node 20 — has the glibc/fontconfig base Chrome needs
FROM node:20-bullseye-slim

# Install Google Chrome Stable
# This gives us /usr/bin/google-chrome and all required system libs in one shot,
# replacing the 250+ packages Railpack would otherwise auto-install.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
  && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
     > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update && apt-get install -y --no-install-recommends \
    google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Tell Puppeteer to skip downloading its own Chromium bundle and use the
# system Chrome we just installed instead.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Install dependencies first (layer-cached unless package.json changes)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

CMD ["node", "index.js"]
