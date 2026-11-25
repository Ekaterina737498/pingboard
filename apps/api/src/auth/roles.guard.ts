import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Role } from '../generated/prisma/client';
import type { JwtPayload } from './current-user.decorator';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const user: JwtPayload | undefined =
      GqlExecutionContext.create(context).getContext().req.user;

    if (!user || !required.includes(user.role as Role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
