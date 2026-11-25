import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from '../prisma.service';
import { AuthPayload } from './auth-payload.model';
import { AuthService } from './auth.service';
import { CurrentUser, type JwtPayload } from './current-user.decorator';
import { GqlAuthGuard } from './gql-auth.guard';
import { LoginInput } from './login.input';
import { RegisterInput } from './register.input';
import { UserModel } from './user.model';

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
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }

  @Query(() => UserModel)
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.sub } });
  }
}
