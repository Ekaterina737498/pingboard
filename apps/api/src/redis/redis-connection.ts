// Разбирает REDIS_URL целиком: BullMQ принимает не строку, а набор настроек.
export function parseRedisUrl(value: string) {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.slice(1) || 0),
    // rediss:// означает соединение по TLS.
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
