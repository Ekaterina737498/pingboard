import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async hit(key: string, limit: number, windowSeconds: number): Promise<void> {
    if (process.env.RATE_LIMIT_ENABLED === 'false') return;

    const results = await this.redis
      .multi()
      .set(key, 0, 'EX', windowSeconds, 'NX')
      .incr(key)
      .ttl(key)
      .exec();

    const count = Number(results?.[1]?.[1] ?? 0);
    const ttl = Number(results?.[2]?.[1] ?? windowSeconds);

    if (count > limit) {
      throw new HttpException(
        `Too many attempts. Try again in ${ttl} seconds`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
