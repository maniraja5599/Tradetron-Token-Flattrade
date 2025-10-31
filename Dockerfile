FROM node:20-alpine

WORKDIR /app

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    ttf-opensans

# Verify Chromium installation and set path
RUN which chromium || which chromium-browser || ls -la /usr/bin/chromium* || ls -la /usr/lib/chromium*

# Set environment variable to use system Chromium
# Alpine Chromium can be at different paths - we'll try /usr/bin/chromium first
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (do this after npm install for better caching)
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application using custom server
CMD ["node", "server.js"]
