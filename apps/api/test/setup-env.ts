process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pingboard:pingboard@localhost:5435/pingboard_test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';
process.env.CHECKS_ENABLED = 'false';
process.env.REDIS_URL =
  process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
process.env.RATE_LIMIT_ENABLED = 'false';
// Тесты не должны отправлять настоящие письма, даже если в .env указан Gmail.
process.env.SMTP_URL = 'smtp://127.0.0.1:1';
