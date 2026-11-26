import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import type { JwtPayload } from './current-user.decorator';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = GqlExecutionContext.create(context).getContext().req;
    const [type, token] = req.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Токен может быть ещё действителен, а пользователь уже заблокирован.
    // Поэтому статус и роль берём из базы.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, isBlocked: true },
    });
    if (!user || user.isBlocked) {
      throw new UnauthorizedException();
    }

    (req as Request & { user?: JwtPayload }).user = {
      sub: payload.sub,
      role: user.role,
    };
    return true;
  }
}
