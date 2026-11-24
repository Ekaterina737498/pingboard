process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pingboard:pingboard@localhost:5435/pingboard_test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';