import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, type JwtPayload } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { RateLimitService } from '../redis/rate-limit.service';
import { EmailVerificationService } from './email-verification.service';

@Resolver()
export class EmailVerificationResolver {
  constructor(
    private readonly verification: EmailVerificationService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // Вход не нужен: ссылку из письма могут открыть в другом браузере.
  @Mutation(() => Boolean)
  verifyEmail(@Args('token') token: string) {
    return this.verification.confirm(token);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async resendVerificationEmail(@CurrentUser() user: JwtPayload) {
    await this.rateLimit.hit(`rl:verify-email:${user.sub}`, 3, 60 * 60);
    await this.verification.request(user.sub);
    return true;
  }
}
