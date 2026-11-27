import { parseRedisUrl } from './redis-connection';

describe('parseRedisUrl', () => {
  it('parses a local address with defaults', () => {
    expect(parseRedisUrl('redis://localhost')).toEqual({
      host: 'localhost',
      port: 6379,
      username: undefined,
      password: undefined,
      db: 0,
      tls: undefined,
    });
  });

  it('keeps the credentials, database and TLS', () => {
    expect(parseRedisUrl('rediss://user:p%40ss@redis.example:6380/1')).toEqual({
      host: 'redis.example',
      port: 6380,
      username: 'user',
      password: 'p@ss',
      db: 1,
      tls: {},
    });
  });
});
