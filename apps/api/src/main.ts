import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { parseTrustProxy } from './trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Сколько прокси стоит перед API. От этого зависит, какой IP попадёт в req.ip.
  const hops = parseTrustProxy(process.env.TRUST_PROXY);
  if (hops > 0) app.set('trust proxy', hops);

  // Временная диагностика для настройки TRUST_PROXY после деплоя.
  if (process.env.LOG_CLIENT_IP === 'true') {
    const logger = new Logger('ClientIp');
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.method === 'POST') {
        logger.log(
          `ip=${req.ip} x-forwarded-for=${String(req.headers['x-forwarded-for'])}`,
        );
      }
      next();
    });
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
