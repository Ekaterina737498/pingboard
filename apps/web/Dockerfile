FROM node:24-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Адрес API попадает в правила прокси во время сборки, а не при запуске.
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
RUN chown -R node:node /app/.next
USER node

CMD ["npm", "run", "start"]
