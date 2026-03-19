FROM node:20-slim

# Install Chrome and all required system libraries
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build frontend
COPY frontend/package.json frontend/
RUN cd frontend && npm install --legacy-peer-deps
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Install backend
COPY backend/package.json backend/
RUN cd backend && npm install
COPY backend/ backend/

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "backend/server.js"]
