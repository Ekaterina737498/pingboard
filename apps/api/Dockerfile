FROM node:24-bookworm-slim

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate \
 && npm run build

ENV PORT=4000
EXPOSE 4000
RUN chown -R node:node /app/src
USER node

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]