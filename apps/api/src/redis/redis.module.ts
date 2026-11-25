import { Global, Module } from '@nestjs/common';
import { LastCheckCache } from './last-check.cache';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, LastCheckCache],
  exports: [RedisService, LastCheckCache],
})
export class RedisModule {}
