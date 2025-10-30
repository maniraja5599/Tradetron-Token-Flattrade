FROM node:20-alpine

WORKDIR /app

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (do this after npm install for better caching)
COPY . .

# Install Playwright browsers
RUN npm run playwright:install

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
