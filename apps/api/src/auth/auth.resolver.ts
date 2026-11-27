import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { PrismaService } from '../prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { AuthPayload } from './auth-payload.model';
import { AuthService } from './auth.service';
import { CurrentUser, type JwtPayload } from './current-user.decorator';
import { GqlAuthGuard } from './gql-auth.guard';
import { LoginInput } from './login.input';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';
import { RegisterInput } from './register.input';
import { UserModel } from './user.model';

type GqlContext = { req: Request; res: Response };

const LOGIN_WINDOW_SECONDS = 15 * 60;
const REGISTER_WINDOW_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * 60 * 60;

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly verification: EmailVerificationService,
  ) {}

  @Mutation(() => UserModel)
  async register(
    @Args('input') input: RegisterInput,
    @Context() ctx: GqlContext,
  ) {
    const ip = ctx.req.ip ?? 'unknown';
    await this.rateLimit.hit(`rl:register:${ip}`, 5, REGISTER_WINDOW_SECONDS);
    // Общий предел не зависит от IP: каждая регистрация отправляет письмо.
    await this.rateLimit.hit('rl:register-all', 50, DAY_SECONDS);
    const user = await this.authService.register(input);
    await this.verification.request(user.id);
    return user;
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput, @Context() ctx: GqlContext) {
    const ip = ctx.req.ip ?? 'unknown';
    const accountKey = `rl:login:${ip}:${input.email}`;

    await this.rateLimit.hit(`rl:login-ip:${ip}`, 30, LOGIN_WINDOW_SECONDS);
    await this.rateLimit.hit(accountKey, 5, LOGIN_WINDOW_SECONDS);
    // Ограничивает подбор пароля, даже если злоумышленник меняет IP.
    await this.rateLimit.hit(
      `rl:login-account:${input.email}`,
      20,
      LOGIN_WINDOW_SECONDS,
    );

    const { accessToken, refreshToken } = await this.authService.login(input);
    await this.rateLimit.reset(accountKey);
    await this.rateLimit.reset(`rl:login-account:${input.email}`);
    setRefreshCookie(ctx.res, refreshToken);
    return { accessToken };
  }

  @Mutation(() => AuthPayload)
  async refresh(@Context() ctx: GqlContext) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      readRefreshCookie(ctx.req),
    );
    setRefreshCookie(ctx.res, refreshToken);
    return { accessToken };
  }

  @Mutation(() => Boolean)
  async logout(@Context() ctx: GqlContext) {
    await this.authService.logout(readRefreshCookie(ctx.req));
    clearRefreshCookie(ctx.res);
    return true;
  }

  @Query(() => UserModel)
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.sub } });
  }
}
