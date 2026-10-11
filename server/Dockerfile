FROM node:20-bookworm-slim

# Install headless LibreOffice (Writer, Calc, Impress) and Unicode/metric-compatible fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-core \
    fonts-freefont-ttf \
    fontconfig \
    ca-certificates \
    && fc-cache -f \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads processed && chmod 777 uploads processed

ENV NODE_ENV=production
ENV PORT=5000
ENV HOME=/tmp

EXPOSE 5000

CMD ["node", "src/server.js"]
