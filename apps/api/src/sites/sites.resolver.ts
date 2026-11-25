import { UseGuards } from '@nestjs/common';
import { Args, Float, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, type JwtPayload } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { AddSiteInput } from './add-site.input';
import { SiteModel } from './site.model';
import { SitesService } from './sites.service';
import { CheckModel } from './check.model';

@Resolver()
@UseGuards(GqlAuthGuard)
export class SitesResolver {
  constructor(private readonly sitesService: SitesService) {}

  @Query(() => [SiteModel])
  sites(@CurrentUser() user: JwtPayload) {
    return this.sitesService.list(user.sub);
  }

  @Query(() => SiteModel)
  site(@CurrentUser() user: JwtPayload, @Args('id') id: string) {
    return this.sitesService.get(user.sub, id);
  }

  @Query(() => [CheckModel])
  siteChecks(
    @CurrentUser() user: JwtPayload,
    @Args('siteId') siteId: string,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ) {
    return this.sitesService.recentChecks(user.sub, siteId, limit);
  }

  @Query(() => Float, { nullable: true })
  siteUptime(@CurrentUser() user: JwtPayload, @Args('siteId') siteId: string) {
    return this.sitesService.uptime24h(user.sub, siteId);
  }

  @Mutation(() => SiteModel)
  addSite(@CurrentUser() user: JwtPayload, @Args('input') input: AddSiteInput) {
    return this.sitesService.add(user.sub, input);
  }

  @Mutation(() => SiteModel)
  removeSite(@CurrentUser() user: JwtPayload, @Args('id') id: string) {
    return this.sitesService.remove(user.sub, id);
  }
}
