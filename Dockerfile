FROM node:20-alpine

WORKDIR /app

# Install Playwright dependencies and Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    ttf-opensans \
    dbus \
    ttf-dejavu \
    font-noto-emoji

# Find and verify Chromium installation
RUN CHROMIUM_PATH=$(which chromium || which chromium-browser || find /usr -name chromium 2>/dev/null | head -1) && \
    if [ -z "$CHROMIUM_PATH" ]; then \
      echo "ERROR: Chromium not found!" && \
      ls -la /usr/bin/chromium* || ls -la /usr/lib/chromium* || true; \
    else \
      echo "Found Chromium at: $CHROMIUM_PATH" && \
      ls -la "$CHROMIUM_PATH" && \
      "$CHROMIUM_PATH" --version || true; \
    fi

# Set environment variables
# Alpine Chromium is typically at /usr/bin/chromium
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=0

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application using custom server
CMD ["node", "server.js"]
