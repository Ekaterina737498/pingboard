import { Global, Module } from '@nestjs/common';
import { LastCheckCache } from './last-check.cache';
import { RedisService } from './redis.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [RedisService, LastCheckCache, RateLimitService],
  exports: [RedisService, LastCheckCache, RateLimitService],
})
export class RedisModule {}
