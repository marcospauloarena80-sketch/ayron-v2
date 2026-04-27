# ============================================================
# AYRON API — Dockerfile
# Node 20 slim + Chromium for Puppeteer PDF generation
# ============================================================
FROM node:20-slim AS base

# Install Chromium and required system libraries for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    libappindicator1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    ca-certificates \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium, skip bundled download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--no-zygote,--single-process"
ENV PDF_TIMEOUT_MS=30000

# ============================================================
# Dependencies stage
# ============================================================
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps

# ============================================================
# Build stage
# ============================================================
FROM deps AS builder
WORKDIR /app
COPY . .
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ============================================================
# Production runtime
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create tmp dir for PDF fallback
RUN mkdir -p /tmp/ayron-docs && chmod 777 /tmp/ayron-docs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/src/main"]
