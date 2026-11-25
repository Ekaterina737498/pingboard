import { ForbiddenException } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type JwtPayload } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserModel } from '../auth/user.model';
import { PrismaService } from '../prisma.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => [UserModel])
  users() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Mutation(() => UserModel)
  setUserBlocked(
    @Args('userId') userId: string,
    @Args('isBlocked') isBlocked: boolean,
    @CurrentUser() admin: JwtPayload,
  ) {
    if (userId === admin.sub) {
      throw new ForbiddenException('You cannot block yourself');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked },
    });
  }
}
