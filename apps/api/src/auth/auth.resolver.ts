import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma.service';
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

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Mutation(() => UserModel)
  register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput, @Context() ctx: GqlContext) {
    const { accessToken, refreshToken } = await this.authService.login(input);
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
